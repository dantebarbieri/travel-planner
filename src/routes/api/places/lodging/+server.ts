/**
 * Lodging Places API endpoint.
 * GET /api/places/lodging?query=...&limit=...&lat=...&lon=...
 *
 * Search for lodging (hotels, hostels, etc.) by query.
 * Query is required. Location (lat/lon) is optional for location-biased results.
 */

import { json } from '@sveltejs/kit';
import { searchLodging, FoursquareError } from '$lib/server/adapters/foursquare';
import { searchLodging as googleSearchLodging, GooglePlacesError, isConfigured as isGoogleConfigured } from '$lib/server/adapters/googlePlaces';
import { createApiHandler } from '$lib/server/apiHelpers';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';
import type { PlaceSource } from '$lib/types/travel';

export const GET: RequestHandler = createApiHandler('places', 'LodgingAPI', 'Failed to search lodging', async ({ url, headers }) => {
	// Parse required parameter
	const query = url.searchParams.get('query');

	if (!query) {
		return json(
			{ error: 'Missing required parameter: query' },
			{ status: 400, headers: headers() }
		);
	}

	if (query.length < 2) {
		return json(
			{ error: 'Query must be at least 2 characters' },
			{ status: 400, headers: headers() }
		);
	}

	// Parse optional parameters
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');
	const limitParam = url.searchParams.get('limit');
	const radiusParam = url.searchParams.get('radius');
	const near = url.searchParams.get('near') || undefined;
	const source = (url.searchParams.get('source') || 'foursquare') as PlaceSource;

	// Optional location for biased results
	let lat: number | undefined;
	let lon: number | undefined;

	if (latParam && lonParam) {
		lat = parseFloat(latParam);
		lon = parseFloat(lonParam);

		if (isNaN(lat) || isNaN(lon)) {
			return json(
				{ error: 'Invalid lat/lon parameters' },
				{ status: 400, headers: headers() }
			);
		}

		if (lat < -90 || lat > 90) {
			return json(
				{ error: 'Latitude must be between -90 and 90' },
				{ status: 400, headers: headers() }
			);
		}

		if (lon < -180 || lon > 180) {
			return json(
				{ error: 'Longitude must be between -180 and 180' },
				{ status: 400, headers: headers() }
			);
		}
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 20;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		return json(
			{ error: 'Limit must be a number between 1 and 50' },
			{ status: 400, headers: headers() }
		);
	}

	let radius: number | undefined;
	if (radiusParam) {
		radius = parseInt(radiusParam, 10);
		if (isNaN(radius) || radius < 100 || radius > 50000) {
			return json(
				{ error: 'Radius must be a number between 100 and 50000 (meters)' },
				{ status: 400, headers: headers() }
			);
		}
	}

	try {
		if (source === 'google') {
			if (!isGoogleConfigured()) {
				return json(
					{ error: 'Google Places API not configured' },
					{ status: 500, headers: headers() }
				);
			}

			const stays = await googleSearchLodging({
				query,
				limit,
				lat,
				lon,
				radius
			});

			return json(
				{ stays },
				{ headers: headers() }
			);
		}

		// Default: Foursquare
		const stays = await searchLodging({
			query,
			limit,
			lat,
			lon,
			radius,
			near
		});

		return json(
			{ stays },
			{ headers: headers() }
		);
	} catch (err) {
		if (err instanceof GooglePlacesError) {
			if (err.code === 'RATE_LIMITED') {
				return json(
					{ error: 'External API rate limit exceeded' },
					{ status: 503, headers: { 'Retry-After': '60', ...headers() } }
				);
			}
			logger.error('LodgingAPI', 'Google Places lodging API error:', err.message);
			return json(
				{ error: 'Google Places service error' },
				{ status: 500, headers: headers() }
			);
		}

		if (err instanceof FoursquareError) {
			if (err.code === 'RATE_LIMITED') {
				return json(
					{ error: 'External API rate limit exceeded' },
					{ status: 503, headers: { 'Retry-After': '60', ...headers() } }
				);
			}

			if (err.code === 'MISSING_API_KEY') {
				logger.error('LodgingAPI', 'Foursquare API key not configured');
				return json(
					{ error: 'Places service not configured' },
					{ status: 500, headers: headers() }
				);
			}

			logger.error('LodgingAPI', 'Lodging places API error:', err.message);
			return json(
				{ error: 'Places service error' },
				{ status: 500, headers: headers() }
			);
		}

		throw err;
	}
});
