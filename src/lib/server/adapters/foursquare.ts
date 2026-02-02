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
	DayHours,
	Stay,
	StayType
} from '$lib/types/travel';
import { cache, foodPlacesCacheKey, attractionPlacesCacheKey, placeDetailsCacheKey, lodgingPlacesCacheKey } from '$lib/server/db/cache';
import { env } from '$env/dynamic/private';
import { fetchWithRetry, HttpError } from '$lib/utils/retry';

// API endpoints (new Foursquare Places API - migrated from v3)
const FOURSQUARE_SEARCH_URL = 'https://places-api.foursquare.com/places/search';
const FOURSQUARE_DETAILS_URL = 'https://places-api.foursquare.com/places';

// Required version header for new API
const FOURSQUARE_API_VERSION = '2025-06-17';

// Fields to request from the API (hours, rating, etc. must be explicitly requested)
const FOURSQUARE_SEARCH_FIELDS = [
	'fsq_place_id',
	'name',
	'categories',
	'location',
	'latitude',
	'longitude',
	'rating',
	'price',
	'hours',
	'tel',
	'website',
	'photos',
	'description',
	'tips'
].join(',');

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

// Lodging category IDs (new Foursquare API format)
const LODGING_CATEGORIES = [
	'4bf58dd8d48988d1fa931735', // Hotel
	'4bf58dd8d48988d1ee931735', // Hostel
	'4bf58dd8d48988d1f8931735', // Bed and Breakfast
	'4bf58dd8d48988d1fb931735', // Motel
	'4bf58dd8d48988d12f951735', // Resort
	'4bf58dd8d48988d1f9931735', // Vacation Rental
	'4bf58dd8d48988d100951735', // Inn
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

// Category ID to StayType mapping (new Foursquare API format)
const LODGING_CATEGORY_MAP: Record<string, StayType> = {
	'4bf58dd8d48988d1fa931735': 'hotel',    // Hotel
	'4bf58dd8d48988d1ee931735': 'hostel',   // Hostel
	'4bf58dd8d48988d1f8931735': 'custom',   // Bed and Breakfast -> custom
	'4bf58dd8d48988d1fb931735': 'hotel',    // Motel -> hotel
	'4bf58dd8d48988d12f951735': 'hotel',    // Resort -> hotel
	'4bf58dd8d48988d1f9931735': 'airbnb',   // Vacation Rental -> airbnb (most similar)
	'4bf58dd8d48988d100951735': 'hotel',    // Inn -> hotel
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
	fsq_category_id: string;  // New API uses string IDs
	name: string;
	short_name?: string;
	plural_name?: string;
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
	fsq_place_id: string;  // Changed from fsq_id in new API
	name: string;
	categories?: FoursquareCategory[];
	location?: FoursquareLocation;
	// New API has lat/lon at top level instead of nested geocodes
	latitude?: number;
	longitude?: number;
	rating?: number;
	price?: number;
	hours?: FoursquareHours;
	tel?: string;
	email?: string;
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

	type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

	const dayMap: Record<number, DayKey> = {
		1: 'monday',
		2: 'tuesday',
		3: 'wednesday',
		4: 'thursday',
		5: 'friday',
		6: 'saturday',
		7: 'sunday'
	};

	const result: OperatingHours = {};

	// Initialize all days as closed
	const allDays: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	for (const day of allDays) {
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
			};
		}
	}

	return result;
}

function foursquarePlaceToLocation(place: FoursquarePlace): Location {
	const loc = place.location;

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
			// New API has lat/lon at top level
			latitude: place.latitude || 0,
			longitude: place.longitude || 0
		}
	};
}

