/**
 * Routing API endpoint.
 * GET /api/routing?fromLat=...&fromLon=...&toLat=...&toLon=...&mode=...
 */

import { json } from '@sveltejs/kit';
import { getRoute, getAllRoutes, type TravelMode } from '$lib/server/adapters/routing';
import { createApiHandler } from '$lib/server/apiHelpers';
import type { RequestHandler } from './$types';
import type { Location } from '$lib/types/travel';

const VALID_MODES: TravelMode[] = ['driving', 'walking', 'bicycling', 'transit'];

export const GET: RequestHandler = createApiHandler('routing', 'RoutingAPI', 'Failed to calculate route', async ({ url, headers }) => {
	// Parse parameters
	const fromLat = parseFloat(url.searchParams.get('fromLat') ?? '');
	const fromLon = parseFloat(url.searchParams.get('fromLon') ?? '');
	const toLat = parseFloat(url.searchParams.get('toLat') ?? '');
	const toLon = parseFloat(url.searchParams.get('toLon') ?? '');
	const mode = url.searchParams.get('mode') as TravelMode | null;
	const all = url.searchParams.get('all') === 'true';

	// Validate required parameters
	if (isNaN(fromLat) || isNaN(fromLon)) {
		return json(
			{ error: 'Missing or invalid fromLat/fromLon parameters' },
			{ status: 400, headers: headers() }
		);
	}

	if (isNaN(toLat) || isNaN(toLon)) {
		return json(
			{ error: 'Missing or invalid toLat/toLon parameters' },
			{ status: 400, headers: headers() }
		);
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

	// If 'all' is requested, return all travel modes
	if (all) {
		const routes = await getAllRoutes(from, to);
		return json(
			{ routes },
			{ headers: headers() }
		);
	}

	// Single mode request
	if (!mode || !VALID_MODES.includes(mode)) {
		return json(
			{ error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` },
			{ status: 400, headers: headers() }
		);
	}

	const route = await getRoute(from, to, mode);

	return json(
		{ route },
		{ headers: headers() }
	);
});
