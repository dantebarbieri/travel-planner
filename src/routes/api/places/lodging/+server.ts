/**
 * Lodging Places API endpoint.
 * GET /api/places/lodging?query=...&limit=...&lat=...&lon=...
 *
 * Search for lodging (hotels, hostels, etc.) by query.
 * Query is required. Location (lat/lon) is optional for location-biased results.
 */

import { json, error } from '@sveltejs/kit';
import { searchLodging, FoursquareError } from '$lib/server/adapters/foursquare';
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

	// Parse required parameter
	const query = url.searchParams.get('query');

	if (!query) {
		error(400, 'Missing required parameter: query');
	}

	if (query.length < 2) {
		error(400, 'Query must be at least 2 characters');
	}

	// Parse optional parameters
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');
	const limitParam = url.searchParams.get('limit');
	const radiusParam = url.searchParams.get('radius');

	// Optional location for biased results
	let lat: number | undefined;
	let lon: number | undefined;

	if (latParam && lonParam) {
		lat = parseFloat(latParam);
		lon = parseFloat(lonParam);

		if (isNaN(lat) || isNaN(lon)) {
			error(400, 'Invalid lat/lon parameters');
		}

		if (lat < -90 || lat > 90) {
			error(400, 'Latitude must be between -90 and 90');
		}

		if (lon < -180 || lon > 180) {
			error(400, 'Longitude must be between -180 and 180');
		}
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 20;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		error(400, 'Limit must be a number between 1 and 50');
	}

	let radius: number | undefined;
	if (radiusParam) {
		radius = parseInt(radiusParam, 10);
		if (isNaN(radius) || radius < 100 || radius > 50000) {
			error(400, 'Radius must be a number between 100 and 50000 (meters)');
		}
	}

	try {
		const stays = await searchLodging({
			query,
			limit,
			lat,
			lon,
			radius
		});

		return json(
			{ stays },
			{ headers: rateLimit.getHeaders(ip, 'places') }
		);
	} catch (err) {
		if (err instanceof FoursquareError) {
			if (err.code === 'RATE_LIMITED') {
				return new Response(JSON.stringify({ error: 'External API rate limit exceeded' }), {
					status: 503,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': '60',
						...rateLimit.getHeaders(ip, 'places')
					}
				});
			}

			if (err.code === 'MISSING_API_KEY') {
				console.error('Foursquare API key not configured');
				error(500, 'Places service not configured');
			}

			console.error('Lodging places API error:', err.message);
			error(500, 'Places service error');
		}

		console.error('Lodging places API error:', err);
		error(500, 'Failed to search lodging');
	}
};
