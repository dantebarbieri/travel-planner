/**
 * Cities API endpoint.
 * GET /api/cities?q=...&limit=...
 *
 * Search for cities by name with autocomplete.
 */

import { json } from '@sveltejs/kit';
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
		return json(
			{ error: 'Missing required parameter: q' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'cities') }
		);
	}

	if (query.length < 2) {
		return json(
			{ error: 'Query must be at least 2 characters' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'cities') }
		);
	}

	const limit = limitParam ? parseInt(limitParam, 10) : 10;
	if (isNaN(limit) || limit < 1 || limit > 50) {
		return json(
			{ error: 'Limit must be a number between 1 and 50' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'cities') }
		);
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
				return json(
					{ error: 'City search service not configured' },
					{ status: 500, headers: rateLimit.getHeaders(ip, 'cities') }
				);
			}

			console.error('City search API error:', err.message);
			return json(
				{ error: 'City search service error' },
				{ status: 500, headers: rateLimit.getHeaders(ip, 'cities') }
			);
		}

		console.error('City search API error:', err);
		return json(
			{ error: 'Failed to search cities' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'cities') }
		);
	}
};
