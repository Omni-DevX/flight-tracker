import { FlightWatch } from './types';

// ──────────────────────────────────────────────
// Your Flight Watchlist
// ──────────────────────────────────────────────
// Airports within 2-3 hours of central Tokyo:
//   NRT — Narita International (Tokyo) ........... ~1hr to city center
//   HND — Haneda (Tokyo) ......................... ~30min to city center
//   KIX — Kansai International (Osaka) ........... ~2.5hrs by shinkansen
//   NGO — Chubu Centrair (Nagoya) ................ ~1.5hrs by shinkansen
//
// Typical YYZ→Japan round-trip prices:
//   Peak (July/Aug): $1,100–$1,600 CAD
//   Shoulder (Oct):  $800–$1,300 CAD
//   Deals:           $700–$900 CAD
// ──────────────────────────────────────────────

export const watchlist: FlightWatch[] = [

  // ═══════════════════════════════════════
  //  JULY — Peak season, cherry-free but
  //  great weather, festivals, Mt. Fuji
  // ═══════════════════════════════════════

  {
    id: 'yyz-nrt-july',
    origin: 'YYZ',
    destination: 'NRT',
    departureDateRange: { from: '2026-07-01', to: '2026-07-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 1100,
    currency: 'CAD',
    passengers: 1,
    active: false,
  },

  {
    id: 'yyz-hnd-july',
    origin: 'YYZ',
    destination: 'HND',
    departureDateRange: { from: '2026-07-01', to: '2026-07-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 1100,
    currency: 'CAD',
    passengers: 1,
    active: false,
  },

  {
    id: 'yyz-kix-july',
    origin: 'YYZ',
    destination: 'KIX',
    departureDateRange: { from: '2026-07-01', to: '2026-07-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 1050,
    currency: 'CAD',
    passengers: 1,
    active: false,
  },

  {
    id: 'yyz-ngo-july',
    origin: 'YYZ',
    destination: 'NGO',
    departureDateRange: { from: '2026-07-01', to: '2026-07-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 1050,
    currency: 'CAD',
    passengers: 1,
    active: false,
  },

  // ═══════════════════════════════════════
  //  OCTOBER — Shoulder season, fall foliage,
  //  cooler weather, generally cheaper flights
  // ═══════════════════════════════════════

  {
    id: 'yyz-nrt-october',
    origin: 'YYZ',
    destination: 'NRT',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 950,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },

  {
    id: 'yyz-hnd-october',
    origin: 'YYZ',
    destination: 'HND',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 950,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },

  {
    id: 'yyz-kix-october',
    origin: 'YYZ',
    destination: 'KIX',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 900,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },

  {
    id: 'yyz-ngo-october',
    origin: 'YYZ',
    destination: 'NGO',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 900,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },

  // ═══════════════════════════════════════
  //  HAMILTON (YHM) — ~45min from Toronto
  //  Smaller airport, different carriers,
  //  may route via US hubs for cheaper fares
  // ═══════════════════════════════════════

  {
    id: 'yhm-nrt-october',
    origin: 'YHM',
    destination: 'NRT',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 950,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },

  {
    id: 'yhm-hnd-october',
    origin: 'YHM',
    destination: 'HND',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 950,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },

  {
    id: 'yhm-kix-october',
    origin: 'YHM',
    destination: 'KIX',
    departureDateRange: { from: '2026-10-01', to: '2026-10-31' },
    tripDuration: { minDays: 10, maxDays: 14 },
    targetPrice: 900,
    currency: 'CAD',
    passengers: 1,
    active: true,
  },
];
