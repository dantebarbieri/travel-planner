/**
 * Server-side Google Places API adapter for rich place details.
 * Uses Google Places API (New) for hours, pricing, and detailed info.
 *
 * This is a server-only module ($lib/server/).
 *
 * API Documentation: https://developers.google.com/maps/documentation/places/web-service/overview
 */

import type {
	OperatingHours,
	DayHours,
	PlaceTag,
	FoodTag,
	FoodVenue,
	FoodVenueType,
	Activity,
	ActivityCategory,
	Location,
	Stay,
	StayType
} from '$lib/types/travel';
import { cache, placeDetailsCacheKey, googlePlaceIdCacheKey, googleFoodPlacesCacheKey, googleAttractionPlacesCacheKey } from '$lib/server/db/cache';
import { env } from '$env/dynamic/private';
import { fetchWithRetry, HttpError } from '$lib/utils/retry';
import { warnIfUnsafeUrl } from '$lib/utils/url';

// Google Places API (New) endpoints
const GOOGLE_PLACES_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const GOOGLE_PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// =============================================================================
// Error Types
// =============================================================================

export type GooglePlacesErrorCode =
	| 'RATE_LIMITED'
	| 'API_ERROR'
	| 'NETWORK_ERROR'
	| 'INVALID_RESPONSE'
	| 'NO_RESULTS'
	| 'MISSING_API_KEY';

export class GooglePlacesError extends Error {
	constructor(
		public readonly code: GooglePlacesErrorCode,
		message: string,
		public readonly statusCode?: number
	) {
		super(message);
		this.name = 'GooglePlacesError';
	}
}

function classifyError(error: unknown): GooglePlacesError {
	if (error instanceof GooglePlacesError) {
		return error;
	}

	if (error instanceof HttpError) {
		if (error.status === 429) {
			return new GooglePlacesError('RATE_LIMITED', 'Google Places API rate limit exceeded', 429);
		}
		if (error.status === 401 || error.status === 403) {
			return new GooglePlacesError('MISSING_API_KEY', 'Invalid or missing Google Places API key', error.status);
		}
		if (error.status >= 500) {
			return new GooglePlacesError('API_ERROR', `Google Places API server error: ${error.status}`, error.status);
		}
		return new GooglePlacesError('API_ERROR', `Google Places API error: ${error.status}`, error.status);
	}

	if (error instanceof TypeError && error.message.includes('fetch')) {
		return new GooglePlacesError('NETWORK_ERROR', 'Failed to connect to Google Places API');
	}

	if (error instanceof SyntaxError) {
		return new GooglePlacesError('INVALID_RESPONSE', 'Invalid response from Google Places API');
	}

	const message = error instanceof Error ? error.message : 'Unknown Google Places error';
	return new GooglePlacesError('API_ERROR', message);
}

// =============================================================================
// Google Places API Types (New API format)
// =============================================================================

interface GooglePlaceOpeningHoursPeriod {
	open: {
		day: number; // 0-6, Sunday = 0
		hour: number;
		minute: number;
	};
	close?: {
		day: number;
		hour: number;
		minute: number;
	};
}

interface GooglePlaceOpeningHours {
	openNow?: boolean;
	periods?: GooglePlaceOpeningHoursPeriod[];
	weekdayDescriptions?: string[];
}

interface GooglePlaceReview {
	rating: number;
	text?: {
		text: string;
		languageCode: string;
	};
}

