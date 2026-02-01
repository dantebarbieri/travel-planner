/**
 * Lodging Adapter
 *
 * Lodging search is not implemented via external API.
 * Users create custom stays with address auto-geocoding instead.
 *
 * This adapter returns empty results. The UI guides users
 * to create custom stays with the "Custom Entry" toggle.
 */

import type { LodgingAdapter, LodgingSearchParams, Stay } from '$lib/types/travel';

/**
 * Lodging adapter that returns empty results.
 * Users should create custom stays with geocoded addresses instead.
 */
export const lodgingAdapter: LodgingAdapter = {
	async search(params: LodgingSearchParams): Promise<Stay[]> {
		// No lodging API integration - users create custom stays
		return [];
	},

	async getById(id: string): Promise<Stay | null> {
		return null;
	},

	async getDetails(stay: Stay): Promise<Stay> {
		return stay;
	}
};

