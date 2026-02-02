/**
 * Lodging Adapter
 *
 * Uses the Foursquare Places API for lodging search (hotels, hostels, etc.).
 * Query is required. Location is optional for location-biased results.
 *
 * The UI also provides a "Custom Entry" option for users who don't find
 * what they're looking for in the search results.
 */

import type { LodgingAdapter, LodgingSearchParams, Stay } from '$lib/types/travel';
import { searchLodging as searchLodgingApi } from '$lib/api/placesApi';

/**
 * Lodging adapter using Foursquare Places API.
 * Searches globally by query, with optional location bias.
 */
export const lodgingAdapter: LodgingAdapter = {
	async search(params: LodgingSearchParams): Promise<Stay[]> {
		// Need a query to search
		if (!params.query) {
			return [];
		}

		try {
			// Get optional location for biased results
			const lat = params.location?.geo.latitude;
			const lon = params.location?.geo.longitude;

			// Skip location bias if coordinates are invalid (0,0)
			const useLocation = lat && lon && !(lat === 0 && lon === 0);

			const stays = await searchLodgingApi({
				query: params.query,
				limit: params.limit,
				lat: useLocation ? lat : undefined,
				lon: useLocation ? lon : undefined
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
