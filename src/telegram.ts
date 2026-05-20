import { config } from './config';
import { FlightWatch, FlightResult } from './types';

// ──────────────────────────────────────────────
// Telegram Notification Service
// ──────────────────────────────────────────────

const BASE_URL = `https://api.telegram.org/bot${config.telegram.botToken}`;

/**
 * Send a raw text message to the configured Telegram chat.
 */
export async function sendMessage(text: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Telegram] Failed to send message:', err);
  }
}

/**
 * Format a price level emoji.
 */
function priceLevelEmoji(level: string | null): string {
  switch (level) {
    case 'low': return '🟢 Low';
    case 'typical': return '🟡 Typical';
    case 'high': return '🔴 High';
    default: return '';
  }
}

/**
 * Send a price-drop alert with the best flight options.
 */
export async function notifyPriceDrop(
  watch: FlightWatch,
  hits: FlightResult[],
): Promise<void> {
  const top5 = hits.slice(0, 5);

  const lines = top5.map((h, i) => {
    const stops = h.stops === 0 ? 'direct' : `${h.stops} stop(s)`;
    const level = h.priceLevel ? ` ${priceLevelEmoji(h.priceLevel)}` : '';
    return `${i + 1}. 🗓 ${h.out} → ${h.back}\n   💰 *$${h.price}* ${h.currency}${level}\n   ✈️ ${h.airline} · ${stops} · ${h.duration}`;
  });

  const message =
    `✈️ *Price Alert!*\n\n` +
    `*${watch.origin} → ${watch.destination}*\n` +
    `Target: under $${watch.targetPrice} ${watch.currency}\n` +
    `Found *${hits.length}* matching flight(s):\n\n` +
    lines.join('\n\n') +
    `\n\n🔗 [Search on Google Flights](https://www.google.com/travel/flights?q=flights+from+${watch.origin}+to+${watch.destination})`;

  await sendMessage(message);
  console.log(`[Telegram] Sent alert for ${watch.origin}→${watch.destination} (${hits.length} hits)`);
}

/**
 * Send a new all-time-low price alert.
 */
export async function notifyNewLow(
  watch: FlightWatch,
  result: FlightResult,
  previousLow: number | null,
): Promise<void> {
  const prevText = previousLow ? `Previous low: $${previousLow}` : 'First recorded price';
  const level = result.priceLevel ? `\nGoogle says: ${priceLevelEmoji(result.priceLevel)}` : '';

  const message =
    `🏆 *New All-Time Low!*\n\n` +
    `*${watch.origin} → ${watch.destination}*\n` +
    `*$${result.price}* ${result.currency} — ${result.airline}\n` +
    `${result.out} → ${result.back} · ${result.duration}\n` +
    `${prevText}${level}`;

  await sendMessage(message);
}

/**
 * Send a startup confirmation.
 */
export async function notifyStartup(watchCount: number): Promise<void> {
  await sendMessage(
    `🟢 *Flight Monitor Started*\n` +
    `Tracking ${watchCount} watch(es)\n` +
    `Schedule: \`${config.cronSchedule}\`\n` +
    `Engine: Google Flights via SerpAPI`
  );
}
