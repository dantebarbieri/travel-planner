/**
 * Cities API endpoint.
 * GET /api/cities?q=...&limit=...
 *
 * Search for cities by name with autocomplete.
 */

import { json } from '@sveltejs/kit';
import { searchCities, GeoapifyError } from '$lib/server/adapters/geoapify';
import { createApiHandler } from '$lib/server/apiHelpers';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = createApiHandler('cities', 'CitiesAPI', 'Failed to search cities', async ({ url, headers }) => {
	const query = url.searchParams.get('q');
	const limitParam = url.searchParams.get('limit');

	if (!query) {
		return json(
			{ error: 'Missing required parameter: q' },
			{ status: 400, headers: headers() }
		);
	}

	if (query.length < 2) {
		return json(
			{ error: 'Query must be at least 2 characters' },
			{ status: 400, headers: headers() }
		);
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 10;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		return json(
			{ error: 'Limit must be a number between 1 and 50' },
			{ status: 400, headers: headers() }
		);
	}

	try {
		const results = await searchCities(query, limit);

		return json(
			{ results },
			{ headers: headers() }
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
				logger.error('CitiesAPI', 'Geoapify API key not configured');
				return json(
					{ error: 'City search service not configured' },
					{ status: 500, headers: headers() }
				);
			}

			logger.error('CitiesAPI', 'City search API error:', err.message);
			return json(
				{ error: 'City search service error' },
				{ status: 500, headers: headers() }
			);
		}

		throw err;
	}
});