function foursquarePlaceToFoodVenue(place: FoursquarePlace): FoodVenue {
	const category = place.categories?.[0];
	const categoryId = category?.fsq_category_id || '';

	return {
		id: `fsq-${place.fsq_place_id}`,
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
	const categoryId = category?.fsq_category_id || '';

	// Extract all category names for display as tags
	const categoryTags = place.categories?.map(c => c.name).filter(Boolean) || [];

	return {
		id: `fsq-${place.fsq_place_id}`,
		name: place.name,
		category: ATTRACTION_CATEGORY_MAP[categoryId] || 'sightseeing',
		location: foursquarePlaceToLocation(place),
		description: place.description || place.tips?.[0]?.text,
		rating: place.rating ? place.rating / 2 : undefined,
		website: place.website,
		phone: place.tel,
		openingHours: foursquareHoursToOperatingHours(place.hours),
		images: place.photos?.slice(0, 5).map(p => `${p.prefix}original${p.suffix}`),
		categoryTags: categoryTags.length > 0 ? categoryTags : undefined
	};
}

function foursquarePlaceToStay(place: FoursquarePlace): Stay {
	const category = place.categories?.[0];
	const categoryId = category?.fsq_category_id || '';
	const stayType = LODGING_CATEGORY_MAP[categoryId] || 'hotel';

	// Build the base stay object with required fields
	const baseStay = {
		id: `fsq-${place.fsq_place_id}`,
		name: place.name,
		location: foursquarePlaceToLocation(place),
		checkIn: '',  // User will set these
		checkOut: '',
		website: place.website,
		phone: place.tel,
		images: place.photos?.slice(0, 5).map(p => `${p.prefix}original${p.suffix}`),
		// Store rating in notes since Stay doesn't have a rating field
		notes: place.rating ? `Rating: ${(place.rating / 2).toFixed(1)}/5` : undefined,
	};

	// Return appropriate stay type
	return { ...baseStay, type: stayType } as Stay;
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
			fields: FOURSQUARE_SEARCH_FIELDS,
			limit: (options.limit ?? 20).toString(),
			radius: (options.radius ?? 5000).toString()
		});

		if (options.query) {
			params.set('query', options.query);
		}

		const url = `${FOURSQUARE_SEARCH_URL}?${params}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Accept': 'application/json',
				'X-Places-Api-Version': FOURSQUARE_API_VERSION
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
			fields: FOURSQUARE_SEARCH_FIELDS,
			limit: (options.limit ?? 20).toString(),
			radius: (options.radius ?? 10000).toString() // Larger radius for attractions
		});

		if (options.query) {
			params.set('query', options.query);
		}

		const url = `${FOURSQUARE_SEARCH_URL}?${params}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Accept': 'application/json',
				'X-Places-Api-Version': FOURSQUARE_API_VERSION
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
// Lodging Search
// =============================================================================

export interface LodgingSearchOptions {
	query?: string;  // Required for search
	limit?: number;
	radius?: number;
	lat?: number;    // Optional: for location-biased search
	lon?: number;    // Optional: for location-biased search
	near?: string;   // Optional: city/location name (e.g., "Monterey, CA")
}

/**
 * Search for lodging (hotels, hostels, etc.) globally by query.
 * Optionally provide lat/lon for location-biased results.
 */
export async function searchLodging(
	options: LodgingSearchOptions = {}
): Promise<Stay[]> {
	// Require a query for search
	if (!options.query) {
		return [];
	}

	// Generate cache key based on query and optional location/near
	const cacheKey = lodgingPlacesCacheKey(options.query, {
		lat: options.lat,
		lon: options.lon,
		near: options.near
	});
	const cached = cache.get<Stay[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			query: options.query,
			fields: FOURSQUARE_SEARCH_FIELDS,
			limit: (options.limit ?? 20).toString()
		});

		// Add location bias - prefer coordinates, fall back to near parameter
		if (options.lat && options.lon) {
			params.set('ll', `${options.lat},${options.lon}`);
			params.set('categories', LODGING_CATEGORIES.join(','));
			if (options.radius) {
				params.set('radius', options.radius.toString());
			}
		} else if (options.near) {
			params.set('near', options.near);
			params.set('categories', LODGING_CATEGORIES.join(','));
		}
		// Without any location, rely on query alone (API uses IP geolocation)

		const url = `${FOURSQUARE_SEARCH_URL}?${params}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Accept': 'application/json',
				'X-Places-Api-Version': FOURSQUARE_API_VERSION
			}
		}, {
			maxAttempts: 3,
			onRetry: (attempt, delayMs) => {
				console.log(`[Foursquare] Lodging search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Foursquare API error: ${response.status}`);
		}

		const data: FoursquareSearchResponse = await response.json();

		if (!data.results || data.results.length === 0) {
			cache.set(cacheKey, [], 'PLACES_LODGING');
			return [];
		}

		const stays = data.results.map(foursquarePlaceToStay);

		cache.set(cacheKey, stays, 'PLACES_LODGING');
		return stays;
	} catch (error) {
		const fsqError = classifyError(error);
		console.error(`[Foursquare] Lodging search failed for query "${options.query}":`, fsqError.message);
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

		const url = `${FOURSQUARE_DETAILS_URL}/${fsqId}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Accept': 'application/json',
				'X-Places-Api-Version': FOURSQUARE_API_VERSION
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
	searchLodging,
	getPlaceDetails
};
