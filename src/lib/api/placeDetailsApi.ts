/**
 * Client-side place details API service.
 * Calls the server's /api/places/details endpoint with client-side caching.
 */

import type { OperatingHours, PlaceTag, FoodTag } from '$lib/types/travel';
import { clientCache } from './clientCache';

// =============================================================================
// Types
// =============================================================================

export interface PlaceDetails {
	placeId: string;
	name: string;
	address?: string;
	location?: {
		latitude: number;
		longitude: number;
	};
	openingHours?: OperatingHours;
	priceLevel?: 1 | 2 | 3 | 4;
	rating?: number;
	reviewCount?: number;
	website?: string;
	phone?: string;
	googleMapsUrl?: string;
	placeTags?: PlaceTag[];
	foodTags?: FoodTag[];
	isOpenNow?: boolean;
	source: 'google' | 'foursquare';
}

interface PlaceDetailsResponse {
	details: PlaceDetails | null;
	message?: string;
}

// =============================================================================
// Cache Key Generators
// =============================================================================

function placeDetailsCacheKey(
	googlePlaceId?: string,
	foursquarePlaceId?: string,
	name?: string,
	lat?: number,
	lon?: number
): string {
	if (googlePlaceId) {
		return `place-details:google:${googlePlaceId}`;
	}
	if (foursquarePlaceId) {
		return `place-details:fsq:${foursquarePlaceId}`;
	}
	if (name && lat !== undefined && lon !== undefined) {
		// Round to 3 decimal places (~100m precision)
		const roundedLat = Math.round(lat * 1000) / 1000;
		const roundedLon = Math.round(lon * 1000) / 1000;
		return `place-details:name:${name.toLowerCase().trim()}:${roundedLat}:${roundedLon}`;
	}
	return `place-details:unknown:${Date.now()}`;
}

// =============================================================================
// API Functions
// =============================================================================

export interface FetchPlaceDetailsOptions {
	/** Google Place ID (preferred) */
	googlePlaceId?: string;
	/** Foursquare Place ID (for fallback) */
	foursquarePlaceId?: string;
	/** Place name (for search-based lookup) */
	name?: string;
	/** Latitude (for search-based lookup) */
	lat?: number;
	/** Longitude (for search-based lookup) */
	lon?: number;
}

/**
 * Fetch detailed information about a place.
 * Tries Google Places first, then falls back to Foursquare.
 */
export async function fetchPlaceDetails(
	options: FetchPlaceDetailsOptions
): Promise<PlaceDetails | null> {
	const { googlePlaceId, foursquarePlaceId, name, lat, lon } = options;

	// Need at least one identifier
	if (!googlePlaceId && !foursquarePlaceId && !name) {
		console.warn('[PlaceDetailsApi] No identifier provided');
		return null;
	}

	const cacheKey = placeDetailsCacheKey(googlePlaceId, foursquarePlaceId, name, lat, lon);

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams();

			if (googlePlaceId) {
				params.set('googlePlaceId', googlePlaceId);
			}
			if (foursquarePlaceId) {
				params.set('foursquarePlaceId', foursquarePlaceId);
			}
			if (name) {
				params.set('name', name);
			}
			if (lat !== undefined) {
				params.set('lat', lat.toString());
			}
			if (lon !== undefined) {
				params.set('lon', lon.toString());
			}

			const response = await fetch(`/api/places/details?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				throw new Error(`Place details fetch failed: ${response.status}`);
			}

			const data: PlaceDetailsResponse = await response.json();
			return data.details;
		},
		'PLACE_DETAILS'
	);
}

/**
 * Fetch place details using a Foursquare ID (extracted from our activity/food IDs).
 */
export async function fetchPlaceDetailsByFoursquareId(
	foursquareId: string
): Promise<PlaceDetails | null> {
	return fetchPlaceDetails({ foursquarePlaceId: foursquareId });
}

/**
 * Fetch place details by searching for a place by name and location.
 * Use this when you don't have a place ID but know the name and coordinates.
 */
export async function fetchPlaceDetailsByNameAndLocation(
	name: string,
	lat: number,
	lon: number
): Promise<PlaceDetails | null> {
	return fetchPlaceDetails({ name, lat, lon });
}

// =============================================================================
// Export
// =============================================================================

export const placeDetailsApi = {
	fetchPlaceDetails,
	fetchPlaceDetailsByFoursquareId,
	fetchPlaceDetailsByNameAndLocation
};
