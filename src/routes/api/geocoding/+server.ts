/**
 * Geocoding API endpoint.
 *
 * Forward geocode: GET /api/geocoding?address=...
 * Reverse geocode: GET /api/geocoding?lat=...&lon=...
 */

import { json, error } from '@sveltejs/kit';
import { geocodeAddress, reverseGeocode, GeoapifyError } from '$lib/server/adapters/geoapify';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	// Rate limiting
	const ip = rateLimit.getClientIp(request, getClientAddress);
	if (!rateLimit.check(ip, 'geocoding')) {
		const headers = rateLimit.getHeaders(ip, 'geocoding');
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		});
	}

	const address = url.searchParams.get('address');
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');

	try {
		// Forward geocoding: address -> coordinates
		if (address) {
			if (address.length < 3) {
				error(400, 'Address must be at least 3 characters');
			}

			const result = await geocodeAddress(address);

			if (!result) {
				return json(
					{ result: null, message: 'No results found' },
					{ headers: rateLimit.getHeaders(ip, 'geocoding') }
				);
			}

			return json(
				{ result },
				{ headers: rateLimit.getHeaders(ip, 'geocoding') }
			);
		}

		// Reverse geocoding: coordinates -> address
		if (lat && lon) {
			const latitude = parseFloat(lat);
			const longitude = parseFloat(lon);

			if (isNaN(latitude) || isNaN(longitude)) {
				error(400, 'Invalid lat/lon parameters');
			}

			if (latitude < -90 || latitude > 90) {
				error(400, 'Latitude must be between -90 and 90');
			}

			if (longitude < -180 || longitude > 180) {
				error(400, 'Longitude must be between -180 and 180');
			}

			const location = await reverseGeocode(latitude, longitude);

			if (!location) {
				return json(
					{ location: null, message: 'No results found' },
					{ headers: rateLimit.getHeaders(ip, 'geocoding') }
				);
			}

			return json(
				{ location },
				{ headers: rateLimit.getHeaders(ip, 'geocoding') }
			);
		}

		error(400, 'Missing required parameters. Provide either "address" or "lat" and "lon"');
	} catch (err) {
		if (err instanceof GeoapifyError) {
			if (err.code === 'RATE_LIMITED') {
				return new Response(JSON.stringify({ error: 'External API rate limit exceeded' }), {
					status: 503,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': '60',
						...rateLimit.getHeaders(ip, 'geocoding')
					}
				});
			}

			if (err.code === 'MISSING_API_KEY') {
				console.error('Geoapify API key not configured');
				error(500, 'Geocoding service not configured');
			}

			console.error('Geocoding API error:', err.message);
			error(500, 'Geocoding service error');
		}

		console.error('Geocoding API error:', err);
		error(500, 'Failed to process geocoding request');
	}
};
