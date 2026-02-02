/**
 * Server-side Geoapify adapter for geocoding and city search.
 * Uses Geoapify API (3,000 free requests/day, no attribution required).
 *
 * This is a server-only module ($lib/server/).
 *
 * API Documentation: https://apidocs.geoapify.com/docs/geocoding/
 */

import type { GeoLocation, Address, Location } from '$lib/types/travel';
import { cache, cityCacheKey, geocodeCacheKey, reverseGeocodeCacheKey, timezoneCacheKey } from '$lib/server/db/cache';
import { env } from '$env/dynamic/private';
import { fetchWithRetry, HttpError } from '$lib/utils/retry';

// API endpoints
const GEOAPIFY_GEOCODING_URL = 'https://api.geoapify.com/v1/geocode/search';
const GEOAPIFY_REVERSE_URL = 'https://api.geoapify.com/v1/geocode/reverse';
const GEOAPIFY_AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';
const TIMEZONEDB_URL = 'http://api.timezonedb.com/v2.1/get-time-zone';

// =============================================================================
// Types
// =============================================================================

export interface CitySearchResult {
	id: string;
	name: string;
	country: string;
	state?: string;      // State, province, region
	county?: string;     // County, district
	formatted?: string;  // Full formatted address (e.g., "Monterey, CA, USA")
	location: GeoLocation;
	timezone: string;
	population?: number;
}

export interface GeocodingResult {
	location: Location;
	confidence: number;
}

// Geoapify response types
interface GeoapifyFeature {
	type: 'Feature';
	properties: {
		name?: string;
		city?: string;
		town?: string;
		village?: string;
		county?: string;
		state?: string;
		country?: string;
		country_code?: string;
		postcode?: string;
		street?: string;
		housenumber?: string;
		formatted?: string;
		place_id?: string;
		lat: number;
		lon: number;
		result_type?: string;
		rank?: {
			importance?: number;
			confidence?: number;
			confidence_city_level?: number;
			match_type?: string;
		};
		timezone?: {
			name?: string;
			offset_STD?: string;
			offset_STD_seconds?: number;
			offset_DST?: string;
			offset_DST_seconds?: number;
			abbreviation_STD?: string;
			abbreviation_DST?: string;
		};
		population?: number;
	};
	geometry: {
		type: 'Point';
		coordinates: [number, number]; // [lon, lat]
	};
}

interface GeoapifyResponse {
	type: 'FeatureCollection';
	features: GeoapifyFeature[];
}

// =============================================================================
// Error Types
// =============================================================================

export type GeoapifyErrorCode =
	| 'RATE_LIMITED'
	| 'API_ERROR'
	| 'NETWORK_ERROR'
	| 'INVALID_RESPONSE'
	| 'NO_RESULTS'
	| 'MISSING_API_KEY';

export class GeoapifyError extends Error {
	constructor(
		public readonly code: GeoapifyErrorCode,
		message: string,
		public readonly statusCode?: number
	) {
		super(message);
		this.name = 'GeoapifyError';
	}
}

function classifyError(error: unknown): GeoapifyError {
	if (error instanceof GeoapifyError) {
		return error;
	}

	if (error instanceof HttpError) {
		if (error.status === 429) {
			return new GeoapifyError('RATE_LIMITED', 'Geoapify API rate limit exceeded', 429);
		}
		if (error.status === 401 || error.status === 403) {
			return new GeoapifyError('MISSING_API_KEY', 'Invalid or missing Geoapify API key', error.status);
		}
		if (error.status >= 500) {
			return new GeoapifyError('API_ERROR', `Geoapify API server error: ${error.status}`, error.status);
		}
		return new GeoapifyError('API_ERROR', `Geoapify API error: ${error.status}`, error.status);
	}

	if (error instanceof TypeError && error.message.includes('fetch')) {
		return new GeoapifyError('NETWORK_ERROR', 'Failed to connect to Geoapify API');
	}

	if (error instanceof SyntaxError) {
		return new GeoapifyError('INVALID_RESPONSE', 'Invalid response from Geoapify API');
	}

	const message = error instanceof Error ? error.message : 'Unknown Geoapify error';
	return new GeoapifyError('API_ERROR', message);
}

