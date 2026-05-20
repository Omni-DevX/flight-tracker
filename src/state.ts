import fs from 'fs';
import path from 'path';
import { BatchState, WatchState, DatePairRecord, DatePair } from './types';

// ──────────────────────────────────────────────
// State Persistence
// ──────────────────────────────────────────────

const STATE_FILE = path.resolve(__dirname, '..', 'data', 'state.json');

function ensureDataDir(): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadState(): BatchState {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) return {};

  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.warn('[State] Corrupt state file, starting fresh.');
    return {};
  }
}

export function saveState(state: BatchState): void {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function getWatchState(state: BatchState, watchId: string): WatchState {
  if (!state[watchId]) {
    state[watchId] = {
      lastRunAt: new Date().toISOString(),
      lowestEverPrice: null,
      lowestEverDates: null,
      datePairRecords: {},
      coverageComplete: false,
    };
  }
  return state[watchId];
}

/**
 * Build a key for a date pair.
 */
export function pairKey(pair: DatePair): string {
  return `${pair.out}|${pair.back}`;
}

/**
 * Pick the next batch of date pairs to check.
 *
 * Priority order:
 *   1. Never-checked pairs (coverage first)
 *   2. Pairs that previously had low prices (re-verify deals)
 *   3. Oldest-checked pairs (stale data refresh)
 *
 * This ensures every run checks NEW date combinations until
 * the full month is covered, then intelligently re-checks.
 */
export function pickNextBatch(
  ws: WatchState,
  allPairs: DatePair[],
  batchSize: number,
  targetPrice: number,
): DatePair[] {
  const now = Date.now();

  // Categorize pairs
  const unchecked: DatePair[] = [];
  const cheapHits: { pair: DatePair; record: DatePairRecord }[] = [];
  const stale: { pair: DatePair; staleness: number }[] = [];

  for (const pair of allPairs) {
    const key = pairKey(pair);
    const record = ws.datePairRecords[key];

    if (!record || record.checkCount === 0) {
      unchecked.push(pair);
    } else {
      const age = now - new Date(record.lastChecked).getTime();

      // Pairs that were under or near target price — re-check more often
      if (record.lastPrice !== null && record.lastPrice <= targetPrice * 1.15) {
        cheapHits.push({ pair, record });
      }

      stale.push({ pair, staleness: age });
    }
  }

  const batch: DatePair[] = [];

  // 1. Fill with unchecked pairs first (spread across the month)
  //    Shuffle them so we don't always check day 1, 2, 3...
  const shuffledUnchecked = shuffleArray([...unchecked]);
  for (const pair of shuffledUnchecked) {
    if (batch.length >= batchSize) break;
    batch.push(pair);
  }

  // 2. Fill remaining slots with cheap hits (re-verify deals)
  if (batch.length < batchSize) {
    const sortedCheap = cheapHits.sort(
      (a, b) => (a.record.lastPrice ?? Infinity) - (b.record.lastPrice ?? Infinity)
    );
    for (const { pair } of sortedCheap) {
      if (batch.length >= batchSize) break;
      if (!batch.some((b) => pairKey(b) === pairKey(pair))) {
        batch.push(pair);
      }
    }
  }

  // 3. Fill remaining with stalest data (oldest checked first)
  if (batch.length < batchSize) {
    const sortedStale = stale.sort((a, b) => b.staleness - a.staleness);
    for (const { pair } of sortedStale) {
      if (batch.length >= batchSize) break;
      if (!batch.some((b) => pairKey(b) === pairKey(pair))) {
        batch.push(pair);
      }
    }
  }

  // Update coverage flag
  ws.coverageComplete = unchecked.length <= batch.filter((b) =>
    unchecked.some((u) => pairKey(u) === pairKey(b))
  ).length;

  return batch;
}

/**
 * Record the result of checking a date pair.
 */
export function recordResult(
  ws: WatchState,
  pair: DatePair,
  price: number | null,
  airline: string | null,
  priceLevel: string | null,
): void {
  const key = pairKey(pair);
  const existing = ws.datePairRecords[key];

  ws.datePairRecords[key] = {
    out: pair.out,
    back: pair.back,
    lastChecked: new Date().toISOString(),
    lastPrice: price,
    lowestPrice: price !== null
      ? Math.min(price, existing?.lowestPrice ?? Infinity)
      : (existing?.lowestPrice ?? null),
    airline,
    priceLevel,
    checkCount: (existing?.checkCount ?? 0) + 1,
  };
}

/**
 * Get coverage stats for logging.
 */
export function getCoverageStats(ws: WatchState, totalPairs: number) {
  const records = Object.values(ws.datePairRecords);
  const checked = records.filter((r) => r.checkCount > 0).length;
  const withPrice = records.filter((r) => r.lastPrice !== null);
  const cheapest = withPrice.length > 0
    ? withPrice.reduce((min, r) => (r.lastPrice! < min.lastPrice! ? r : min))
    : null;

  return {
    total: totalPairs,
    checked,
    remaining: totalPairs - checked,
    percentComplete: Math.round((checked / totalPairs) * 100),
    cheapest: cheapest
      ? { price: cheapest.lastPrice, out: cheapest.out, back: cheapest.back, airline: cheapest.airline }
      : null,
  };
}

/**
 * Get the top N cheapest date pairs found so far.
 */
export function getCheapestPairs(ws: WatchState, n: number = 5) {
  return Object.values(ws.datePairRecords)
    .filter((r) => r.lastPrice !== null)
    .sort((a, b) => a.lastPrice! - b.lastPrice!)
    .slice(0, n);
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
