/**
 * Lodging Adapter
 *
 * Uses the Foursquare Places API for lodging search (hotels, hostels, etc.).
 * Returns empty results if the API is unavailable or no location is provided.
 *
 * The UI also provides a "Custom Entry" option for users who don't find
 * what they're looking for in the search results.
 */

import type { LodgingAdapter, LodgingSearchParams, Stay } from '$lib/types/travel';
import { searchLodging as searchLodgingApi } from '$lib/api/placesApi';

/**
 * Lodging adapter using Foursquare Places API.
 * Returns empty results if API is unavailable.
 */
export const lodgingAdapter: LodgingAdapter = {
	async search(params: LodgingSearchParams): Promise<Stay[]> {
		// Need a location to search
		if (!params.location) {
			console.log('[LodgingAdapter] No location provided');
			return [];
		}

		// Skip search if coordinates are invalid (0,0)
		if (params.location.geo.latitude === 0 && params.location.geo.longitude === 0) {
			console.log('[LodgingAdapter] Invalid coordinates (0,0), skipping search');
			return [];
		}

		try {
			const stays = await searchLodgingApi(params.location, {
				query: params.query,
				limit: params.limit
			});

			// If check-in/check-out dates provided, add them to results
			if (params.checkIn && params.checkOut) {
				return stays.map(stay => ({
					...stay,
					checkIn: params.checkIn!,
					checkOut: params.checkOut!
				}));
			}

			return stays;
		} catch (error) {
			console.warn('[LodgingAdapter] API error:', error);
			return [];
		}
	},

	async getById(id: string): Promise<Stay | null> {
		// For Foursquare IDs, we could fetch details but usually not needed
		return null;
	},

	async getDetails(stay: Stay): Promise<Stay> {
		return stay;
	}
};
