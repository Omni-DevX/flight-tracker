import cron from 'node-cron';
import { config } from './config';
import { runAllWatches } from './monitor';
import { notifyStartup } from './telegram';
import { watchlist } from './watchlist';

// ──────────────────────────────────────────────
// Flight Price Monitor — Entry Point
// ──────────────────────────────────────────────

async function main(): Promise<void> {
  const active = watchlist.filter((w) => w.active);

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        ✈️  Flight Price Monitor  ✈️           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();
  console.log(`Active watches:  ${active.length}`);
  console.log(`Cron schedule:   ${config.cronSchedule}`);
  console.log(`Batch size:      ${config.batchSize} date pairs per run`);
  console.log();

  for (const watch of active) {
    console.log(`  • ${watch.id}: ${watch.origin}→${watch.destination} | ` +
      `${watch.departureDateRange.from} to ${watch.departureDateRange.to} | ` +
      `target: $${watch.targetPrice} ${watch.currency}`);
  }
  console.log();

  // Send Telegram confirmation
  try {
    await notifyStartup(active.length);
    console.log('[Telegram] Startup notification sent.\n');
  } catch (err) {
    console.warn('[Telegram] Could not send startup notification:', (err as Error).message);
    console.warn('Check your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env\n');
  }

  // Run once immediately on startup
  console.log('[Scheduler] Running initial check...');
  await runAllWatches(watchlist);

  // Schedule recurring checks
  cron.schedule(config.cronSchedule, async () => {
    await runAllWatches(watchlist);
  });

  console.log(`[Scheduler] Cron job active: "${config.cronSchedule}"`);
  console.log('[Scheduler] Waiting for next scheduled run...\n');
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
