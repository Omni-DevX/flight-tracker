import { config } from './config';
import { FlightWatch, FlightResult, DatePairRecord, PriceDropAlert } from './types';

// ──────────────────────────────────────────────
// Telegram Notification Service
// ──────────────────────────────────────────────

const BASE_URL = `https://api.telegram.org/bot${config.telegram.botToken}`;

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
    throw new Error(`[Telegram] Failed to send message: ${err}`);
  }
}

function priceLevelEmoji(level: string | null): string {
  switch (level) {
    case 'low': return '🟢 Low';
    case 'typical': return '🟡 Typical';
    case 'high': return '🔴 High';
    default: return '';
  }
}

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
 * Send a summary when full month coverage is complete.
 * This is the "here's the cheapest period" notification.
 */
export async function notifyCoverageComplete(
  watch: FlightWatch,
  cheapestPairs: DatePairRecord[],
): Promise<void> {
  if (cheapestPairs.length === 0) return;

  const lines = cheapestPairs.map((r, i) => {
    const level = r.priceLevel ? ` ${priceLevelEmoji(r.priceLevel)}` : '';
    return `${i + 1}. 🗓 ${r.out} → ${r.back}\n   💰 *$${r.lastPrice}* ${watch.currency}${level}\n   ✈️ ${r.airline || 'N/A'}`;
  });

  const message =
    `📊 *Full Month Scanned!*\n\n` +
    `*${watch.origin} → ${watch.destination}*\n` +
    `Every date combination has been checked.\n\n` +
    `*🏆 Top 5 Cheapest Periods:*\n\n` +
    lines.join('\n\n') +
    `\n\n_The monitor will keep re-checking these dates for further drops._` +
    `\n\n🔗 [Search on Google Flights](https://www.google.com/travel/flights?q=flights+from+${watch.origin}+to+${watch.destination})`;

  await sendMessage(message);
}

export async function notifyRelativeDrop(
  watch: FlightWatch,
  alerts: PriceDropAlert[],
): Promise<void> {
  const lines = alerts.slice(0, 5).map((a, i) => {
    const stops = a.result.stops === 0 ? 'direct' : `${a.result.stops} stop(s)`;
    const level = a.result.priceLevel ? ` ${priceLevelEmoji(a.result.priceLevel)}` : '';
    return (
      `${i + 1}. 🗓 ${a.result.out} → ${a.result.back}\n` +
      `   💰 *$${a.result.price}* ${a.result.currency} _(was $${a.previousPrice}, −${a.dropPercent}%)_${level}\n` +
      `   ✈️ ${a.result.airline} · ${stops} · ${a.result.duration}`
    );
  });

  const message =
    `📉 *Price Just Dropped!*\n\n` +
    `*${watch.origin} → ${watch.destination}*\n` +
    `${alerts.length} date pair(s) fell ≥8% since last check:\n\n` +
    lines.join('\n\n') +
    `\n\n🔗 [Search on Google Flights](https://www.google.com/travel/flights?q=flights+from+${watch.origin}+to+${watch.destination})`;

  await sendMessage(message);
  console.log(`[Telegram] Relative drop alert sent for ${watch.origin}→${watch.destination}`);
}

export async function notifyStatusUpdate(
  watch: FlightWatch,
  cheapestPrice: number | null,
  cheapestResult: FlightResult | null,
): Promise<void> {
  const priceText = cheapestPrice !== null && cheapestResult
    ? `*$${cheapestPrice}* ${watch.currency} (${cheapestResult.airline}, ${cheapestResult.out}→${cheapestResult.back})`
    : 'No results';

  const level = cheapestResult?.priceLevel ? `\nGoogle says: ${priceLevelEmoji(cheapestResult.priceLevel)}` : '';

  const message =
    `📋 *Check Complete — No Deal Yet*\n\n` +
    `*${watch.origin} → ${watch.destination}*\n` +
    `Target: under $${watch.targetPrice} ${watch.currency}\n` +
    `Cheapest found: ${priceText}${level}`;

  await sendMessage(message);
}

export async function notifyStartup(watchCount: number): Promise<void> {
  await sendMessage(
    `🟢 *Flight Monitor Started*\n` +
    `Tracking ${watchCount} watch(es)\n` +
    `Schedule: \`${config.cronSchedule}\`\n` +
    `Engine: Google Flights via SerpAPI`
  );
}
