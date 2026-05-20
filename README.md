# ✈️ Flight Price Monitor

A 24/7 flight price monitoring agent that watches for cheap flights across flexible date ranges and sends you Telegram alerts when prices drop below your target. Powered by **Google Flights** data via SerpAPI.

## How It Works

1. You define **watches** — a route, date range, trip length, and target price
2. Every 3 hours (configurable), the agent checks a batch of date combinations via Google Flights
3. Over several runs, it rotates through all date pairs to cover the full range
4. When a flight drops below your target, you get a **Telegram notification** with the best options
5. It tracks **all-time low prices** and alerts you to new records
6. Google's **price insights** ("low" / "typical" / "high") are included in every alert

## Quick Start

### 1. Get API Keys (~5 minutes)

**SerpAPI (Google Flights data):**
1. Sign up at [serpapi.com](https://serpapi.com) (instant, no approval needed)
2. Free tier: 250 searches/month — enough for 1-2 watches
3. $25/mo tier: 1,000 searches — enough for 5+ watches
4. Copy your API key from the dashboard

**Telegram Bot (notifications):**
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token
4. Send any message to your new bot
5. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` to find your `chat_id`

### 2. Install & Configure

```bash
git clone <your-repo-url>
cd flight-monitor
npm install

# Create your .env from the template
cp .env.example .env
# Edit .env with your 3 keys (SERPAPI_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
```

### 3. Add Your Watches

Edit `src/watchlist.ts` — each entry defines what to monitor:

```typescript
{
  id: 'yyz-bcn-summer-2026',     // unique ID
  origin: 'YYZ',                  // from (IATA code)
  destination: 'BCN',             // to (IATA code)
  departureDateRange: {
    from: '2026-07-01',           // earliest departure
    to: '2026-07-31',             // latest departure
  },
  tripDuration: {
    minDays: 7,                   // shortest trip
    maxDays: 14,                  // longest trip
  },
  targetPrice: 700,               // alert if under this
  currency: 'CAD',
  passengers: 1,
  active: true,                   // set false to pause
}
```

### 4. Run

```bash
# Build TypeScript
npm run build

# One-time check (test your setup)
npm run check

# Start 24/7 monitoring
npm start
```

## API Budget Calculator

Each date pair = 1 SerpAPI call. The agent rotates through pairs across runs.

| Tier | Searches/mo | Watches | Batch Size | Schedule | Coverage |
|---|---|---|---|---|---|
| Free ($0) | 250 | 1 | 2 | Every 4h | ~30 pairs/day |
| Starter ($25) | 1,000 | 2-3 | 3 | Every 3h | ~48 pairs/day |
| Developer ($75) | 5,000 | 5+ | 5 | Every 2h | ~120 pairs/day |

A 30-day departure window × 7-14 day trips = **240 date pairs**. At 2 pairs/run, 6 runs/day, you cover all 240 in **20 days** — more than enough since prices don't change that fast.

## Deployment Options

### Option A: Cheap VPS (recommended)

Deploy on a $5/mo server (DigitalOcean, Hetzner, Railway):

```bash
npm run build

# Use pm2 to keep it alive
npm install -g pm2
pm2 start dist/index.js --name flight-monitor
pm2 save
pm2 startup
```

### Option B: GitHub Actions (free)

Create `.github/workflows/check.yml`:

```yaml
name: Check Flights
on:
  schedule:
    - cron: '0 */3 * * *'
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build
      - run: npm run check
        env:
          SERPAPI_KEY: ${{ secrets.SERPAPI_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

Note: GitHub Actions doesn't persist state between runs, so all-time-low tracking won't work. For that, use a VPS or add artifact caching.

### Option C: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

## Project Structure

```
flight-monitor/
├── src/
│   ├── index.ts        # Entry point — starts cron scheduler
│   ├── check-now.ts    # One-shot manual check
│   ├── config.ts       # Loads .env variables
│   ├── types.ts        # TypeScript interfaces
│   ├── watchlist.ts    # ✏️  YOUR WATCHES GO HERE
│   ├── monitor.ts      # Core logic — date pairs, batching, alerts
│   ├── flights.ts      # SerpAPI / Google Flights client
│   ├── state.ts        # Persists batch progress & price history
│   └── telegram.ts     # Telegram notification service
├── data/               # Auto-created — stores state.json
├── .env.example
├── package.json
└── tsconfig.json
```

## Notification Examples

**Price drop alert:**
```
✈️ Price Alert!

YYZ → BCN
Target: under $700 CAD
Found 2 matching flight(s):

1. 🗓 2026-07-14 → 2026-07-22
   💰 $437 CAD 🟢 Low
   ✈️ Air Canada · direct · 8h 30m

2. 🗓 2026-07-17 → 2026-07-25
   💰 $489 CAD 🟡 Typical
   ✈️ WestJet · 1 stop(s) · 11h 15m
```

**New all-time low:**
```
🏆 New All-Time Low!

YYZ → BCN
$437 CAD — Air Canada
2026-07-14 → 2026-07-22 · 8h 30m
Previous low: $512
Google says: 🟢 Low
```

## Tips

- **Start with `npm run check`** to verify your API key and Telegram bot work before deploying.
- **IATA codes:** Find them at [iata.org](https://www.iata.org/en/publications/directories/code-search/) — e.g. YYZ (Toronto), BCN (Barcelona), LHR (London), NRT (Tokyo).
- **Price history** is saved in `data/state.json` — you can plot it or analyze trends.
- **Google's price insights** tell you if the current price is low, typical, or high for the route — this is included in every alert for free.
- **Don't over-poll.** Every 3-4 hours is plenty. Prices change a few times a day, not every minute.
