/**
 * Routing API endpoint.
 * GET /api/routing?fromLat=...&fromLon=...&toLat=...&toLon=...&mode=...
 */

import { json, error } from '@sveltejs/kit';
import { getRoute, getAllRoutes, type TravelMode } from '$lib/server/adapters/routing';
import { rateLimit } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';
import type { Location } from '$lib/types/travel';

const VALID_MODES: TravelMode[] = ['driving', 'walking', 'bicycling', 'transit'];

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	// Rate limiting
	const ip = rateLimit.getClientIp(request, getClientAddress);
	if (!rateLimit.check(ip, 'routing')) {
		const headers = rateLimit.getHeaders(ip, 'routing');
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		});
	}

	// Parse parameters
	const fromLat = parseFloat(url.searchParams.get('fromLat') ?? '');
	const fromLon = parseFloat(url.searchParams.get('fromLon') ?? '');
	const toLat = parseFloat(url.searchParams.get('toLat') ?? '');
	const toLon = parseFloat(url.searchParams.get('toLon') ?? '');
	const mode = url.searchParams.get('mode') as TravelMode | null;
	const all = url.searchParams.get('all') === 'true';

	// Validate required parameters
	if (isNaN(fromLat) || isNaN(fromLon)) {
		error(400, 'Missing or invalid fromLat/fromLon parameters');
	}

	if (isNaN(toLat) || isNaN(toLon)) {
		error(400, 'Missing or invalid toLat/toLon parameters');
	}

	// Build location objects
	const from: Location = {
		name: 'Origin',
		address: { street: '', city: '', country: '', formatted: '' },
		geo: { latitude: fromLat, longitude: fromLon }
	};

	const to: Location = {
		name: 'Destination',
		address: { street: '', city: '', country: '', formatted: '' },
		geo: { latitude: toLat, longitude: toLon }
	};

	try {
		// If 'all' is requested, return all travel modes
		if (all) {
			const routes = await getAllRoutes(from, to);
			return json(
				{ routes },
				{
					headers: rateLimit.getHeaders(ip, 'routing')
				}
			);
		}

		// Single mode request
		if (!mode || !VALID_MODES.includes(mode)) {
			error(400, `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}`);
		}

		const route = await getRoute(from, to, mode);

		return json(
			{ route },
			{
				headers: rateLimit.getHeaders(ip, 'routing')
			}
		);
	} catch (err) {
		console.error('Routing API error:', err);
		error(500, 'Failed to calculate route');
	}
};
