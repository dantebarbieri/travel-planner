/**
 * Client-side places API service.
 * Calls the server's /api/places/* endpoints with client-side caching.
 */

import type { Location, FoodVenue, Activity, ActivityCategory, Stay, PlaceSource } from '$lib/types/travel';
import { clientCache } from './clientCache';

// =============================================================================
// Cache Key Generators
// =============================================================================

function foodCacheKey(lat: number, lon: number, query?: string, source: PlaceSource = 'foursquare'): string {
	// Round to 3 decimal places (~100m precision)
	const roundedLat = Math.round(lat * 1000) / 1000;
	const roundedLon = Math.round(lon * 1000) / 1000;
	const queryPart = query ? `:${query.toLowerCase().trim()}` : '';
	const srcPrefix = source === 'google' ? 'google:' : '';
	return `${srcPrefix}places:food:${roundedLat}:${roundedLon}${queryPart}`;
}

function attractionsCacheKey(lat: number, lon: number, query?: string, source: PlaceSource = 'foursquare'): string {
	// Round to 3 decimal places (~100m precision)
	const roundedLat = Math.round(lat * 1000) / 1000;
	const roundedLon = Math.round(lon * 1000) / 1000;
	const queryPart = query ? `:${query.toLowerCase().trim()}` : '';
	const srcPrefix = source === 'google' ? 'google:' : '';
	return `${srcPrefix}places:attractions:${roundedLat}:${roundedLon}${queryPart}`;
}

function lodgingCacheKey(query: string, lat?: number, lon?: number, near?: string): string {
	const queryPart = query.toLowerCase().trim();
	if (lat !== undefined && lon !== undefined) {
		// Round to 3 decimal places (~100m precision)
		const roundedLat = Math.round(lat * 1000) / 1000;
		const roundedLon = Math.round(lon * 1000) / 1000;
		return `places:lodging:${queryPart}:${roundedLat}:${roundedLon}`;
	}
	if (near) {
		return `places:lodging:${queryPart}:${near.toLowerCase().trim()}`;
	}
	return `places:lodging:${queryPart}`;
}

// =============================================================================
// Food Venues
// =============================================================================

interface FoodSearchResponse {
	venues: FoodVenue[];
}

export interface FoodSearchOptions {
	query?: string;
	limit?: number;
	radius?: number;
	priceLevel?: number[];
	source?: PlaceSource;
}

/**
 * Search for food venues near a location.
 * Location is required for Foursquare, optional for Google Places.
 */
export async function searchFoodVenues(
	location: Location | null,
	options: FoodSearchOptions = {}
): Promise<FoodVenue[]> {
	const latitude = location?.geo.latitude ?? 0;
	const longitude = location?.geo.longitude ?? 0;
	const source = options.source || 'foursquare';
	const cacheKey = foodCacheKey(latitude, longitude, options.query, source);
	const cacheType = source === 'google' ? 'GOOGLE_PLACES_FOOD' : 'PLACES_FOOD';

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({
				limit: (options.limit ?? 20).toString()
			});

			// lat/lon required for Foursquare, optional location bias for Google
			if (location) {
				params.set('lat', latitude.toString());
				params.set('lon', longitude.toString());
			}

			if (options.query) {
				params.set('query', options.query);
			}
			if (options.radius) {
				params.set('radius', options.radius.toString());
			}
			if (options.priceLevel && options.priceLevel.length > 0) {
				params.set('priceLevel', options.priceLevel.join(','));
			}
			if (source !== 'foursquare') {
				params.set('source', source);
			}

			const response = await fetch(`/api/places/food?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Food search failed: ${response.status}`);
			}

			const data: FoodSearchResponse = await response.json();
			return data.venues;
		},
		cacheType
	);
}

// =============================================================================
// Attractions
// =============================================================================

interface AttractionSearchResponse {
	activities: Activity[];
}

export interface AttractionSearchOptions {
	query?: string;
	limit?: number;
	radius?: number;
	categories?: ActivityCategory[];
	source?: PlaceSource;
}

/**
 * Search for attractions near a location.
 * Location is required for Foursquare, optional for Google Places.
 */
export async function searchAttractions(
	location: Location | null,
	options: AttractionSearchOptions = {}
): Promise<Activity[]> {
	const latitude = location?.geo.latitude ?? 0;
	const longitude = location?.geo.longitude ?? 0;
	const source = options.source || 'foursquare';
	const cacheKey = attractionsCacheKey(latitude, longitude, options.query, source);
	const cacheType = source === 'google' ? 'GOOGLE_PLACES_ATTRACTIONS' : 'PLACES_ATTRACTIONS';

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({
				limit: (options.limit ?? 20).toString()
			});

			if (location) {
				params.set('lat', latitude.toString());
				params.set('lon', longitude.toString());
			}

			if (options.query) {
				params.set('query', options.query);
			}
			if (options.radius) {
				params.set('radius', options.radius.toString());
			}
			if (options.categories && options.categories.length > 0) {
				params.set('categories', options.categories.join(','));
			}
			if (source !== 'foursquare') {
				params.set('source', source);
			}

			const response = await fetch(`/api/places/attractions?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Attractions search failed: ${response.status}`);
			}

			const data: AttractionSearchResponse = await response.json();
			return data.activities;
		},
		cacheType
	);
}

// =============================================================================
// Lodging
// =============================================================================

interface LodgingSearchResponse {
	stays: Stay[];
}

export interface LodgingSearchOptions {
	query: string;  // Required for search
	limit?: number;
	radius?: number;
	lat?: number;   // Optional: for location-biased search
	lon?: number;   // Optional: for location-biased search
	near?: string;  // City name for Foursquare "near" parameter
	source?: PlaceSource;
}

/**
 * Search for lodging (hotels, hostels, etc.) by query.
 * Optionally provide lat/lon for location-biased results.
 */
export async function searchLodging(
	options: LodgingSearchOptions
): Promise<Stay[]> {
	if (!options.query) {
		return [];
	}

	const source = options.source || 'foursquare';
	const srcPrefix = source === 'google' ? 'google:' : '';
	const cacheKey = `${srcPrefix}${lodgingCacheKey(options.query, options.lat, options.lon, options.near)}`;
	const cacheType = source === 'google' ? 'GOOGLE_PLACES_FOOD' as const : 'PLACES_LODGING' as const;

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({
				query: options.query,
				limit: (options.limit ?? 20).toString()
			});

			// Optional location bias
			if (options.lat !== undefined && options.lon !== undefined) {
				params.set('lat', options.lat.toString());
				params.set('lon', options.lon.toString());
			}
			if (options.radius) {
				params.set('radius', options.radius.toString());
			}
			if (options.near) {
				params.set('near', options.near);
			}
			if (source !== 'foursquare') {
				params.set('source', source);
			}

			const response = await fetch(`/api/places/lodging?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Lodging search failed: ${response.status}`);
			}

			const data: LodgingSearchResponse = await response.json();
			return data.stays;
		},
		cacheType
	);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clear all places-related caches.
 */
export function clearPlacesCache(): void {
	clientCache.clear();
}

// =============================================================================
// Export
// =============================================================================

export const placesApi = {
	searchFoodVenues,
	searchAttractions,
	searchLodging,
	clearCache: clearPlacesCache
};
