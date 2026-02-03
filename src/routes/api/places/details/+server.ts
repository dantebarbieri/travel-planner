/**
 * Place Details API endpoint.
 * GET /api/places/details?name=...&lat=...&lon=...
 *
 * Fetch detailed information about a place including hours, pricing, and tags.
 * Uses Google Places API with Foursquare fallback.
 */

import { json } from '@sveltejs/kit';
import { googlePlacesAdapter, GooglePlacesError, type PlaceDetails } from '$lib/server/adapters/googlePlaces';
import { getPlaceDetails as getFoursquareDetails, FoursquareError } from '$lib/server/adapters/foursquare';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	// Rate limiting
	const ip = rateLimit.getClientIp(request, getClientAddress);
	if (!rateLimit.check(ip, 'places')) {
		const headers = rateLimit.getHeaders(ip, 'places');
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		});
	}

	// Parse parameters - can use either placeId or name+lat+lon
	const googlePlaceId = url.searchParams.get('googlePlaceId');
	const foursquarePlaceId = url.searchParams.get('foursquarePlaceId');
	const name = url.searchParams.get('name');
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');

	let details: PlaceDetails | null = null;

	// Try Google Places first if we have a place ID
	if (googlePlaceId && googlePlacesAdapter.isConfigured()) {
		try {
			details = await googlePlacesAdapter.getPlaceDetails(googlePlaceId);
		} catch (err) {
			if (err instanceof GooglePlacesError && err.code !== 'MISSING_API_KEY') {
				console.warn('Google Places lookup failed:', err.message);
			}
		}
	}

	// If no Google result and we have name+location, search by name
	if (!details && name && latParam && lonParam) {
		const lat = parseFloat(latParam);
		const lon = parseFloat(lonParam);

		console.log('[PlaceDetails API] Attempting name search:', {
			name,
			lat,
			lon,
			googleConfigured: googlePlacesAdapter.isConfigured()
		});

		if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
			// Try Google Places search by name
			if (googlePlacesAdapter.isConfigured()) {
				try {
					details = await googlePlacesAdapter.getPlaceDetailsByNameAndLocation(name, lat, lon);
					console.log('[PlaceDetails API] Google result:', {
						found: !!details,
						hasHours: !!details?.openingHours
					});
				} catch (err) {
					if (err instanceof GooglePlacesError && err.code !== 'MISSING_API_KEY') {
						console.warn('Google Places name search failed:', err.message);
					}
				}
			} else {
				console.log('[PlaceDetails API] Google Places not configured, skipping');
			}
		}
	}

	// Fallback to Foursquare if we have a Foursquare ID
	if (!details && foursquarePlaceId) {
		console.log('[PlaceDetails API] Trying Foursquare fallback for:', foursquarePlaceId);
		try {
			// Extract FSQ ID from our prefixed format (e.g., "fsq-abc123" -> "abc123")
			const fsqId = foursquarePlaceId.startsWith('fsq-')
				? foursquarePlaceId.slice(4)
				: foursquarePlaceId;

			const fsqDetails = await getFoursquareDetails(fsqId);
			if (fsqDetails) {
				// Convert Foursquare details to our PlaceDetails format
				details = {
					placeId: foursquarePlaceId,
					name: fsqDetails.name,
					address: fsqDetails.location?.formatted_address,
					location: fsqDetails.latitude && fsqDetails.longitude ? {
						latitude: fsqDetails.latitude,
						longitude: fsqDetails.longitude
					} : undefined,
					openingHours: fsqDetails.hours ? convertFoursquareHours(fsqDetails.hours) : undefined,
					priceLevel: fsqDetails.price as (1 | 2 | 3 | 4) | undefined,
					rating: fsqDetails.rating ? fsqDetails.rating / 2 : undefined, // FSQ uses 0-10
					website: fsqDetails.website,
					phone: fsqDetails.tel,
					source: 'foursquare'
				};
			}
		} catch (err) {
			if (err instanceof FoursquareError && err.code !== 'MISSING_API_KEY') {
				console.warn('Foursquare fallback failed:', err.message);
			}
		}
	}

	// Return empty result if no details found
	if (!details) {
		return json(
			{ details: null, message: 'No place details found' },
			{ headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	return json(
		{ details },
		{ headers: rateLimit.getHeaders(ip, 'places') }
	);
};

/**
 * Convert Foursquare hours format to our OperatingHours format.
 */
function convertFoursquareHours(hours: {
	regular?: Array<{ day: number; open: string; close: string }>;
}): import('$lib/types/travel').OperatingHours | undefined {
	if (!hours.regular || hours.regular.length === 0) {
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

	const result: import('$lib/types/travel').OperatingHours = {};

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
