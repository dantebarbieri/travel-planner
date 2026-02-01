/**
 * Server-side Foursquare Places adapter for food and attraction search.
 * Uses Foursquare Places API ($200/month free credits).
 *
 * This is a server-only module ($lib/server/).
 *
 * API Documentation: https://docs.foursquare.com/developer/reference/places-api-overview
 */

import type {
	Location,
	FoodVenue,
	FoodVenueType,
	Activity,
	ActivityCategory,
	OperatingHours,
	DayHours
} from '$lib/types/travel';
import { cache, foodPlacesCacheKey, attractionPlacesCacheKey, placeDetailsCacheKey } from '$lib/server/db/cache';
import { env } from '$env/dynamic/private';
import { fetchWithRetry, HttpError } from '$lib/utils/retry';

// API endpoints
const FOURSQUARE_SEARCH_URL = 'https://api.foursquare.com/v3/places/search';
const FOURSQUARE_DETAILS_URL = 'https://api.foursquare.com/v3/places';

// =============================================================================
// Foursquare Category IDs
// =============================================================================

// Food category IDs (from Foursquare taxonomy)
const FOOD_CATEGORIES = [
	'13065', // Restaurant
	'13034', // Cafe
	'13003', // Bar
	'13014', // Bakery
	'13145', // Fast Food
	'13272', // Pizzeria
	'13302', // Seafood
	'13199', // Asian
	'13236', // Italian
	'13263', // Mexican
];

// Attraction category IDs
const ATTRACTION_CATEGORIES = [
	'10027', // Museum
	'16000', // Landmark and Historical Building
	'10002', // Park
	'10056', // Performing Arts Venue
	'16026', // Monument
	'10032', // Art Gallery
	'10004', // Garden
	'16020', // Historic Site
	'10007', // Zoo
	'10003', // Aquarium
];

// Category ID to FoodVenueType mapping
const FOOD_CATEGORY_MAP: Record<string, FoodVenueType> = {
	'13065': 'restaurant',
	'13034': 'cafe',
	'13003': 'bar',
	'13014': 'bakery',
	'13145': 'fast_food',
	'13338': 'fine_dining',
	'13272': 'restaurant',  // Pizzeria -> restaurant
	'13302': 'restaurant',  // Seafood -> restaurant
	'13199': 'restaurant',  // Asian -> restaurant
	'13236': 'restaurant',  // Italian -> restaurant
	'13263': 'restaurant',  // Mexican -> restaurant
};

// Category ID to ActivityCategory mapping
const ATTRACTION_CATEGORY_MAP: Record<string, ActivityCategory> = {
	'10027': 'museum',
	'16000': 'sightseeing',
	'10002': 'outdoor',
	'10056': 'entertainment',
	'16026': 'sightseeing',
	'10032': 'museum',
	'10004': 'outdoor',
	'16020': 'sightseeing',
	'10007': 'outdoor',
	'10003': 'outdoor',
};

// =============================================================================
// Error Types
// =============================================================================

export type FoursquareErrorCode =
	| 'RATE_LIMITED'
	| 'API_ERROR'
	| 'NETWORK_ERROR'
	| 'INVALID_RESPONSE'
	| 'NO_RESULTS'
	| 'MISSING_API_KEY';

export class FoursquareError extends Error {
	constructor(
		public readonly code: FoursquareErrorCode,
		message: string,
		public readonly statusCode?: number
	) {
		super(message);
		this.name = 'FoursquareError';
	}
}

function classifyError(error: unknown): FoursquareError {
	if (error instanceof FoursquareError) {
		return error;
	}

	if (error instanceof HttpError) {
		if (error.status === 429) {
			return new FoursquareError('RATE_LIMITED', 'Foursquare API rate limit exceeded', 429);
		}
		if (error.status === 401 || error.status === 403) {
			return new FoursquareError('MISSING_API_KEY', 'Invalid or missing Foursquare API key', error.status);
		}
		if (error.status >= 500) {
			return new FoursquareError('API_ERROR', `Foursquare API server error: ${error.status}`, error.status);
		}
		return new FoursquareError('API_ERROR', `Foursquare API error: ${error.status}`, error.status);
	}

	if (error instanceof TypeError && error.message.includes('fetch')) {
		return new FoursquareError('NETWORK_ERROR', 'Failed to connect to Foursquare API');
	}

	if (error instanceof SyntaxError) {
		return new FoursquareError('INVALID_RESPONSE', 'Invalid response from Foursquare API');
	}

	const message = error instanceof Error ? error.message : 'Unknown Foursquare error';
	return new FoursquareError('API_ERROR', message);
}

// =============================================================================
// Foursquare API Types
// =============================================================================

interface FoursquareCategory {
	id: number;
	name: string;
	short_name?: string;
	icon?: {
		prefix: string;
		suffix: string;
	};
}

