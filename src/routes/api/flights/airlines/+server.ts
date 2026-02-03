/**
 * Airline search API endpoint.
 * GET /api/flights/airlines?query=...
 */

import { json } from '@sveltejs/kit';
import { searchAirlines } from '$lib/server/adapters/flights';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	// Rate limiting
	const ip = rateLimit.getClientIp(request, getClientAddress);
	if (!rateLimit.check(ip, 'flights')) {
		const headers = rateLimit.getHeaders(ip, 'flights');
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		});
	}

	// Parse parameters
	const query = url.searchParams.get('query');

	// Validate required parameters
	if (!query || query.length < 2) {
		return json(
			{ error: 'Query must be at least 2 characters' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'flights') }
		);
	}

	try {
		const airlines = await searchAirlines(query);

		return json(
			{ airlines },
			{
				headers: rateLimit.getHeaders(ip, 'flights')
			}
		);
	} catch (err) {
		console.error('Airline search error:', err);
		return json(
			{ error: 'Failed to search airlines' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'flights') }
		);
	}
};
