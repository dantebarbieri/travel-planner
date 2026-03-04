/**
 * Geocoding API endpoint.
 *
 * Forward geocode: GET /api/geocoding?address=...
 * Reverse geocode: GET /api/geocoding?lat=...&lon=...
 */

import { json } from '@sveltejs/kit';
import { geocodeAddress, reverseGeocode, GeoapifyError } from '$lib/server/adapters/geoapify';
import { createApiHandler } from '$lib/server/apiHelpers';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = createApiHandler('geocoding', 'GeocodingAPI', 'Failed to process geocoding request', async ({ url, headers }) => {
	const address = url.searchParams.get('address');
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');

	try {
		// Forward geocoding: address -> coordinates
		if (address) {
			if (address.length < 3) {
				return json(
					{ error: 'Address must be at least 3 characters' },
					{ status: 400, headers: headers() }
				);
			}

			const result = await geocodeAddress(address);

			if (!result) {
				return json(
					{ result: null, message: 'No results found' },
					{ headers: headers() }
				);
			}

			return json(
				{ result },
				{ headers: headers() }
			);
		}

		// Reverse geocoding: coordinates -> address
		if (lat && lon) {
			const latitude = parseFloat(lat);
			const longitude = parseFloat(lon);

			if (isNaN(latitude) || isNaN(longitude)) {
				return json(
					{ error: 'Invalid lat/lon parameters' },
					{ status: 400, headers: headers() }
				);
			}

			if (latitude < -90 || latitude > 90) {
				return json(
					{ error: 'Latitude must be between -90 and 90' },
					{ status: 400, headers: headers() }
				);
			}

			if (longitude < -180 || longitude > 180) {
				return json(
					{ error: 'Longitude must be between -180 and 180' },
					{ status: 400, headers: headers() }
				);
			}

			const location = await reverseGeocode(latitude, longitude);

			if (!location) {
				return json(
					{ location: null, message: 'No results found' },
					{ headers: headers() }
				);
			}

			return json(
				{ location },
				{ headers: headers() }
			);
		}

		return json(
			{ error: 'Missing required parameters. Provide either "address" or "lat" and "lon"' },
			{ status: 400, headers: headers() }
		);
	} catch (err) {
		if (err instanceof GeoapifyError) {
			if (err.code === 'RATE_LIMITED') {
				return json(
					{ error: 'External API rate limit exceeded' },
					{ status: 503, headers: { 'Retry-After': '60', ...headers() } }
				);
			}

			if (err.code === 'MISSING_API_KEY') {
				logger.error('GeocodingAPI', 'Geoapify API key not configured');
				return json(
					{ error: 'Geocoding service not configured' },
					{ status: 500, headers: headers() }
				);
			}

			logger.error('GeocodingAPI', 'Geocoding API error:', err.message);
			return json(
				{ error: 'Geocoding service error' },
				{ status: 500, headers: headers() }
			);
		}

		throw err;
	}
});
