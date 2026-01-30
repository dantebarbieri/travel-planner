/**
 * Client-side flight API service.
 * Calls the server's /api/flights/* endpoints with client-side caching.
 */

import type { Airline, FlightSearchResult } from '$lib/types/travel';
import { clientCache } from './clientCache';

/**
 * Generate a cache key for flight routes.
 */
function flightCacheKey(airlineCode: string, flightNumber: string): string {
	return `flight:${airlineCode.toUpperCase()}${flightNumber}`;
}

/**
 * Generate a cache key for airline searches.
 */
function airlineCacheKey(query: string): string {
	return `airline:${query.toUpperCase()}`;
}

export interface FlightSearchResponse {
	found: boolean;
	flight?: FlightSearchResult;
	message?: string;
}

/**
 * Search for a flight by airline code and flight number.
 */
export async function searchFlight(
	airlineCode: string,
	flightNumber: string,
	date: string
): Promise<FlightSearchResult | null> {
	const cacheKey = flightCacheKey(airlineCode, flightNumber);

	// Check cache (route doesn't change, just update date)
	const cached = clientCache.get<FlightSearchResult>(cacheKey);
	if (cached) {
		return { ...cached, departureDate: date };
	}

	const params = new URLSearchParams({
		airline: airlineCode,
		flight: flightNumber,
		date
	});

	const response = await fetch(`/api/flights/search?${params}`);

	if (!response.ok) {
		if (response.status === 429) {
			throw new Error('Rate limit exceeded. Please try again later.');
		}
		if (response.status === 404) {
			return null;
		}
		throw new Error(`Flight search error: ${response.status}`);
	}

	const data: FlightSearchResponse = await response.json();

	if (!data.found || !data.flight) {
		return null;
	}

	// Cache the route (it's the same for any date)
	clientCache.set(cacheKey, data.flight, 'FLIGHT_ROUTE');

	return data.flight;
}

export interface AirlineSearchResponse {
	airlines: Airline[];
}

/**
 * Search for airlines by code or name.
 */
export async function searchAirlines(query: string): Promise<Airline[]> {
	if (query.length < 2) return [];

	const cacheKey = airlineCacheKey(query);

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({ query });
			const response = await fetch(`/api/flights/airlines?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Airline search error: ${response.status}`);
			}

			const data: AirlineSearchResponse = await response.json();
			return data.airlines;
		},
		'AIRLINE_SEARCH'
	);
}

/**
 * Clear flight-related cache.
 */
export function clearFlightCache(): void {
	clientCache.clear();
}

// Export as a flight API object
export const flightApi = {
	searchFlight,
	searchAirlines,
	clearCache: clearFlightCache
};
