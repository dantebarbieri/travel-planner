/**
 * Airline search API endpoint.
 * GET /api/flights/airlines?query=...
 */

import { json } from '@sveltejs/kit';
import { searchAirlines } from '$lib/server/adapters/flights';
import { createApiHandler } from '$lib/server/apiHelpers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = createApiHandler('flights', 'AirlinesAPI', 'Failed to search airlines', async ({ url, headers }) => {
	// Parse parameters
	const query = url.searchParams.get('query');

	// Validate required parameters
	if (!query || query.length < 2) {
		return json(
			{ error: 'Query must be at least 2 characters' },
			{ status: 400, headers: headers() }
		);
	}

	const airlines = await searchAirlines(query);

	return json(
		{ airlines },
		{ headers: headers() }
	);
});
