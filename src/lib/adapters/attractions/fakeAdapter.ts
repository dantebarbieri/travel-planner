/**
 * Attractions Adapter
 *
 * Note: This file is named "fakeAdapter.ts" for historical reasons.
 * It now uses the real Foursquare API exclusively and returns empty results
 * if the API is unavailable.
 */

import type { AttractionAdapter, ActivitySearchParams, Activity } from '$lib/types/travel';
import { searchAttractions as searchAttractionsApi } from '$lib/api/placesApi';

/**
 * Attraction adapter using Foursquare Places API.
 * Returns empty results if API is unavailable.
 */
export const attractionAdapter: AttractionAdapter = {
	async search(params: ActivitySearchParams): Promise<Activity[]> {
		if (!params.location) {
			console.log('[AttractionAdapter] No location provided');
			return [];
		}

		try {
			return await searchAttractionsApi(params.location, {
				query: params.query,
				limit: params.limit,
				categories: params.categories
			});
		} catch (error) {
			console.warn(`[AttractionAdapter] API error:`, error);
			return [];
		}
	},

	async getById(id: string): Promise<Activity | null> {
		// For Foursquare IDs, we could fetch details but usually not needed
		return null;
	},

	async getDetails(activity: Activity): Promise<Activity> {
		return activity;
	}
};

// Keep the old export name for backward compatibility
export const fakeAttractionAdapter = attractionAdapter;
