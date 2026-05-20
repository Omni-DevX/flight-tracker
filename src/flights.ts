import { config } from './config';
import { SerpApiFlightResult, FlightResult } from './types';

// ──────────────────────────────────────────────
// SerpAPI Google Flights Service
// ──────────────────────────────────────────────
// Uses SerpAPI to scrape Google Flights.
// Free tier: 250 searches/month
// Docs: https://serpapi.com/google-flights-api

const BASE_URL = 'https://serpapi.com/search.json';

/**
 * Search Google Flights for a specific date pair via SerpAPI.
 */
export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
  adults: number = 1,
  currency: string = 'CAD',
): Promise<FlightResult[]> {
  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departureDate,
    return_date: returnDate,
    adults: adults.toString(),
    currency: currency,
    hl: 'en',
    type: '1', // round trip
    api_key: config.serpapi.apiKey,
  });

  const url = `${BASE_URL}?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 429) {
      console.warn('[SerpAPI] Rate limited. Waiting 5s...');
      await sleep(5000);
      return searchFlights(origin, destination, departureDate, returnDate, adults, currency);
    }

    throw new Error(`SerpAPI request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as SerpApiFlightResult;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const allFlights = [
    ...(data.best_flights || []),
    ...(data.other_flights || []),
  ];

  const priceLevel = data.price_insights?.price_level || null;
  const typicalRange = data.price_insights?.typical_price_range || null;

  return allFlights.map((flight) => {
    const firstLeg = flight.flights[0];
    const totalStops = flight.layovers?.length || 0;
    const durationHrs = Math.floor(flight.total_duration / 60);
    const durationMins = flight.total_duration % 60;

    return {
      out: departureDate,
      back: returnDate,
      price: flight.price,
      airline: firstLeg?.airline || 'N/A',
      stops: totalStops,
      currency,
      duration: `${durationHrs}h ${durationMins}m`,
      priceLevel,
      typicalPriceRange: typicalRange,
    };
  });
}

/**
 * Get price insights (lowest price, price level, history) for a route.
 * This data comes for free with every search — no extra API call needed.
 */
export async function getPriceInsights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
  currency: string = 'CAD',
): Promise<SerpApiFlightResult['price_insights'] | null> {
  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departureDate,
    return_date: returnDate,
    currency,
    type: '1',
    api_key: config.serpapi.apiKey,
  });

  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) return null;

  const data = (await response.json()) as SerpApiFlightResult;
  return data.price_insights || null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delay between API calls to stay within rate limits.
 */
export async function rateLimitDelay(): Promise<void> {
  await sleep(1000); // 1s between calls — SerpAPI is more generous than Amadeus
}