interface GooglePlace {
	id: string;
	displayName?: {
		text: string;
		languageCode: string;
	};
	formattedAddress?: string;
	location?: {
		latitude: number;
		longitude: number;
	};
	rating?: number;
	userRatingCount?: number;
	priceLevel?: 'PRICE_LEVEL_UNSPECIFIED' | 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
	currentOpeningHours?: GooglePlaceOpeningHours;
	regularOpeningHours?: GooglePlaceOpeningHours;
	websiteUri?: string;
	nationalPhoneNumber?: string;
	internationalPhoneNumber?: string;
	googleMapsUri?: string;
	types?: string[];
	reviews?: GooglePlaceReview[];
	accessibilityOptions?: {
		wheelchairAccessibleParking?: boolean;
		wheelchairAccessibleEntrance?: boolean;
		wheelchairAccessibleRestroom?: boolean;
		wheelchairAccessibleSeating?: boolean;
	};
	paymentOptions?: {
		acceptsCreditCards?: boolean;
		acceptsDebitCards?: boolean;
		acceptsCashOnly?: boolean;
	};
	parkingOptions?: {
		paidParkingLot?: boolean;
		paidStreetParking?: boolean;
		freeParkingLot?: boolean;
		freeStreetParking?: boolean;
		valetParking?: boolean;
	};
	dineIn?: boolean;
	takeout?: boolean;
	delivery?: boolean;
	reservable?: boolean;
	servesBreakfast?: boolean;
	servesLunch?: boolean;
	servesDinner?: boolean;
	servesBrunch?: boolean;
	servesVegetarianFood?: boolean;
	outdoorSeating?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getApiKey(): string {
	const key = env.GOOGLE_PLACES_API_KEY;
	if (!key) {
		throw new GooglePlacesError('MISSING_API_KEY', 'GOOGLE_PLACES_API_KEY environment variable is not set');
	}
	return key;
}

/**
 * Check if the API key is configured.
 */
export function isConfigured(): boolean {
	return !!env.GOOGLE_PLACES_API_KEY;
}

/**
 * Convert Google Places hours to our OperatingHours format.
 */
function googleHoursToOperatingHours(hours?: GooglePlaceOpeningHours): OperatingHours | undefined {
	if (!hours?.periods || hours.periods.length === 0) {
		return undefined;
	}

	type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

	// Google uses Sunday = 0
	const dayMap: Record<number, DayKey> = {
		0: 'sunday',
		1: 'monday',
		2: 'tuesday',
		3: 'wednesday',
		4: 'thursday',
		5: 'friday',
		6: 'saturday'
	};

	const result: OperatingHours = {};

	// Initialize all days as closed
	const allDays: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	for (const day of allDays) {
		result[day] = { open: '', close: '', closed: true };
	}

	// Fill in open hours
	for (const period of hours.periods) {
		const dayKey = dayMap[period.open.day];
		if (dayKey && period.close) {
			const openTime = `${period.open.hour.toString().padStart(2, '0')}:${period.open.minute.toString().padStart(2, '0')}`;
			const closeTime = `${period.close.hour.toString().padStart(2, '0')}:${period.close.minute.toString().padStart(2, '0')}`;

			result[dayKey] = {
				open: openTime,
				close: closeTime,
				closed: false
			};
		}
	}

	return result;
}

/**
 * Convert Google price level to our 1-4 scale.
 */
function googlePriceLevelToNumber(priceLevel?: string): 1 | 2 | 3 | 4 | undefined {
	switch (priceLevel) {
		case 'PRICE_LEVEL_FREE':
		case 'PRICE_LEVEL_INEXPENSIVE':
			return 1;
		case 'PRICE_LEVEL_MODERATE':
			return 2;
		case 'PRICE_LEVEL_EXPENSIVE':
			return 3;
		case 'PRICE_LEVEL_VERY_EXPENSIVE':
			return 4;
		default:
			return undefined;
	}
}

/**
 * Extract tags from Google Place data.
 */
function extractPlaceTags(place: GooglePlace): PlaceTag[] {
	const tags: PlaceTag[] = [];

	// Accessibility
	if (place.accessibilityOptions?.wheelchairAccessibleEntrance) {
		tags.push('wheelchair_accessible');
	}

	// Parking
	if (place.parkingOptions?.freeParkingLot || place.parkingOptions?.freeStreetParking ||
		place.parkingOptions?.paidParkingLot || place.parkingOptions?.paidStreetParking) {
		tags.push('parking');
	}

	// Payment
	if (place.paymentOptions?.acceptsCashOnly) {
		tags.push('cash_only');
	} else if (place.paymentOptions?.acceptsCreditCards) {
		tags.push('credit_cards');
	}

	// Reservations
	if (place.reservable) {
		tags.push('reservations_required');
	}

	return tags;
}

/**
 * Extract food-specific tags from Google Place data.
 */
function extractFoodTags(place: GooglePlace): FoodTag[] {
	const tags: FoodTag[] = [];

	// Outdoor seating
	if (place.outdoorSeating) {
		tags.push('outdoor_seating');
	}

	// Takeout/Delivery
	if (place.takeout) {
		tags.push('takeout');
	}
	if (place.delivery) {
		tags.push('delivery');
	}

	// Reservations
	if (place.reservable) {
		tags.push('reservations_required');
	}

	// Payment
	if (place.paymentOptions?.acceptsCashOnly) {
		tags.push('cash_only');
	} else if (place.paymentOptions?.acceptsCreditCards) {
		tags.push('credit_cards');
	}

	// Vegetarian
	if (place.servesVegetarianFood) {
		tags.push('vegetarian_options');
	}

	return tags;
}

// =============================================================================
// Place Details Result Type
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
	/** Source of this data */
	source: 'google' | 'foursquare';
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Search for a place by name and location to get its Google Place ID.
 * Returns the place ID if found, null otherwise.
 * Results are cached for 30 days since place IDs rarely change.
 */
export async function findPlaceId(
	name: string,
	lat: number,
	lon: number
): Promise<string | null> {
	if (!isConfigured()) {
		return null;
	}

	// Check cache first
	const cacheKey = googlePlaceIdCacheKey(name, lat, lon);
	const cached = cache.get<string | null>(cacheKey);
	if (cached !== null) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const requestBody = {
			textQuery: name,
			locationBias: {
				circle: {
					center: { latitude: lat, longitude: lon },
					radius: 1000 // 1km radius
				}
			},
			maxResultCount: 1
		};

		const response = await fetchWithRetry(GOOGLE_PLACES_SEARCH_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': 'places.id,places.displayName'
			},
			body: JSON.stringify(requestBody)
		}, {
			maxAttempts: 2,
			onRetry: (attempt, delayMs) => {
				console.log(`[GooglePlaces] Search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Google Places API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data.places || data.places.length === 0) {
			// Cache the "not found" result to avoid repeated lookups
			cache.set(cacheKey, '', 'GOOGLE_PLACE_ID_SEARCH');
			return null;
		}

		const placeId = data.places[0].id || null;
		
		// Cache the result
		if (placeId) {
			cache.set(cacheKey, placeId, 'GOOGLE_PLACE_ID_SEARCH');
		}

		return placeId;
	} catch (error) {
		const gpError = classifyError(error);
		// Don't log if it's just missing API key - that's expected
		if (gpError.code !== 'MISSING_API_KEY') {
			console.warn(`[GooglePlaces] Find place ID failed for "${name}":`, gpError.message);
		}
		return null;
	}
}

/**
 * Get detailed place information by Google Place ID.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
	if (!isConfigured()) {
		return null;
	}

	// Check cache first
	const cacheKey = `google:${placeDetailsCacheKey(placeId)}`;
	const cached = cache.get<PlaceDetails>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		// Request specific fields to minimize costs
		const fieldMask = [
			'id',
			'displayName',
			'formattedAddress',
			'location',
			'rating',
			'userRatingCount',
			'priceLevel',
			'currentOpeningHours',
			'regularOpeningHours',
			'websiteUri',
			'nationalPhoneNumber',
			'googleMapsUri',
			'accessibilityOptions',
			'paymentOptions',
			'parkingOptions',
			'outdoorSeating',
			'takeout',
			'delivery',
			'reservable',
			'servesVegetarianFood'
		].join(',');

		const url = `${GOOGLE_PLACES_DETAILS_URL}/${placeId}`;
		const response = await fetchWithRetry(url, {
			headers: {
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': fieldMask
			}
		}, {
			maxAttempts: 2,
			onRetry: (attempt, delayMs) => {
				console.log(`[GooglePlaces] Details retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return null;
			}
			throw new HttpError(response.status, `Google Places API error: ${response.status}`);
		}

		const place: GooglePlace = await response.json();

		// Validate external URLs at ingestion
		warnIfUnsafeUrl(place.websiteUri, 'Google Places PlaceDetails.website');

		const details: PlaceDetails = {
			placeId: place.id,
			name: place.displayName?.text || '',
			address: place.formattedAddress,
			location: place.location,
			openingHours: googleHoursToOperatingHours(place.regularOpeningHours || place.currentOpeningHours),
			priceLevel: googlePriceLevelToNumber(place.priceLevel),
			rating: place.rating,
			reviewCount: place.userRatingCount,
			website: place.websiteUri,
			phone: place.nationalPhoneNumber,
			googleMapsUrl: place.googleMapsUri,
			placeTags: extractPlaceTags(place),
			foodTags: extractFoodTags(place),
			isOpenNow: place.currentOpeningHours?.openNow,
			source: 'google'
		};

		// Cache the result
		cache.set(cacheKey, details, 'PLACE_DETAILS');

		return details;
	} catch (error) {
		const gpError = classifyError(error);
		if (gpError.code !== 'MISSING_API_KEY') {
			console.error(`[GooglePlaces] Get details failed for ${placeId}:`, gpError.message);
		}
		return null;
	}
}

