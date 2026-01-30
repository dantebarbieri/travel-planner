/**
 * Flight search API endpoint.
 * GET /api/flights/search?airline=...&flight=...&date=...
 * GET /api/flights/search?airline=...&flight=...&date=...&all=true (returns all matching flights)
 */

import { json, error } from '@sveltejs/kit';
import { searchFlight, searchAllFlights } from '$lib/server/adapters/flights';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// Rate limiting
	const ip = getClientAddress();
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
	const airlineCode = url.searchParams.get('airline');
	const flightNumber = url.searchParams.get('flight');
	const date = url.searchParams.get('date');
	const all = url.searchParams.get('all') === 'true';

	// Validate required parameters
	if (!airlineCode) {
		error(400, 'Missing airline parameter');
	}

	if (!flightNumber) {
		error(400, 'Missing flight parameter');
	}

	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		error(400, 'Missing or invalid date parameter (expected YYYY-MM-DD format)');
	}

	try {
		// If all=true, return all matching flights
		if (all) {
			const results = await searchAllFlights(airlineCode, flightNumber, date);
			
			return json(
				{ found: results.length > 0, flights: results },
				{
					headers: rateLimit.getHeaders(ip, 'flights')
				}
			);
		}
		
		// Default: return first matching flight
		const result = await searchFlight(airlineCode, flightNumber, date);

		if (!result) {
			return json(
				{ found: false, message: 'Flight not found' },
				{
					status: 404,
					headers: rateLimit.getHeaders(ip, 'flights')
				}
			);
		}

		return json(
			{ found: true, flight: result },
			{
				headers: rateLimit.getHeaders(ip, 'flights')
			}
		);
	} catch (err) {
		console.error('Flight search error:', err);
		error(500, 'Failed to search for flight');
	}
};
