/**
 * Weather API endpoint.
 * GET /api/weather?lat=...&lon=...&dates=...
 */

import { json, error } from '@sveltejs/kit';
import { getWeather } from '$lib/server/adapters/weather';
import { rateLimit } from '$lib/server/rateLimit';
import { isValidTimezone } from '$lib/utils/dates';
import type { RequestHandler } from './$types';
import type { Location } from '$lib/types/travel';

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	// Rate limiting
	const ip = getClientAddress();
	if (!rateLimit.check(ip, 'weather')) {
		const headers = rateLimit.getHeaders(ip, 'weather');
		return new Response(JSON.stringify({ error: 'Too many requests' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...headers
			}
		});
	}

	// Parse parameters
	const lat = parseFloat(url.searchParams.get('lat') ?? '');
	const lon = parseFloat(url.searchParams.get('lon') ?? '');
	const datesParam = url.searchParams.get('dates');
	const locationName = url.searchParams.get('name') ?? 'Unknown';
	const locationCity = url.searchParams.get('city') ?? '';
	const locationCountry = url.searchParams.get('country') ?? '';
	const timezone = url.searchParams.get('timezone');

	// Validate required parameters
	if (isNaN(lat) || isNaN(lon)) {
		error(400, 'Missing or invalid lat/lon parameters');
	}

	if (!datesParam) {
		error(400, 'Missing dates parameter');
	}

	const dates = datesParam.split(',').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
	if (dates.length === 0) {
		error(400, 'No valid dates provided (expected YYYY-MM-DD format)');
	}

	// Validate timezone if provided
	if (timezone && !isValidTimezone(timezone)) {
		error(400, `Invalid timezone: '${timezone}'. Expected IANA timezone name (e.g., 'America/New_York', 'Europe/London')`);
	}

	// Build location object
	const location: Location = {
		name: locationName,
		address: {
			street: '',
			city: locationCity,
			country: locationCountry,
			formatted: [locationCity, locationCountry].filter(Boolean).join(', ')
		},
		geo: {
			latitude: lat,
			longitude: lon
		},
		timezone: timezone ?? undefined
	};

	try {
		const weather = await getWeather(location, dates);
		
		return json(weather, {
			headers: rateLimit.getHeaders(ip, 'weather')
		});
	} catch (err) {
		console.error('Weather API error:', err);
		error(500, 'Failed to fetch weather data');
	}
};