/**
 * Get place details by searching for the place first, then fetching details.
 * This is useful when we have Foursquare data and want to enrich with Google data.
 */
export async function getPlaceDetailsByNameAndLocation(
	name: string,
	lat: number,
	lon: number
): Promise<PlaceDetails | null> {
	// Generate a cache key based on name and location
	const cacheKey = `google:place:${name.toLowerCase().trim()}:${Math.round(lat * 1000)}:${Math.round(lon * 1000)}`;
	const cached = cache.get<PlaceDetails>(cacheKey);
	if (cached) {
		return cached;
	}

	const placeId = await findPlaceId(name, lat, lon);
	if (!placeId) {
		return null;
	}

	const details = await getPlaceDetails(placeId);
	if (details) {
		// Also cache by name+location for future lookups
		cache.set(cacheKey, details, 'PLACE_DETAILS');
	}

	return details;
}

// =============================================================================
// Google Place → FoodVenue / Activity Conversion
// =============================================================================

// Google types → FoodVenueType mapping
const GOOGLE_FOOD_TYPE_MAP: Record<string, FoodVenueType> = {
	'restaurant': 'restaurant',
	'cafe': 'cafe',
	'coffee_shop': 'cafe',
	'bar': 'bar',
	'bakery': 'bakery',
	'meal_delivery': 'fast_food',
	'meal_takeaway': 'fast_food',
	'fine_dining_restaurant': 'fine_dining',
	'fast_food_restaurant': 'fast_food',
	'food': 'restaurant',
};