// =============================================================================
// Helper Functions
// =============================================================================

function getApiKey(): string {
	const key = env.GEOAPIFY_API_KEY;
	if (!key) {
		throw new GeoapifyError('MISSING_API_KEY', 'GEOAPIFY_API_KEY environment variable is not set');
	}
	return key;
}

function featureToAddress(feature: GeoapifyFeature): Address {
	const props = feature.properties;

	// Build street from housenumber and street
	let street = '';
	if (props.housenumber && props.street) {
		street = `${props.housenumber} ${props.street}`;
	} else if (props.street) {
		street = props.street;
	}

	return {
		street,
		city: props.city || props.town || props.village || '',
		state: props.state,
		postalCode: props.postcode,
		country: props.country || '',
		formatted: props.formatted || ''
	};
}

function featureToCityResult(feature: GeoapifyFeature): CitySearchResult {
	const props = feature.properties;
	const cityName = props.city || props.town || props.village || props.name || 'Unknown';

	// Generate a stable ID based on coordinates
	const lat = Math.round(props.lat * 10000);
	const lon = Math.round(props.lon * 10000);

	return {
		id: `geoapify:${lat}:${lon}`,
		name: cityName,
		country: props.country || 'Unknown',
		state: props.state,
		county: props.county,
		formatted: props.formatted,
		location: {
			latitude: props.lat,
			longitude: props.lon
		},
		timezone: props.timezone?.name || 'UTC',
		population: props.population
	};
}

function featureToLocation(feature: GeoapifyFeature, name?: string): Location {
	const props = feature.properties;
	const address = featureToAddress(feature);

	return {
		name: name || address.city || props.formatted || 'Unknown',
		address,
		geo: {
			latitude: props.lat,
			longitude: props.lon
		},
		placeId: props.place_id,
		timezone: props.timezone?.name
	};
}

// =============================================================================
// City Search
// =============================================================================

/**
 * Search for cities by name.
 * Uses Geoapify's autocomplete API with type filter for populated places.
 */
export async function searchCities(query: string, limit = 10): Promise<CitySearchResult[]> {
	if (!query || query.length < 2) {
		return [];
	}

	// Check cache
	const cacheKey = cityCacheKey(query, limit);
	const cached = cache.get<CitySearchResult[]>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			text: query,
			apiKey,
			type: 'city',  // Focus on cities/towns
			limit: limit.toString()
			// No format param = default GeoJSON response (FeatureCollection)
		});

		const url = `${GEOAPIFY_AUTOCOMPLETE_URL}?${params}`;
		const response = await fetchWithRetry(url, undefined, {
			maxAttempts: 3,
			onRetry: (attempt, delayMs) => {
				console.log(`[Geoapify] City search retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Geoapify API error: ${response.status}`);
		}

		const data: GeoapifyResponse = await response.json();

		if (!data.features || data.features.length === 0) {
			cache.set(cacheKey, [], 'CITY_SEARCH');
			return [];
		}

		// Filter to only city-type results and convert
		// Include 'suburb' because major cities like Paris return as suburb (they have arrondissements)
		const results = data.features
			.filter(f => {
				const type = f.properties.result_type;
				return type === 'city' || type === 'town' || type === 'village' || type === 'locality' || type === 'suburb';
			})
			.map(featureToCityResult)
			.slice(0, limit);

		// Cache results
		cache.set(cacheKey, results, 'CITY_SEARCH');

		return results;
	} catch (error) {
		const geoapifyError = classifyError(error);
		console.error(`[Geoapify] City search failed for "${query}":`, geoapifyError.message);
		throw geoapifyError;
	}
}

// =============================================================================
// Forward Geocoding
// =============================================================================

