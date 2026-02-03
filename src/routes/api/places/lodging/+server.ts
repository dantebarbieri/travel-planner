/**
 * Lodging Places API endpoint.
 * GET /api/places/lodging?query=...&limit=...&lat=...&lon=...
 *
 * Search for lodging (hotels, hostels, etc.) by query.
 * Query is required. Location (lat/lon) is optional for location-biased results.
 */

import { json } from '@sveltejs/kit';
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
		return json(
			{ error: 'Missing required parameter: query' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	if (query.length < 2) {
		return json(
			{ error: 'Query must be at least 2 characters' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	// Parse optional parameters
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');
	const limitParam = url.searchParams.get('limit');
	const radiusParam = url.searchParams.get('radius');
	const near = url.searchParams.get('near') || undefined;

	// Optional location for biased results
	let lat: number | undefined;
	let lon: number | undefined;

	if (latParam && lonParam) {
		lat = parseFloat(latParam);
		lon = parseFloat(lonParam);

		if (isNaN(lat) || isNaN(lon)) {
			return json(
				{ error: 'Invalid lat/lon parameters' },
				{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		if (lat < -90 || lat > 90) {
			return json(
				{ error: 'Latitude must be between -90 and 90' },
				{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		if (lon < -180 || lon > 180) {
			return json(
				{ error: 'Longitude must be between -180 and 180' },
				{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 20;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		return json(
			{ error: 'Limit must be a number between 1 and 50' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	let radius: number | undefined;
	if (radiusParam) {
		radius = parseInt(radiusParam, 10);
		if (isNaN(radius) || radius < 100 || radius > 50000) {
			return json(
				{ error: 'Radius must be a number between 100 and 50000 (meters)' },
				{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}
	}

	try {
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
				return json(
					{ error: 'Places service not configured' },
					{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
				);
			}

			console.error('Lodging places API error:', err.message);
			return json(
				{ error: 'Places service error' },
				{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		console.error('Lodging places API error:', err);
		return json(
			{ error: 'Failed to search lodging' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}
};
