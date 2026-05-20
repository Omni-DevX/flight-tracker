import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  serpapi: {
    apiKey: requireEnv('SERPAPI_KEY'),
  },
  telegram: {
    botToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    chatId: requireEnv('TELEGRAM_CHAT_ID'),
  },
  cronSchedule: process.env.CRON_SCHEDULE || '0 */3 * * *',
  batchSize: parseInt(process.env.BATCH_SIZE || '3', 10),
};