interface FoursquareLocation {
	address?: string;
	address_extended?: string;
	locality?: string;
	region?: string;
	postcode?: string;
	country?: string;
	formatted_address?: string;
}

interface FoursquareGeocodes {
	main?: {
		latitude: number;
		longitude: number;
	};
}

interface FoursquareHours {
	display?: string;
	is_local_holiday?: boolean;
	open_now?: boolean;
	regular?: Array<{
		close: string;
		day: number;
		open: string;
	}>;
}

interface FoursquarePlace {
	fsq_id: string;
	name: string;
	categories?: FoursquareCategory[];
	location?: FoursquareLocation;
	geocodes?: FoursquareGeocodes;
	rating?: number;
	price?: number;
	hours?: FoursquareHours;
	tel?: string;
	website?: string;
	photos?: Array<{
		id: string;
		prefix: string;
		suffix: string;
		width: number;
		height: number;
	}>;
	description?: string;
	tips?: Array<{
		text: string;
	}>;
}

interface FoursquareSearchResponse {
	results: FoursquarePlace[];
}

// =============================================================================
// Helper Functions
// =============================================================================

function getApiKey(): string {
	const key = env.FOURSQUARE_API_KEY;
	if (!key) {
		throw new FoursquareError('MISSING_API_KEY', 'FOURSQUARE_API_KEY environment variable is not set');
	}
	return key;
}

function foursquareHoursToOperatingHours(hours?: FoursquareHours): OperatingHours | undefined {
	if (!hours?.regular || hours.regular.length === 0) {
		return undefined;
	}

	const dayMap: Record<number, keyof OperatingHours> = {
		1: 'monday',
		2: 'tuesday',
		3: 'wednesday',
		4: 'thursday',
		5: 'friday',
		6: 'saturday',
		7: 'sunday',
	};

	const result: OperatingHours = {};

	// Initialize all days as closed
	for (const day of Object.values(dayMap)) {
		result[day] = { open: '', close: '', closed: true };
	}

	// Fill in open hours
	for (const entry of hours.regular) {
		const dayKey = dayMap[entry.day];
		if (dayKey) {
			result[dayKey] = {
				open: entry.open,
				close: entry.close,
				closed: false
			} as DayHours;
		}
	}

	return result;
}

function foursquarePlaceToLocation(place: FoursquarePlace): Location {
	const loc = place.location;
	const geo = place.geocodes?.main;

	return {
		name: place.name,
		address: {
			street: loc?.address || '',
			city: loc?.locality || '',
			state: loc?.region,
			postalCode: loc?.postcode,
			country: loc?.country || '',
			formatted: loc?.formatted_address || place.name
		},
		geo: {
			latitude: geo?.latitude || 0,
			longitude: geo?.longitude || 0
		}
	};
}

function foursquarePlaceToFoodVenue(place: FoursquarePlace): FoodVenue {
	const category = place.categories?.[0];
	const categoryId = category?.id?.toString() || '';

	return {
		id: `fsq-${place.fsq_id}`,
		name: place.name,
		venueType: FOOD_CATEGORY_MAP[categoryId] || 'restaurant',
		cuisineTypes: place.categories?.map(c => c.name) || [],
		location: foursquarePlaceToLocation(place),
		priceLevel: place.price as (1 | 2 | 3 | 4) | undefined,
		rating: place.rating ? place.rating / 2 : undefined, // FSQ uses 0-10, we use 0-5
		website: place.website,
		phone: place.tel,
		openingHours: foursquareHoursToOperatingHours(place.hours),
		images: place.photos?.slice(0, 5).map(p => `${p.prefix}original${p.suffix}`)
	};
}

function foursquarePlaceToActivity(place: FoursquarePlace): Activity {
	const category = place.categories?.[0];
	const categoryId = category?.id?.toString() || '';

	return {
		id: `fsq-${place.fsq_id}`,
		name: place.name,
		category: ATTRACTION_CATEGORY_MAP[categoryId] || 'sightseeing',
		location: foursquarePlaceToLocation(place),
		description: place.description || place.tips?.[0]?.text,
		rating: place.rating ? place.rating / 2 : undefined,
		website: place.website,
		phone: place.tel,
		openingHours: foursquareHoursToOperatingHours(place.hours),
		images: place.photos?.slice(0, 5).map(p => `${p.prefix}original${p.suffix}`)
	};
}

// =============================================================================
// Food Venue Search
// =============================================================================

export interface FoodSearchOptions {
	query?: string;
	cuisines?: string[];
	priceLevel?: number[];
	limit?: number;
	radius?: number;
}

/**
 * Search for food venues near a location.
 */
