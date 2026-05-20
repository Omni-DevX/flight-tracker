import fs from 'fs';
import path from 'path';
import { BatchState } from './types';

// ──────────────────────────────────────────────
// State Persistence
// ──────────────────────────────────────────────
// Stores batch rotation index and price history
// so the monitor remembers where it left off across restarts.

const STATE_FILE = path.resolve(__dirname, '..', 'data', 'state.json');

function ensureDataDir(): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadState(): BatchState {
  ensureDataDir();

  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }

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

export function getWatchState(state: BatchState, watchId: string) {
  if (!state[watchId]) {
    state[watchId] = {
      lastBatchIndex: 0,
      lastChecked: new Date().toISOString(),
      lowestEverPrice: null,
      priceHistory: [],
    };
  }
  return state[watchId];
}

/**
 * Advance the batch index for a watch, wrapping around when
 * all date pairs have been covered.
 */
export function advanceBatch(
  state: BatchState,
  watchId: string,
  totalPairs: number,
  batchSize: number,
): number {
  const ws = getWatchState(state, watchId);
  const currentIndex = ws.lastBatchIndex;

  // Advance for next run
  const nextIndex = currentIndex + batchSize;
  ws.lastBatchIndex = nextIndex >= totalPairs ? 0 : nextIndex;
  ws.lastChecked = new Date().toISOString();

  return currentIndex;
}
