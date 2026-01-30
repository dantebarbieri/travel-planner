/**
 * Client-side weather API service.
 * Calls the server's /api/weather endpoint with client-side caching
 * and retry logic for rate limit errors.
 */

import type { Location, WeatherCondition } from '$lib/types/travel';
import { clientCache } from './clientCache';
import { retryWithBackoff, HttpError, parseRetryAfter } from '$lib/utils/retry';

/**
 * Generate a cache key for weather data.
 */
function weatherCacheKey(lat: number, lon: number, dates: string[]): string {
	const roundedLat = Math.round(lat * 100) / 100;
	const roundedLon = Math.round(lon * 100) / 100;
	const sortedDates = [...dates].sort();
	return `weather:${roundedLat}:${roundedLon}:${sortedDates.length}:${sortedDates.join(',')}`;
}

/**
 * Determine appropriate cache type based on dates and timezone.
 */
function getCacheType(dates: string[], timezone?: string): 'WEATHER_FORECAST' | 'WEATHER_HISTORICAL' {
	// Get today in the destination timezone
	let todayStr: string;
	if (timezone) {
		try {
			const formatter = new Intl.DateTimeFormat('en-CA', {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			});
			todayStr = formatter.format(new Date());
		} catch {
			todayStr = new Date().toISOString().split('T')[0];
		}
	} else {
		todayStr = new Date().toISOString().split('T')[0];
	}
	
	// If any date is in the past, use historical cache
	for (const date of dates) {
		if (date < todayStr) {
			return 'WEATHER_HISTORICAL';
		}
	}
	
	return 'WEATHER_FORECAST';
}

/**
 * Fetch weather data from the server API with retry logic.
 */
async function fetchWeatherFromServer(
	location: Location,
	dates: string[]
): Promise<WeatherCondition[]> {
	const params = new URLSearchParams({
		lat: location.geo.latitude.toString(),
		lon: location.geo.longitude.toString(),
		dates: dates.join(','),
		name: location.name,
		city: location.address.city,
		country: location.address.country
	});

	if (location.timezone) {
		params.set('timezone', location.timezone);
	}

	const url = `/api/weather?${params}`;

	return retryWithBackoff(
		async () => {
			const response = await fetch(url);

			if (!response.ok) {
				if (response.status === 429) {
					const retryAfterHeader = response.headers.get('Retry-After');
					const retryAfterMs = parseRetryAfter(retryAfterHeader) ?? undefined;
					throw new HttpError(429, 'Rate limit exceeded', retryAfterMs);
				}
				throw new HttpError(response.status, `Weather API error: ${response.status}`);
			}

			return response.json();
		},
		{
			maxAttempts: 4,
			initialDelayMs: 1000,
			maxDelayMs: 8000,
			onRetry: (attempt, delayMs) => {
				console.log(`[WeatherAPI] Retry ${attempt} for ${location.address.city}, waiting ${delayMs}ms...`);
			}
		}
	);
}

/**
 * Get weather conditions for a location and dates.
 * Uses client-side caching to reduce server calls.
 * Includes retry logic for rate limit errors.
 */
export async function getWeather(
	location: Location,
	dates: string[]
): Promise<WeatherCondition[]> {
	if (dates.length === 0) return [];

	const cacheKey = weatherCacheKey(location.geo.latitude, location.geo.longitude, dates);
	const cacheType = getCacheType(dates, location.timezone);

	return clientCache.dedupeRequest(
		cacheKey,
		() => fetchWeatherFromServer(location, dates),
		cacheType
	);
}

/**
 * Get weather for multiple dates, batching into a single request.
 * More efficient than calling getWeather for each date separately.
 */
export async function getWeatherBatch(
	location: Location,
	dates: string[]
): Promise<Map<string, WeatherCondition>> {
	if (dates.length === 0) return new Map();

	const results = await getWeather(location, dates);
	const map = new Map<string, WeatherCondition>();

	for (const condition of results) {
		map.set(condition.date, condition);
	}

	return map;
}

/**
 * Clear weather cache (useful when user changes settings).
 */
export function clearWeatherCache(): void {
	// Client cache doesn't support selective clearing by prefix,
	// but we can clear everything - it's just a session cache
	clientCache.clear();
}

// Export as a weather API object for easier migration
export const weatherApi = {
	getWeather,
	getWeatherBatch,
	clearCache: clearWeatherCache
};
