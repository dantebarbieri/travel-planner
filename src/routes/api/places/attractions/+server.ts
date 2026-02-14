/**
 * Attractions Places API endpoint.
 * GET /api/places/attractions?lat=...&lon=...&query=...&limit=...
 *
 * Search for attractions (museums, landmarks, parks, etc.) near a location.
 */

import { json } from '@sveltejs/kit';
import { searchAttractions, FoursquareError } from '$lib/server/adapters/foursquare';
import { searchAttractions as googleSearchAttractions, GooglePlacesError, isConfigured as isGoogleConfigured } from '$lib/server/adapters/googlePlaces';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';
import type { ActivityCategory, PlaceSource } from '$lib/types/travel';

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

	// Parse parameters - lat/lon required for Foursquare, optional for Google
	const latParam = url.searchParams.get('lat');
	const lonParam = url.searchParams.get('lon');

	// Parse source early so we can adjust validation
	const query = url.searchParams.get('query') || undefined;
	const limitParam = url.searchParams.get('limit');
	const radiusParam = url.searchParams.get('radius');
	const categoriesParam = url.searchParams.get('categories');
	const source = (url.searchParams.get('source') || 'foursquare') as PlaceSource;

	if (source !== 'google' && (!latParam || !lonParam)) {
		return json(
			{ error: 'Missing required parameters: lat and lon' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	const lat = latParam ? parseFloat(latParam) : 0;
	const lon = lonParam ? parseFloat(lonParam) : 0;

	if ((latParam || lonParam) && (isNaN(lat) || isNaN(lon))) {
		return json(
			{ error: 'Invalid lat/lon parameters' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	if (latParam && (lat < -90 || lat > 90)) {
		return json(
			{ error: 'Latitude must be between -90 and 90' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	if (lonParam && (lon < -180 || lon > 180)) {
		return json(
			{ error: 'Longitude must be between -180 and 180' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 20;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		return json(
			{ error: 'Limit must be a number between 1 and 50' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	const radius = radiusParam ? parseInt(radiusParam, 10) : 10000;
	if (isNaN(radius) || radius < 100 || radius > 50000) {
		return json(
			{ error: 'Radius must be a number between 100 and 50000 (meters)' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
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
		if (source === 'google') {
			if (!isGoogleConfigured()) {
				return json(
					{ error: 'Google Places API not configured' },
					{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
				);
			}

			const activities = await googleSearchAttractions(lat, lon, {
				query,
				limit,
				radius,
				categories
			});

			return json(
				{ activities },
				{ headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		// Default: Foursquare
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
		if (err instanceof GooglePlacesError) {
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
			console.error('Google Places attractions API error:', err.message);
			return json(
				{ error: 'Google Places service error' },
				{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

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

			console.error('Attractions places API error:', err.message);
			return json(
				{ error: 'Places service error' },
				{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		console.error('Attractions places API error:', err);
		return json(
			{ error: 'Failed to search attractions' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}
};
