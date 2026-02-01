/**
 * Food Venue Adapter
 *
 * Note: This file is named "fakeAdapter.ts" for historical reasons.
 * It now uses the real Foursquare API exclusively and returns empty results
 * if the API is unavailable.
 */

import type { FoodAdapter, FoodSearchParams, FoodVenue } from '$lib/types/travel';
import { searchFoodVenues as searchFoodVenuesApi } from '$lib/api/placesApi';

/**
 * Food adapter using Foursquare Places API.
 * Returns empty results if API is unavailable.
 */
export const foodAdapter: FoodAdapter = {
	async search(params: FoodSearchParams): Promise<FoodVenue[]> {
		if (!params.location) {
			console.log('[FoodAdapter] No location provided');
			return [];
		}

		try {
			return await searchFoodVenuesApi(params.location, {
				query: params.query,
				limit: params.limit,
				priceLevel: params.priceLevel
			});
		} catch (error) {
			console.warn(`[FoodAdapter] API error:`, error);
			return [];
		}
	},

	async getById(id: string): Promise<FoodVenue | null> {
		// For Foursquare IDs, we could fetch details but usually not needed
		return null;
	},

	async getDetails(venue: FoodVenue): Promise<FoodVenue> {
		return venue;
	}
};

// Keep the old export name for backward compatibility
export const fakeFoodAdapter = foodAdapter;
