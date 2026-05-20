import { runAllWatches } from './monitor';
import { watchlist } from './watchlist';

// ──────────────────────────────────────────────
// Manual one-shot check
// ──────────────────────────────────────────────
// Usage: npm run check
// Runs all watches once without starting the cron scheduler.

async function main(): Promise<void> {
  console.log('[Manual] Running one-time check...\n');
  await runAllWatches(watchlist);
  console.log('[Manual] Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
