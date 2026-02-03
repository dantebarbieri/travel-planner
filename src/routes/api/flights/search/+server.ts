/**
 * Flight search API endpoint.
 * GET /api/flights/search?airline=...&flight=...&date=...
 * GET /api/flights/search?airline=...&flight=...&date=...&all=true (returns all matching flights)
 */

import { json } from '@sveltejs/kit';
import { searchFlight, searchAllFlights } from '$lib/server/adapters/flights';
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
	const airlineCode = url.searchParams.get('airline');
	const flightNumber = url.searchParams.get('flight');
	const date = url.searchParams.get('date');
	const all = url.searchParams.get('all') === 'true';

	// Validate required parameters
	if (!airlineCode) {
		return json(
			{ error: 'Missing airline parameter' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'flights') }
		);
	}

	if (!flightNumber) {
		return json(
			{ error: 'Missing flight parameter' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'flights') }
		);
	}

	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return json(
			{ error: 'Missing or invalid date parameter (expected YYYY-MM-DD format)' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'flights') }
		);
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
		return json(
			{ error: 'Failed to search for flight' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'flights') }
		);
	}
};
