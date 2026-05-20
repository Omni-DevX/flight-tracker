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
  origin: string;       // IATA code, e.g. "YYZ"
  destination: string;  // IATA code, e.g. "BCN"
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
  priceLevel: string | null;   // "low" | "typical" | "high" from Google
  typicalPriceRange: [number, number] | null;
}

export interface BatchState {
  [watchId: string]: {
    lastBatchIndex: number;
    lastChecked: string;
    lowestEverPrice: number | null;
    priceHistory: PriceEntry[];
  };
}

export interface PriceEntry {
  date: string;
  lowestPrice: number;
  departureDate: string;
  returnDate: string;
  priceLevel: string | null;
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
