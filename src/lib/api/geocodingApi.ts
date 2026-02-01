/**
 * Client-side geocoding and city search API service.
 * Calls the server's /api/geocoding and /api/cities endpoints with client-side caching.
 */

import type { GeoLocation, Location } from '$lib/types/travel';
import { clientCache } from './clientCache';

// =============================================================================
// Types
// =============================================================================

export interface CitySearchResult {
	id: string;
	name: string;
	country: string;
	location: GeoLocation;
	timezone: string;
	population?: number;
}

export interface GeocodingResult {
	location: Location;
	confidence: number;
}

// =============================================================================
// Cache Key Generators
// =============================================================================

function cityCacheKey(query: string, limit: number): string {
	return `city:${query.toLowerCase().trim()}:${limit}`;
}

function geocodeCacheKey(address: string): string {
	return `geocode:${address.toLowerCase().trim()}`;
}

function reverseGeocodeCacheKey(lat: number, lon: number): string {
	// Round to 5 decimal places (~1m precision)
	const roundedLat = Math.round(lat * 100000) / 100000;
	const roundedLon = Math.round(lon * 100000) / 100000;
	return `reverse-geocode:${roundedLat}:${roundedLon}`;
}

// =============================================================================
// City Search
// =============================================================================

interface CitySearchResponse {
	results: CitySearchResult[];
}

/**
 * Search for cities by name.
 * Returns an array of matching cities with location and timezone data.
 */
export async function searchCities(query: string, limit = 10): Promise<CitySearchResult[]> {
	if (!query || query.length < 2) {
		return [];
	}

	const cacheKey = cityCacheKey(query, limit);

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({
				q: query,
				limit: limit.toString()
			});

			const response = await fetch(`/api/cities?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`City search failed: ${response.status}`);
			}

			const data: CitySearchResponse = await response.json();
			return data.results;
		},
		'CITY_SEARCH'
	);
}

// =============================================================================
// Forward Geocoding
// =============================================================================

interface GeocodeResponse {
	result: GeocodingResult | null;
	message?: string;
}

/**
 * Convert an address string to coordinates and location data.
 * Returns null if no results found.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
	if (!address || address.length < 3) {
		return null;
	}

	const cacheKey = geocodeCacheKey(address);

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({ address });

			const response = await fetch(`/api/geocoding?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Geocoding failed: ${response.status}`);
			}

			const data: GeocodeResponse = await response.json();
			return data.result;
		},
		'GEOCODING'
	);
}

// =============================================================================
// Reverse Geocoding
// =============================================================================

interface ReverseGeocodeResponse {
	location: Location | null;
	message?: string;
}

/**
 * Convert coordinates to an address/location.
 * Returns null if no results found.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<Location | null> {
	const cacheKey = reverseGeocodeCacheKey(lat, lon);

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({
				lat: lat.toString(),
				lon: lon.toString()
			});

			const response = await fetch(`/api/geocoding?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Reverse geocoding failed: ${response.status}`);
			}

			const data: ReverseGeocodeResponse = await response.json();
			return data.location;
		},
		'GEOCODING'
	);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clear all geocoding-related caches.
 */
export function clearGeocodingCache(): void {
	// Note: This clears the entire client cache, not just geocoding.
	// For selective clearing, we'd need to add prefix-based clearing to clientCache.
	clientCache.clear();
}

/**
 * Create a Location object from a city search result.
 * Useful when adding a city to a trip.
 */
export function cityResultToLocation(city: CitySearchResult): Location {
	return {
		name: city.name,
		address: {
			street: '',
			city: city.name,
			country: city.country,
			formatted: `${city.name}, ${city.country}`
		},
		geo: city.location,
		timezone: city.timezone
	};
}

// =============================================================================
// Export
// =============================================================================

export const geocodingApi = {
	searchCities,
	geocodeAddress,
	reverseGeocode,
	cityResultToLocation,
	clearCache: clearGeocodingCache
};
