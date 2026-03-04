/**
 * Flight search API endpoint.
 * GET /api/flights/search?airline=...&flight=...&date=...
 * GET /api/flights/search?airline=...&flight=...&date=...&all=true (returns all matching flights)
 */

import { json } from '@sveltejs/kit';
import { searchFlight, searchAllFlights } from '$lib/server/adapters/flights';
import { createApiHandler } from '$lib/server/apiHelpers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = createApiHandler('flights', 'FlightsAPI', 'Failed to search for flight', async ({ url, headers }) => {
	// Parse parameters
	const airlineCode = url.searchParams.get('airline');
	const flightNumber = url.searchParams.get('flight');
	const date = url.searchParams.get('date');
	const all = url.searchParams.get('all') === 'true';

	// Validate required parameters
	if (!airlineCode) {
		return json(
			{ error: 'Missing airline parameter' },
			{ status: 400, headers: headers() }
		);
	}

	if (!flightNumber) {
		return json(
			{ error: 'Missing flight parameter' },
			{ status: 400, headers: headers() }
		);
	}

	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return json(
			{ error: 'Missing or invalid date parameter (expected YYYY-MM-DD format)' },
			{ status: 400, headers: headers() }
		);
	}

	// If all=true, return all matching flights
	if (all) {
		const results = await searchAllFlights(airlineCode, flightNumber, date);

		return json(
			{ found: results.length > 0, flights: results },
			{ headers: headers() }
		);
	}

	// Default: return first matching flight
	const result = await searchFlight(airlineCode, flightNumber, date);

	if (!result) {
		return json(
			{ found: false, message: 'Flight not found' },
			{ status: 404, headers: headers() }
		);
	}

	return json(
		{ found: true, flight: result },
		{ headers: headers() }
	);
});
