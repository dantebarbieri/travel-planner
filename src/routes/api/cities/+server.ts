/**
 * Cities API endpoint.
 * GET /api/cities?q=...&limit=...
 *
 * Search for cities by name with autocomplete.
 */

import { json, error } from '@sveltejs/kit';
import { searchCities, GeoapifyError } from '$lib/server/adapters/geoapify';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	// Rate limiting
	const ip = rateLimit.getClientIp(request, getClientAddress);
	if (!rateLimit.check(ip, 'cities')) {
		const headers = rateLimit.getHeaders(ip, 'cities');
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		});
	}

	const query = url.searchParams.get('q');
	const limitParam = url.searchParams.get('limit');

	if (!query) {
		error(400, 'Missing required parameter: q');
	}

	if (query.length < 2) {
		error(400, 'Query must be at least 2 characters');
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 10;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		error(400, 'Limit must be a number between 1 and 50');
	}

	try {
		const results = await searchCities(query, limit);

		return json(
			{ results },
			{ headers: rateLimit.getHeaders(ip, 'cities') }
		);
	} catch (err) {
		if (err instanceof GeoapifyError) {
			if (err.code === 'RATE_LIMITED') {
				return new Response(JSON.stringify({ error: 'External API rate limit exceeded' }), {
					status: 503,
					headers: {
						'Content-Type': 'application/json',
						'Retry-After': '60',
						...rateLimit.getHeaders(ip, 'cities')
					}
				});
			}

			if (err.code === 'MISSING_API_KEY') {
				console.error('Geoapify API key not configured');
				error(500, 'City search service not configured');
			}

			console.error('City search API error:', err.message);
			error(500, 'City search service error');
		}

		console.error('City search API error:', err);
		error(500, 'Failed to search cities');
	}
};