export async function searchFoodVenues(
	lat: number,
	lon: number,
	options: FoodSearchOptions = {}
): Promise<FoodVenue[]> {
	const cacheKey = foodPlacesCacheKey(lat, lon, options.query);
	const cached = cache.get<FoodVenue[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			ll: `${lat},${lon}`,
			categories: FOOD_CATEGORIES.join(','),
			limit: (options.limit ?? 20).toString(),
			radius: (options.radius ?? 5000).toString(),
			fields: 'fsq_id,name,categories,location,geocodes,rating,price,hours,tel,website,photos'
		});

		if (options.query) {
			params.set('query', options.query);
		}

		const url = `${FOURSQUARE_SEARCH_URL}?${params}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': apiKey,
				'Accept': 'application/json'
			}
		}, {
			maxAttempts: 3,
			onRetry: (attempt, delayMs) => {
				console.log(`[Foursquare] Food search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Foursquare API error: ${response.status}`);
		}

		const data: FoursquareSearchResponse = await response.json();

		if (!data.results || data.results.length === 0) {
			cache.set(cacheKey, [], 'PLACES_FOOD');
			return [];
		}

		const venues = data.results.map(foursquarePlaceToFoodVenue);

		// Filter by price level if specified
		let filtered = venues;
		if (options.priceLevel && options.priceLevel.length > 0) {
			filtered = venues.filter(v => v.priceLevel && options.priceLevel!.includes(v.priceLevel));
		}

		cache.set(cacheKey, filtered, 'PLACES_FOOD');
		return filtered;
	} catch (error) {
		const fsqError = classifyError(error);
		console.error(`[Foursquare] Food search failed for (${lat}, ${lon}):`, fsqError.message);
		throw fsqError;
	}
}

// =============================================================================
// Attraction Search
// =============================================================================

export interface AttractionSearchOptions {
	query?: string;
	categories?: ActivityCategory[];
	limit?: number;
	radius?: number;
}

/**
 * Search for attractions near a location.
 */
export async function searchAttractions(
	lat: number,
	lon: number,
	options: AttractionSearchOptions = {}
): Promise<Activity[]> {
	const cacheKey = attractionPlacesCacheKey(lat, lon, options.query);
	const cached = cache.get<Activity[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			ll: `${lat},${lon}`,
			categories: ATTRACTION_CATEGORIES.join(','),
			limit: (options.limit ?? 20).toString(),
			radius: (options.radius ?? 10000).toString(), // Larger radius for attractions
			fields: 'fsq_id,name,categories,location,geocodes,rating,hours,tel,website,photos,description,tips'
		});

		if (options.query) {
			params.set('query', options.query);
		}

		const url = `${FOURSQUARE_SEARCH_URL}?${params}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': apiKey,
				'Accept': 'application/json'
			}
		}, {
			maxAttempts: 3,
			onRetry: (attempt, delayMs) => {
				console.log(`[Foursquare] Attraction search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Foursquare API error: ${response.status}`);
		}

		const data: FoursquareSearchResponse = await response.json();

		if (!data.results || data.results.length === 0) {
			cache.set(cacheKey, [], 'PLACES_ATTRACTIONS');
			return [];
		}

		const activities = data.results.map(foursquarePlaceToActivity);

		// Filter by category if specified
		let filtered = activities;
		if (options.categories && options.categories.length > 0) {
			filtered = activities.filter(a => options.categories!.includes(a.category));
		}

		cache.set(cacheKey, filtered, 'PLACES_ATTRACTIONS');
		return filtered;
	} catch (error) {
		const fsqError = classifyError(error);
		console.error(`[Foursquare] Attraction search failed for (${lat}, ${lon}):`, fsqError.message);
		throw fsqError;
	}
}

// =============================================================================
// Place Details
// =============================================================================

/**
 * Get detailed information about a place by ID.
 */
export async function getPlaceDetails(fsqId: string): Promise<FoursquarePlace | null> {
	// Check cache first
	const cacheKey = placeDetailsCacheKey(fsqId);
	const cached = cache.get<FoursquarePlace>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			fields: 'fsq_id,name,categories,location,geocodes,rating,price,hours,tel,website,photos,description,tips'
		});

		const url = `${FOURSQUARE_DETAILS_URL}/${fsqId}?${params}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': apiKey,
				'Accept': 'application/json'
			}
		}, {
			maxAttempts: 2
		});

		if (!response.ok) {
			if (response.status === 404) {
				return null;
			}
			throw new HttpError(response.status, `Foursquare API error: ${response.status}`);
		}

		const place: FoursquarePlace = await response.json();

		// Cache the result
		cache.set(cacheKey, place, 'PLACE_DETAILS');

		return place;
	} catch (error) {
		const fsqError = classifyError(error);
		console.error(`[Foursquare] Get place details failed for ${fsqId}:`, fsqError.message);
		throw fsqError;
	}
}

// =============================================================================
// Export
// =============================================================================

export const foursquareAdapter = {
	searchFoodVenues,
	searchAttractions,
	getPlaceDetails
};
