import { eachDayOfInterval, addDays, format } from 'date-fns';
import { config } from './config';
import { searchFlights, rateLimitDelay } from './flights';
import { notifyPriceDrop, notifyNewLow } from './telegram';
import { loadState, saveState, getWatchState, advanceBatch } from './state';
import { FlightWatch, DatePair, FlightResult } from './types';

// ──────────────────────────────────────────────
// Flight Monitor Core
// ──────────────────────────────────────────────

/**
 * Generate all valid departure/return date combinations for a watch.
 */
export function generateDatePairs(watch: FlightWatch): DatePair[] {
  const departureDays = eachDayOfInterval({
    start: new Date(watch.departureDateRange.from + 'T00:00:00'),
    end: new Date(watch.departureDateRange.to + 'T00:00:00'),
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
 * Check a single watch — queries one batch of date pairs.
 */
export async function checkWatch(watch: FlightWatch): Promise<void> {
  console.log(`\n[Monitor] Checking: ${watch.id} (${watch.origin}→${watch.destination})`);

  const allPairs = generateDatePairs(watch);
  console.log(`[Monitor] Total date pairs: ${allPairs.length}`);

  const state = loadState();
  const batchSize = config.batchSize;
  const startIndex = advanceBatch(state, watch.id, allPairs.length, batchSize);
  const batch = allPairs.slice(startIndex, startIndex + batchSize);

  console.log(`[Monitor] Checking batch: indices ${startIndex}–${startIndex + batch.length - 1}`);
  console.log(`[Monitor] API calls this run: ${batch.length}`);

  const results: FlightResult[] = [];

  for (const pair of batch) {
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

        const levelTag = cheapest.priceLevel ? ` [${cheapest.priceLevel}]` : '';
        console.log(
          `  ${pair.out}→${pair.back}: $${cheapest.price} (${cheapest.airline}, ${cheapest.duration})${levelTag}`
        );
      } else {
        console.log(`  ${pair.out}→${pair.back}: No results`);
      }

      await rateLimitDelay();
    } catch (err) {
      console.error(`  ${pair.out}→${pair.back}: Error —`, (err as Error).message);
    }
  }

  // Find hits under target price
  const hits = results
    .filter((r) => r.price <= watch.targetPrice)
    .sort((a, b) => a.price - b.price);

  // Track all-time low
  const ws = getWatchState(state, watch.id);
  const overallCheapest = results.length > 0
    ? results.reduce((min, r) => (r.price < min.price ? r : min))
    : null;

  if (overallCheapest) {
    // Record in price history (keep last 200 entries)
    ws.priceHistory.push({
      date: new Date().toISOString(),
      lowestPrice: overallCheapest.price,
      departureDate: overallCheapest.out,
      returnDate: overallCheapest.back,
      priceLevel: overallCheapest.priceLevel,
    });

    if (ws.priceHistory.length > 200) {
      ws.priceHistory = ws.priceHistory.slice(-200);
    }

    // Check for new all-time low
    if (ws.lowestEverPrice === null || overallCheapest.price < ws.lowestEverPrice) {
      const previousLow = ws.lowestEverPrice;
      ws.lowestEverPrice = overallCheapest.price;

      await notifyNewLow(watch, overallCheapest, previousLow);
    }
  }

  // Notify if there are hits under target price
  if (hits.length > 0) {
    await notifyPriceDrop(watch, hits);
    console.log(`[Monitor] 🔔 ${hits.length} flight(s) under target! Alert sent.`);
  } else {
    const cheapestPrice = overallCheapest ? `$${overallCheapest.price}` : 'N/A';
    console.log(
      `[Monitor] No flights under $${watch.targetPrice} in this batch. Cheapest: ${cheapestPrice}`
    );
  }

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
