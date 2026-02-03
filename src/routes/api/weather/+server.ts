/**
 * Weather API endpoint.
 * GET /api/weather?lat=...&lon=...&dates=...
 */

import { json } from '@sveltejs/kit';
import { getWeather } from '$lib/server/adapters/weather';
import { rateLimit } from '$lib/server/rateLimit';
import { isValidTimezone } from '$lib/utils/dates';
import type { RequestHandler } from './$types';
import type { Location } from '$lib/types/travel';

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	// Rate limiting
	const ip = rateLimit.getClientIp(request, getClientAddress);
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
		return json(
			{ error: 'Missing or invalid lat/lon parameters' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'weather') }
		);
	}

	if (!datesParam) {
		return json(
			{ error: 'Missing dates parameter' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'weather') }
		);
	}

	const dates = datesParam.split(',').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
	if (dates.length === 0) {
		return json(
			{ error: 'No valid dates provided (expected YYYY-MM-DD format)' },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'weather') }
		);
	}

	// Validate timezone if provided
	if (timezone && !isValidTimezone(timezone)) {
		return json(
			{ error: `Invalid timezone: '${timezone}'. Expected IANA timezone name (e.g., 'America/New_York', 'Europe/London')` },
			{ status: 400, headers: rateLimit.getHeaders(ip, 'weather') }
		);
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
		return json(
			{ error: 'Failed to fetch weather data' },
			{ status: 500, headers: rateLimit.getHeaders(ip, 'weather') }
		);
	}
};
