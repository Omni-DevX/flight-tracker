// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DateRange {
  from: string; // "YYYY-MM-DD"
  to: string;
}

export interface TripDuration {
  minDays: number;
  maxDays: number;
}

export interface FlightWatch {
  id: string;
  origin: string;
  destination: string;
  departureDateRange: DateRange;
  tripDuration: TripDuration;
  targetPrice: number;
  currency: string;
  passengers: number;
  active: boolean;
}

export interface DatePair {
  out: string;
  back: string;
}

export interface FlightResult {
  out: string;
  back: string;
  price: number;
  airline: string;
  stops: number;
  currency: string;
  duration: string;
  priceLevel: string | null;
  typicalPriceRange: [number, number] | null;
}

// ── State tracking per date pair ──

export interface DatePairRecord {
  out: string;
  back: string;
  lastChecked: string;       // ISO timestamp
  lastPrice: number | null;
  lowestPrice: number | null;
  airline: string | null;
  priceLevel: string | null;
  checkCount: number;
}

export interface WatchState {
  lastRunAt: string;
  lowestEverPrice: number | null;
  lowestEverDates: { out: string; back: string } | null;
  datePairRecords: Record<string, DatePairRecord>;  // key = "out|back"
  coverageComplete: boolean;  // true once all pairs checked at least once
}

export interface BatchState {
  [watchId: string]: WatchState;
}

export interface PriceDropAlert {
  result: FlightResult;
  previousPrice: number;
  dropPercent: number;
}

// ── SerpAPI response shapes ──

export interface SerpApiFlightResult {
  best_flights?: SerpApiFlight[];
  other_flights?: SerpApiFlight[];
  price_insights?: {
    lowest_price: number;
    price_level: string;
    typical_price_range: [number, number];
    price_history?: [number, number][];
  };
  search_metadata?: {
    status: string;
    total_time_taken: number;
  };
  error?: string;
}

export interface SerpApiFlight {
  flights: Array<{
    airline: string;
    airline_logo: string;
    departure_airport: { name: string; id: string; time: string };
    arrival_airport: { name: string; id: string; time: string };
    duration: number;
    travel_class: string;
  }>;
  total_duration: number;
  price: number;
  type: string;
  layovers?: Array<{ name: string; duration: number }>;
}
