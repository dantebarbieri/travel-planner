/**
 * Attractions Places API endpoint.
 * GET /api/places/attractions?lat=...&lon=...&query=...&limit=...
 *
 * Search for attractions (museums, landmarks, parks, etc.) near a location.
 */

import { json, error } from '@sveltejs/kit';
import { searchAttractions, FoursquareError } from '$lib/server/adapters/foursquare';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';
import type { ActivityCategory } from '$lib/types/travel';

const VALID_CATEGORIES: ActivityCategory[] = [
	'sightseeing', 'museum', 'tour', 'outdoor', 'entertainment',
	'shopping', 'wellness', 'nightlife', 'sports', 'other'
];

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

	// Parse required parameters
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');

	if (!latParam || !lonParam) {
		error(400, 'Missing required parameters: lat and lon');
	}

	const lat = parseFloat(latParam);
	const lon = parseFloat(lonParam);

	if (isNaN(lat) || isNaN(lon)) {
		error(400, 'Invalid lat/lon parameters');
	}

	if (lat < -90 || lat > 90) {
		error(400, 'Latitude must be between -90 and 90');
	}

	if (lon < -180 || lon > 180) {
		error(400, 'Longitude must be between -180 and 180');
	}

	// Parse optional parameters
	const query = url.searchParams.get('query') || undefined;
	const limitParam = url.searchParams.get('limit');
	const radiusParam = url.searchParams.get('radius');
	const categoriesParam = url.searchParams.get('categories');

	const limit = limitParam ? parseInt(limitParam, 10) : 20;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		error(400, 'Limit must be a number between 1 and 50');
	}

	const radius = radiusParam ? parseInt(radiusParam, 10) : 10000;
	if (isNaN(radius) || radius < 100 || radius > 50000) {
		error(400, 'Radius must be a number between 100 and 50000 (meters)');
	}

	// Parse category filter (comma-separated: "museum,outdoor")
	let categories: ActivityCategory[] | undefined;
	if (categoriesParam) {
		categories = categoriesParam.split(',')
			.map(c => c.trim() as ActivityCategory)
			.filter(c => VALID_CATEGORIES.includes(c));
		if (categories.length === 0) {
			categories = undefined;
		}
	}

	try {
		const activities = await searchAttractions(lat, lon, {
			query,
			limit,
			radius,
			categories
		});

		return json(
			{ activities },
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

			console.error('Attractions places API error:', err.message);
			error(500, 'Places service error');
		}

		console.error('Attractions places API error:', err);
		error(500, 'Failed to search attractions');
	}
};
