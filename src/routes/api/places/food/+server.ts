/**
 * Food Places API endpoint.
 * GET /api/places/food?lat=...&lon=...&query=...&limit=...
 *
 * Search for food venues (restaurants, cafes, bars, etc.) near a location.
 */

import { json } from '@sveltejs/kit';
import { searchFoodVenues, FoursquareError } from '$lib/server/adapters/foursquare';
import { searchFoodVenues as googleSearchFoodVenues, GooglePlacesError, isConfigured as isGoogleConfigured } from '$lib/server/adapters/googlePlaces';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';
import type { PlaceSource } from '$lib/types/travel';

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
	const priceLevelParam = url.searchParams.get('priceLevel');
	const source = (url.searchParams.get('source') || 'foursquare') as PlaceSource;

	// lat/lon required for Foursquare, optional for Google
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

	const radius = radiusParam ? parseInt(radiusParam, 10) : 5000;
	if (isNaN(radius) || radius < 100 || radius > 50000) {
		return json(
			{ error: 'Radius must be a number between 100 and 50000 (meters)' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}

	// Parse price level filter (comma-separated: "1,2,3")
	let priceLevel: number[] | undefined;
	if (priceLevelParam) {
		priceLevel = priceLevelParam.split(',').map(p => parseInt(p, 10)).filter(p => !isNaN(p) && p >= 1 && p <= 4);
		if (priceLevel.length === 0) {
			priceLevel = undefined;
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

			const venues = await googleSearchFoodVenues(lat, lon, {
				query,
				limit,
				radius
			});

			return json(
				{ venues },
				{ headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		// Default: Foursquare
		const venues = await searchFoodVenues(lat, lon, {
			query,
			limit,
			radius,
			priceLevel
		});

		return json(
			{ venues },
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
			console.error('Google Places food API error:', err.message);
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

			console.error('Food places API error:', err.message);
			return json(
				{ error: 'Places service error' },
				{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
			);
		}

		console.error('Food places API error:', err);
		return json(
			{ error: 'Failed to search food venues' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'places') }
		);
	}
};
