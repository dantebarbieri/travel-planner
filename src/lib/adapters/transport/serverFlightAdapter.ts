/**
 * Server-backed flight adapter for client-side use.
 * Calls the server API endpoints which use AeroDataBox.
 * 
 * This adapter is used by the client-side components to search for flights
 * and airlines. All external API calls go through the server to:
 * 1. Protect API keys
 * 2. Enable server-side caching
 * 3. Apply rate limiting
 */

import type { Airline, FlightSearchResult, FlightAdapter } from '$lib/types/travel';

// In-memory cache for client-side (reduces server calls)
const airlineCache = new Map<string, { data: Airline[]; timestamp: number }>();
const flightCache = new Map<string, { data: FlightSearchResult | null; timestamp: number }>();

// Cache TTL: 5 minutes for client-side (server has longer cache)
const CLIENT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if cached data is still valid.
 */
function isCacheValid(timestamp: number): boolean {
	return Date.now() - timestamp < CLIENT_CACHE_TTL;
}

/**
 * Server-backed flight adapter implementation.
 */
export const serverFlightAdapter: FlightAdapter = {
	/**
	 * Search airlines by name or code.
	 * Calls GET /api/flights/airlines?query=...
	 */
	async searchAirlines(query: string): Promise<Airline[]> {
		const normalizedQuery = query.trim().toLowerCase();
		
		if (normalizedQuery.length < 2) {
			return [];
		}

		// Check client-side cache
		const cached = airlineCache.get(normalizedQuery);
		if (cached && isCacheValid(cached.timestamp)) {
			return cached.data;
		}

		try {
			const response = await fetch(
				`/api/flights/airlines?query=${encodeURIComponent(query)}`
			);

			if (!response.ok) {
				console.error('Airline search failed:', response.status);
				return [];
			}

			const data = await response.json();
			const airlines: Airline[] = data.airlines || [];

			// Cache the result
			airlineCache.set(normalizedQuery, { data: airlines, timestamp: Date.now() });

			return airlines;
		} catch (error) {
			console.error('Airline search error:', error);
			return [];
		}
	},

	/**
	 * Get flight details by airline code, flight number, and date.
	 * Calls GET /api/flights/search?airline=...&flight=...&date=...
	 */
	async getFlightDetails(
		airlineCode: string,
		flightNumber: string,
		date: string
	): Promise<FlightSearchResult | null> {
		const cacheKey = `${airlineCode}${flightNumber}:${date}`.toUpperCase();

		// Check client-side cache
		const cached = flightCache.get(cacheKey);
		if (cached && isCacheValid(cached.timestamp)) {
			return cached.data;
		}

		try {
			const params = new URLSearchParams({
				airline: airlineCode,
				flight: flightNumber,
				date: date
			});

			const response = await fetch(`/api/flights/search?${params}`);

			if (!response.ok) {
				if (response.status === 404) {
					// Flight not found - cache the null result
					flightCache.set(cacheKey, { data: null, timestamp: Date.now() });
					return null;
				}
				console.error('Flight search failed:', response.status);
				return null;
			}

			const data = await response.json();

			if (!data.found || !data.flight) {
				flightCache.set(cacheKey, { data: null, timestamp: Date.now() });
				return null;
			}

			const result: FlightSearchResult = data.flight;

			// Cache the result
			flightCache.set(cacheKey, { data: result, timestamp: Date.now() });

			return result;
		} catch (error) {
			console.error('Flight search error:', error);
			return null;
		}
	}
};

/**
 * Clear the client-side cache.
 * Useful when the user wants to force a refresh.
 */
export function clearFlightCache(): void {
	airlineCache.clear();
	flightCache.clear();
}