// Google types → ActivityCategory mapping
const GOOGLE_ATTRACTION_TYPE_MAP: Record<string, ActivityCategory> = {
	'museum': 'museum',
	'art_gallery': 'museum',
	'park': 'outdoor',
	'tourist_attraction': 'sightseeing',
	'amusement_park': 'entertainment',
	'zoo': 'outdoor',
	'aquarium': 'outdoor',
	'church': 'sightseeing',
	'hindu_temple': 'sightseeing',
	'mosque': 'sightseeing',
	'synagogue': 'sightseeing',
	'stadium': 'sports',
	'shopping_mall': 'shopping',
	'spa': 'wellness',
	'night_club': 'nightlife',
	'performing_arts_theater': 'entertainment',
	'movie_theater': 'entertainment',
};

function googlePlaceToLocation(place: GooglePlace): Location {
	return {
		name: place.displayName?.text || '',
		address: {
			street: '',
			city: '',
			country: '',
			formatted: place.formattedAddress || place.displayName?.text || ''
		},
		geo: {
			latitude: place.location?.latitude || 0,
			longitude: place.location?.longitude || 0
		},
		placeId: place.id
	};
}

function googlePlaceToFoodVenue(place: GooglePlace): FoodVenue {
	// Determine venue type from Google types
	let venueType: FoodVenueType = 'restaurant';
	const cuisineTypes: string[] = [];
	for (const t of place.types || []) {
		if (GOOGLE_FOOD_TYPE_MAP[t]) {
			venueType = GOOGLE_FOOD_TYPE_MAP[t];
		}
		// Use readable type names as cuisine tags
		if (!['point_of_interest', 'establishment', 'food'].includes(t)) {
			cuisineTypes.push(t.replace(/_/g, ' '));
		}
	}

	warnIfUnsafeUrl(place.websiteUri, 'Google Places FoodVenue.website');

	return {
		id: `gp-${place.id}`,
		name: place.displayName?.text || '',
		venueType,
		cuisineTypes: cuisineTypes.length > 0 ? cuisineTypes : undefined,
		location: googlePlaceToLocation(place),
		priceLevel: googlePriceLevelToNumber(place.priceLevel),
		rating: place.rating,
		reviewCount: place.userRatingCount,
		website: place.websiteUri,
		phone: place.nationalPhoneNumber,
		openingHours: googleHoursToOperatingHours(place.regularOpeningHours || place.currentOpeningHours),
		tags: extractFoodTags(place),
	};
}

