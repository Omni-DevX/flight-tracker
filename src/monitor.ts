import { eachDayOfInterval, addDays, format, isBefore, startOfDay } from 'date-fns';
import { config } from './config';
import { searchFlights, rateLimitDelay } from './flights';
import { notifyPriceDrop, notifyNewLow, notifyCoverageComplete, notifyStatusUpdate } from './telegram';
import {
  loadState, saveState, getWatchState,
  pickNextBatch, recordResult, getCoverageStats, getCheapestPairs, pairKey,
} from './state';
import { FlightWatch, DatePair, FlightResult } from './types';

// ──────────────────────────────────────────────
// Flight Monitor Core
// ──────────────────────────────────────────────

/**
 * Generate all VALID date pairs for a watch.
 * Automatically filters out departure dates that have already passed.
 */
export function generateDatePairs(watch: FlightWatch): DatePair[] {
  const today = startOfDay(new Date());
  const rangeStart = new Date(watch.departureDateRange.from + 'T00:00:00');
  const rangeEnd = new Date(watch.departureDateRange.to + 'T00:00:00');

  // Skip if the entire range is in the past
  if (isBefore(rangeEnd, today)) return [];

  // Start from today if range start is in the past
  const effectiveStart = isBefore(rangeStart, today) ? today : rangeStart;

  const departureDays = eachDayOfInterval({
    start: effectiveStart,
    end: rangeEnd,
  });

  const pairs: DatePair[] = [];

  for (const dep of departureDays) {
    for (let d = watch.tripDuration.minDays; d <= watch.tripDuration.maxDays; d++) {
      pairs.push({
        out: format(dep, 'yyyy-MM-dd'),
        back: format(addDays(dep, d), 'yyyy-MM-dd'),
      });
    }
  }

  return pairs;
}

/**
 * Check a single watch — dynamically picks the best date pairs to check.
 */
export async function checkWatch(watch: FlightWatch): Promise<void> {
  console.log(`\n[Monitor] ── ${watch.id} (${watch.origin}→${watch.destination}) ──`);

  const allPairs = generateDatePairs(watch);

  if (allPairs.length === 0) {
    console.log(`[Monitor] ⚠️  All dates in the past — skipping.`);
    return;
  }

  const state = loadState();
  const ws = getWatchState(state, watch.id);
  const batchSize = config.batchSize;

  // Smart batch selection: unchecked first → cheap re-checks → stale refresh
  const batch = pickNextBatch(ws, allPairs, batchSize, watch.targetPrice);

  const stats = getCoverageStats(ws, allPairs.length);
  console.log(`[Monitor] Coverage: ${stats.checked}/${stats.total} pairs checked (${stats.percentComplete}%)`);
  console.log(`[Monitor] This run: checking ${batch.length} pair(s)`);

  if (stats.cheapest) {
    console.log(`[Monitor] Best so far: $${stats.cheapest.price} on ${stats.cheapest.out}→${stats.cheapest.back} (${stats.cheapest.airline})`);
  }

  const results: FlightResult[] = [];

  for (const pair of batch) {
    const isNew = !ws.datePairRecords[pairKey(pair)] || ws.datePairRecords[pairKey(pair)].checkCount === 0;
    const tag = isNew ? '🆕' : '🔄';

    try {
      const flights = await searchFlights(
        watch.origin,
        watch.destination,
        pair.out,
        pair.back,
        watch.passengers,
        watch.currency,
      );

      if (flights.length > 0) {
        const cheapest = flights.reduce((min, f) => (f.price < min.price ? f : min));
        results.push(cheapest);

        // Record in state
        recordResult(ws, pair, cheapest.price, cheapest.airline, cheapest.priceLevel);

        const levelTag = cheapest.priceLevel ? ` [${cheapest.priceLevel}]` : '';
        console.log(
          `  ${tag} ${pair.out}→${pair.back}: $${cheapest.price} (${cheapest.airline}, ${cheapest.duration})${levelTag}`
        );
      } else {
        recordResult(ws, pair, null, null, null);
        console.log(`  ${tag} ${pair.out}→${pair.back}: No results`);
      }

      await rateLimitDelay();
    } catch (err) {
      console.error(`  ${tag} ${pair.out}→${pair.back}: Error —`, (err as Error).message);
    }
  }

  // Check for hits under target
  const hits = results
    .filter((r) => r.price <= watch.targetPrice)
    .sort((a, b) => a.price - b.price);

  // Track all-time low
  const overallCheapest = results.length > 0
    ? results.reduce((min, r) => (r.price < min.price ? r : min))
    : null;

  if (overallCheapest) {
    if (ws.lowestEverPrice === null || overallCheapest.price < ws.lowestEverPrice) {
      const previousLow = ws.lowestEverPrice;
      ws.lowestEverPrice = overallCheapest.price;
      ws.lowestEverDates = { out: overallCheapest.out, back: overallCheapest.back };

      try {
        await notifyNewLow(watch, overallCheapest, previousLow);
      } catch (err) {
        console.error(`[Telegram] notifyNewLow failed:`, (err as Error).message);
      }
    }
  }

  // Notify price drops
  if (hits.length > 0) {
    try {
      await notifyPriceDrop(watch, hits);
      console.log(`[Monitor] 🔔 ${hits.length} flight(s) under target! Alert sent.`);
    } catch (err) {
      console.error(`[Telegram] notifyPriceDrop failed:`, (err as Error).message);
    }
  } else {
    const cheapestPrice = overallCheapest ? `$${overallCheapest.price}` : 'N/A';
    console.log(`[Monitor] No flights under $${watch.targetPrice} in this batch. Cheapest: ${cheapestPrice}`);
    try {
      await notifyStatusUpdate(watch, overallCheapest?.price ?? null, overallCheapest);
      console.log(`[Telegram] Status update sent.`);
    } catch (err) {
      console.error(`[Telegram] notifyStatusUpdate failed:`, (err as Error).message);
    }
  }

  // Check if we just completed full coverage
  const newStats = getCoverageStats(ws, allPairs.length);
  if (newStats.percentComplete === 100 && !ws.coverageComplete) {
    ws.coverageComplete = true;
    const topCheap = getCheapestPairs(ws, 5);
    try {
      await notifyCoverageComplete(watch, topCheap);
      console.log(`[Monitor] ✅ Full month coverage complete! Sent summary.`);
    } catch (err) {
      console.error(`[Telegram] notifyCoverageComplete failed:`, (err as Error).message);
    }
  }

  ws.lastRunAt = new Date().toISOString();
  saveState(state);
}

/**
 * Run all active watches.
 */
export async function runAllWatches(watches: FlightWatch[]): Promise<void> {
  const active = watches.filter((w) => w.active);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`[Monitor] Starting run — ${active.length} active watch(es)`);
  console.log(`[Monitor] Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));

  for (const watch of active) {
    try {
      await checkWatch(watch);
    } catch (err) {
      console.error(`[Monitor] Error checking ${watch.id}:`, (err as Error).message);
    }
  }

  console.log(`\n[Monitor] Run complete.\n`);
}
