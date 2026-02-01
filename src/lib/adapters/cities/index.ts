/**
 * City Search Adapter
 *
 * Uses the Geoapify API for city search.
 * Returns empty results if the API is unavailable.
 */

import type { GeoLocation } from '$lib/types/travel';
import { searchCities as searchCitiesApi, type CitySearchResult as ApiCitySearchResult } from '$lib/api/geocodingApi';

export interface CitySearchResult {
	id: string;
	name: string;
	country: string;
	location: GeoLocation;
	timezone: string;
	population?: number;
}

/**
 * Convert API result to adapter result format.
 */
function apiResultToAdapterResult(apiResult: ApiCitySearchResult): CitySearchResult {
	return {
		id: apiResult.id,
		name: apiResult.name,
		country: apiResult.country,
		location: apiResult.location,
		timezone: apiResult.timezone,
		population: apiResult.population
	};
}

export interface CitySearchAdapter {
	search(query: string, limit?: number): Promise<CitySearchResult[]>;
	getById(id: string): Promise<CitySearchResult | null>;
}

/**
 * City search adapter using Geoapify API.
 * Returns empty results if API is unavailable.
 */
export const cityAdapter: CitySearchAdapter = {
	async search(query: string, limit = 10): Promise<CitySearchResult[]> {
		if (!query || query.length < 2) {
			return [];
		}

		try {
			const apiResults = await searchCitiesApi(query, limit);
			return apiResults.map(apiResultToAdapterResult);
		} catch (error) {
			console.warn(`[CityAdapter] API error:`, error);
			return [];
		}
	},

	async getById(id: string): Promise<CitySearchResult | null> {
		// For Geoapify IDs, we could reverse geocode but cities are typically searched
		// not looked up by ID directly
		return null;
	}
};