function googlePlaceToActivity(place: GooglePlace): Activity {
	// Determine category from Google types
	let category: ActivityCategory = 'sightseeing';
	const categoryTags: string[] = [];
	for (const t of place.types || []) {
		if (GOOGLE_ATTRACTION_TYPE_MAP[t]) {
			category = GOOGLE_ATTRACTION_TYPE_MAP[t];
		}
		if (!['point_of_interest', 'establishment'].includes(t)) {
			categoryTags.push(t.replace(/_/g, ' '));
		}
	}

	warnIfUnsafeUrl(place.websiteUri, 'Google Places Activity.website');

	return {
		id: `gp-${place.id}`,
		name: place.displayName?.text || '',
		category,
		location: googlePlaceToLocation(place),
		rating: place.rating,
		reviewCount: place.userRatingCount,
		priceLevel: googlePriceLevelToNumber(place.priceLevel),
		website: place.websiteUri,
		phone: place.nationalPhoneNumber,
		openingHours: googleHoursToOperatingHours(place.regularOpeningHours || place.currentOpeningHours),
		tags: extractPlaceTags(place),
		categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
	};
}

// =============================================================================
// Text Search for Food Venues
// =============================================================================

export interface GoogleFoodSearchOptions {
	query?: string;
	limit?: number;
	radius?: number;
}

/**
 * Search for food venues near a location using Google Places Text Search.
 */