/**
 * Convert an address string to coordinates.
 * Returns null if no results found.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
	if (!address || address.length < 3) {
		return null;
	}

	// Check cache
	const cacheKey = geocodeCacheKey(address);
	const cached = cache.get<GeocodingResult>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			text: address,
			apiKey,
			limit: '1',
			format: 'json'
		});

		const url = `${GEOAPIFY_GEOCODING_URL}?${params}`;
		const response = await fetchWithRetry(url, undefined, {
			maxAttempts: 3,
			onRetry: (attempt, delayMs) => {
				console.log(`[Geoapify] Geocode retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Geoapify API error: ${response.status}`);
		}

		const data: GeoapifyResponse = await response.json();

		if (!data.features || data.features.length === 0) {
			return null;
		}

		const feature = data.features[0];
		const result: GeocodingResult = {
			location: featureToLocation(feature),
			confidence: feature.properties.rank?.confidence ?? 0.5
		};

		// Cache result
		cache.set(cacheKey, result, 'GEOCODING');

		return result;
	} catch (error) {
		const geoapifyError = classifyError(error);
		console.error(`[Geoapify] Geocoding failed for "${address}":`, geoapifyError.message);
		throw geoapifyError;
	}
}

// =============================================================================
// Reverse Geocoding
// =============================================================================

/**
 * Convert coordinates to an address/location.
 * Returns null if no results found.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<Location | null> {
	// Check cache
	const cacheKey = reverseGeocodeCacheKey(lat, lon);
	const cached = cache.get<Location>(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const apiKey = getApiKey();

		const params = new URLSearchParams({
			lat: lat.toString(),
			lon: lon.toString(),
			apiKey,
			format: 'json'
		});

		const url = `${GEOAPIFY_REVERSE_URL}?${params}`;
		const response = await fetchWithRetry(url, undefined, {
			maxAttempts: 3,
			onRetry: (attempt, delayMs) => {
				console.log(`[Geoapify] Reverse geocode retry ${attempt}, waiting ${delayMs}ms...`);
			}
		});

		if (!response.ok) {
			throw new HttpError(response.status, `Geoapify API error: ${response.status}`);
		}

		const data: GeoapifyResponse = await response.json();

		if (!data.features || data.features.length === 0) {
			return null;
		}

		const location = featureToLocation(data.features[0]);

		// Cache result
		cache.set(cacheKey, location, 'GEOCODING');

		return location;
	} catch (error) {
		const geoapifyError = classifyError(error);
		console.error(`[Geoapify] Reverse geocoding failed for (${lat}, ${lon}):`, geoapifyError.message);
		throw geoapifyError;
	}
}

// =============================================================================
// Timezone Lookup
// =============================================================================

/**
 * Get IANA timezone for coordinates.
 * Uses Geoapify's timezone data from geocoding, falls back to TimezoneDB.
 */
export async function getTimezone(lat: number, lon: number): Promise<string> {
	// Check cache
	const cacheKey = timezoneCacheKey(lat, lon);
	const cached = cache.get<string>(cacheKey);
	if (cached) {
		return cached;
	}

	// First, try to get timezone from reverse geocoding (Geoapify includes it)
	try {
		const location = await reverseGeocode(lat, lon);
		if (location?.timezone) {
			cache.set(cacheKey, location.timezone, 'TIMEZONE');
			return location.timezone;
		}
	} catch {
		// Continue to fallback
	}

	// Fallback to TimezoneDB if available
	const timezoneDbKey = env.TIMEZONEDB_API_KEY;
	if (timezoneDbKey) {
		try {
			const params = new URLSearchParams({
				key: timezoneDbKey,
				format: 'json',
				by: 'position',
				lat: lat.toString(),
				lng: lon.toString()
			});

			const response = await fetch(`${TIMEZONEDB_URL}?${params}`);
			if (response.ok) {
				const data = await response.json();
				if (data.status === 'OK' && data.zoneName) {
					cache.set(cacheKey, data.zoneName, 'TIMEZONE');
					return data.zoneName;
				}
			}
		} catch (error) {
			console.warn('[Geoapify] TimezoneDB fallback failed:', error);
		}
	}

	// Last resort: calculate rough timezone from longitude
	// This gives the standard offset but not DST-aware timezone names
	const roughOffset = Math.round(lon / 15);
	const fallbackTz = roughOffset >= 0 ? `Etc/GMT-${roughOffset}` : `Etc/GMT+${Math.abs(roughOffset)}`;

	console.warn(`[Geoapify] Using rough timezone estimate ${fallbackTz} for (${lat}, ${lon})`);

	return fallbackTz;
}

// =============================================================================
// Export
// =============================================================================

export const geoapifyAdapter = {
	searchCities,
	geocodeAddress,
	reverseGeocode,
	getTimezone
};
