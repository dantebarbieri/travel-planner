/**
 * Client-side weather API service.
 * Calls the server's /api/weather endpoint with client-side caching.
 */

import type { Location, WeatherCondition } from '$lib/types/travel';
import { clientCache } from './clientCache';

/**
 * Generate a cache key for weather data.
 */
function weatherCacheKey(lat: number, lon: number, dates: string[]): string {
	const roundedLat = Math.round(lat * 100) / 100;
	const roundedLon = Math.round(lon * 100) / 100;
	return `weather:${roundedLat}:${roundedLon}:${dates.sort().join(',')}`;
}

/**
 * Determine appropriate cache type based on dates.
 */
function getCacheType(dates: string[]): 'WEATHER_FORECAST' | 'WEATHER_HISTORICAL' {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	
	// If any date is in the past, use shorter cache
	for (const date of dates) {
		const d = new Date(date);
		if (d < today) {
			return 'WEATHER_HISTORICAL';
		}
	}
	
	return 'WEATHER_FORECAST';
}

/**
 * Fetch weather data from the server API.
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

	const response = await fetch(`/api/weather?${params}`);

	if (!response.ok) {
		if (response.status === 429) {
			throw new Error('Rate limit exceeded. Please try again later.');
		}
		throw new Error(`Weather API error: ${response.status}`);
	}

	return response.json();
}

/**
 * Get weather conditions for a location and dates.
 * Uses client-side caching to reduce server calls.
 */
export async function getWeather(
	location: Location,
	dates: string[]
): Promise<WeatherCondition[]> {
	if (dates.length === 0) return [];

	const cacheKey = weatherCacheKey(location.geo.latitude, location.geo.longitude, dates);
	const cacheType = getCacheType(dates);

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