export async function searchFoodVenues(
	lat: number,
	lon: number,
	options: GoogleFoodSearchOptions = {}
): Promise<FoodVenue[]> {
	if (!isConfigured()) {
		return [];
	}

	const cacheKey = googleFoodPlacesCacheKey(lat, lon, options.query);
	const cached = cache.get<FoodVenue[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();
		// Use user query as-is; only fall back to broad term when no query given
		const textQuery = options.query || 'restaurants';

		const requestBody: Record<string, unknown> = {
			textQuery,
			maxResultCount: Math.min(options.limit ?? 20, 20)
		};

		// Only add location bias if coordinates are provided (non-zero)
		if (lat !== 0 || lon !== 0) {
			requestBody.locationBias = {
				circle: {
					center: { latitude: lat, longitude: lon },
					radius: options.radius ?? 5000
				}
			};
		}

		const fieldMask = [
			'places.id',
			'places.displayName',
			'places.formattedAddress',
			'places.location',
			'places.rating',
			'places.userRatingCount',
			'places.priceLevel',
			'places.regularOpeningHours',
			'places.currentOpeningHours',
			'places.websiteUri',
			'places.nationalPhoneNumber',
			'places.googleMapsUri',
			'places.types',
			'places.takeout',
			'places.delivery',
			'places.reservable',
			'places.servesVegetarianFood',
			'places.outdoorSeating',
			'places.paymentOptions',
			'places.accessibilityOptions',
			'places.parkingOptions'
		].join(',');

		const response = await fetchWithRetry(GOOGLE_PLACES_SEARCH_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': fieldMask
			},
			body: JSON.stringify(requestBody)
		}, {
			maxAttempts: 2,
			onRetry: (attempt, delayMs) => {
				console.log(`[GooglePlaces] Food search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Google Places API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data.places || data.places.length === 0) {
			cache.set(cacheKey, [], 'GOOGLE_PLACES_FOOD');
			return [];
		}

		const venues = (data.places as GooglePlace[]).map(googlePlaceToFoodVenue);

		// Also cache individual place details to avoid extra API calls later
		for (const place of data.places as GooglePlace[]) {
			const detailsCacheKey = `google:${placeDetailsCacheKey(place.id)}`;
			if (!cache.has(detailsCacheKey)) {
				const details: PlaceDetails = {
					placeId: place.id,
					name: place.displayName?.text || '',
					address: place.formattedAddress,
					location: place.location,
					openingHours: googleHoursToOperatingHours(place.regularOpeningHours || place.currentOpeningHours),
					priceLevel: googlePriceLevelToNumber(place.priceLevel),
					rating: place.rating,
					reviewCount: place.userRatingCount,
					website: place.websiteUri,
					phone: place.nationalPhoneNumber,
					googleMapsUrl: place.googleMapsUri,
					placeTags: extractPlaceTags(place),
					foodTags: extractFoodTags(place),
					isOpenNow: place.currentOpeningHours?.openNow,
					source: 'google'
				};
				cache.set(detailsCacheKey, details, 'PLACE_DETAILS');
			}
		}

		cache.set(cacheKey, venues, 'GOOGLE_PLACES_FOOD');
		return venues;
	} catch (error) {
		const gpError = classifyError(error);
		if (gpError.code !== 'MISSING_API_KEY') {
			console.error(`[GooglePlaces] Food search failed for (${lat}, ${lon}):`, gpError.message);
		}
		throw gpError;
	}
}

// =============================================================================
// Text Search for Attractions
// =============================================================================

export interface GoogleAttractionSearchOptions {
	query?: string;
	categories?: ActivityCategory[];
	limit?: number;
	radius?: number;
}

/**
 * Search for attractions near a location using Google Places Text Search.
 */
export async function searchAttractions(
	lat: number,
	lon: number,
	options: GoogleAttractionSearchOptions = {}
): Promise<Activity[]> {
	if (!isConfigured()) {
		return [];
	}

	const cacheKey = googleAttractionPlacesCacheKey(lat, lon, options.query);
	const cached = cache.get<Activity[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();
		const textQuery = options.query || 'tourist attractions landmarks';

		const requestBody: Record<string, unknown> = {
			textQuery,
			maxResultCount: Math.min(options.limit ?? 20, 20)
		};

		if (lat !== 0 || lon !== 0) {
			requestBody.locationBias = {
				circle: {
					center: { latitude: lat, longitude: lon },
					radius: options.radius ?? 10000
				}
			};
		}

		const fieldMask = [
			'places.id',
			'places.displayName',
			'places.formattedAddress',
			'places.location',
			'places.rating',
			'places.userRatingCount',
			'places.priceLevel',
			'places.regularOpeningHours',
			'places.currentOpeningHours',
			'places.websiteUri',
			'places.nationalPhoneNumber',
			'places.googleMapsUri',
			'places.types',
			'places.accessibilityOptions',
			'places.paymentOptions',
			'places.parkingOptions',
			'places.reservable'
		].join(',');

		const response = await fetchWithRetry(GOOGLE_PLACES_SEARCH_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': fieldMask
			},
			body: JSON.stringify(requestBody)
		}, {
			maxAttempts: 2,
			onRetry: (attempt, delayMs) => {
				console.log(`[GooglePlaces] Attraction search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Google Places API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data.places || data.places.length === 0) {
			cache.set(cacheKey, [], 'GOOGLE_PLACES_ATTRACTIONS');
			return [];
		}

		const activities = (data.places as GooglePlace[]).map(googlePlaceToActivity);

		// Also cache individual place details
		for (const place of data.places as GooglePlace[]) {
			const detailsCacheKey = `google:${placeDetailsCacheKey(place.id)}`;
			if (!cache.has(detailsCacheKey)) {
				const details: PlaceDetails = {
					placeId: place.id,
					name: place.displayName?.text || '',
					address: place.formattedAddress,
					location: place.location,
					openingHours: googleHoursToOperatingHours(place.regularOpeningHours || place.currentOpeningHours),
					priceLevel: googlePriceLevelToNumber(place.priceLevel),
					rating: place.rating,
					reviewCount: place.userRatingCount,
					website: place.websiteUri,
					phone: place.nationalPhoneNumber,
					googleMapsUrl: place.googleMapsUri,
					placeTags: extractPlaceTags(place),
					foodTags: [],
					isOpenNow: place.currentOpeningHours?.openNow,
					source: 'google'
				};
				cache.set(detailsCacheKey, details, 'PLACE_DETAILS');
			}
		}

		cache.set(cacheKey, activities, 'GOOGLE_PLACES_ATTRACTIONS');
		return activities;
	} catch (error) {
		const gpError = classifyError(error);
		if (gpError.code !== 'MISSING_API_KEY') {
			console.error(`[GooglePlaces] Attraction search failed for (${lat}, ${lon}):`, gpError.message);
		}
		throw gpError;
	}
}

// =============================================================================
// Google Place → Stay Conversion
// =============================================================================

const GOOGLE_LODGING_TYPE_MAP: Record<string, StayType> = {
	'lodging': 'hotel',
	'hotel': 'hotel',
	'motel': 'hotel',
	'resort_hotel': 'hotel',
	'extended_stay_hotel': 'hotel',
	'bed_and_breakfast': 'custom',
	'hostel': 'hostel',
	'guest_house': 'custom',
	'campground': 'custom',
	'camping_cabin': 'custom',
	'cottage': 'airbnb',
	'farmstay': 'airbnb',
	'private_guest_room': 'airbnb',
};

function googlePlaceToStay(place: GooglePlace): Stay {
	let stayType: StayType = 'hotel';
	for (const t of place.types || []) {
		if (GOOGLE_LODGING_TYPE_MAP[t]) {
			stayType = GOOGLE_LODGING_TYPE_MAP[t];
			break;
		}
	}

	warnIfUnsafeUrl(place.websiteUri, 'Google Places Stay.website');

	return {
		id: `gp-${place.id}`,
		type: stayType,
		name: place.displayName?.text || '',
		location: googlePlaceToLocation(place),
		checkIn: '',
		checkOut: '',
		website: place.websiteUri,
		phone: place.nationalPhoneNumber,
		images: [],
		notes: place.rating ? `Rating: ${place.rating.toFixed(1)}/5` : undefined,
	} as Stay;
}

// =============================================================================
// Text Search for Lodging
// =============================================================================

export interface GoogleLodgingSearchOptions {
	query?: string;
	limit?: number;
	radius?: number;
	lat?: number;
	lon?: number;
	near?: string;
}

/**
 * Search for lodging using Google Places Text Search.
 */
export async function searchLodging(
	options: GoogleLodgingSearchOptions = {}
): Promise<Stay[]> {
	if (!isConfigured()) {
		return [];
	}

	if (!options.query) {
		return [];
	}

	const lat = options.lat ?? 0;
	const lon = options.lon ?? 0;
	const cacheKey = `google:lodging:${options.query.toLowerCase().trim()}:${Math.round(lat * 1000)}:${Math.round(lon * 1000)}`;
	const cached = cache.get<Stay[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();
		const textQuery = options.query;

		const requestBody: Record<string, unknown> = {
			textQuery,
			maxResultCount: Math.min(options.limit ?? 20, 20)
		};

		if (lat !== 0 || lon !== 0) {
			requestBody.locationBias = {
				circle: {
					center: { latitude: lat, longitude: lon },
					radius: options.radius ?? 10000
				}
			};
		}

		const fieldMask = [
			'places.id',
			'places.displayName',
			'places.formattedAddress',
			'places.location',
			'places.rating',
			'places.userRatingCount',
			'places.priceLevel',
			'places.regularOpeningHours',
			'places.websiteUri',
			'places.nationalPhoneNumber',
			'places.googleMapsUri',
			'places.types'
		].join(',');

		const response = await fetchWithRetry(GOOGLE_PLACES_SEARCH_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': fieldMask
			},
			body: JSON.stringify(requestBody)
		}, {
			maxAttempts: 2,
			onRetry: (attempt, delayMs) => {
				console.log(`[GooglePlaces] Lodging search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Google Places API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data.places || data.places.length === 0) {
			cache.set(cacheKey, [], 'GOOGLE_PLACES_FOOD');
			return [];
		}

		const stays = (data.places as GooglePlace[]).map(googlePlaceToStay);
		cache.set(cacheKey, stays, 'GOOGLE_PLACES_FOOD');
		return stays;
	} catch (error) {
		const gpError = classifyError(error);
		if (gpError.code !== 'MISSING_API_KEY') {
			console.error(`[GooglePlaces] Lodging search failed:`, gpError.message);
		}
		throw gpError;
	}
}

// =============================================================================
// Export
// =============================================================================

export const googlePlacesAdapter = {
	isConfigured,
	findPlaceId,
	getPlaceDetails,
	getPlaceDetailsByNameAndLocation,
	searchFoodVenues,
	searchAttractions,
	searchLodging
};
