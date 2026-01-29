import type { WeatherCondition } from '$lib/types/travel';
import { CACHE_CONFIG, type CacheEntry, type CacheType } from './types';

/**
 * Round coordinates to 2 decimal places for cache key consistency.
 */
function roundCoord(coord: number): number {
	return Math.round(coord * 100) / 100;
}

/**
 * Generate a cache key for weather data.
 */
function getCacheKey(lat: number, lon: number, date: string, type: CacheType): string {
	return `${CACHE_CONFIG.CACHE_PREFIX}:${type}:${roundCoord(lat)}:${roundCoord(lon)}:${date}`;
}

/**
 * Get TTL for a cache type.
 */
function getTtl(type: CacheType): number {
	switch (type) {
		case 'forecast':
			return CACHE_CONFIG.FORECAST_TTL_MS;
		case 'historical':
			return CACHE_CONFIG.HISTORICAL_TTL_MS;
		case 'prediction':
			return CACHE_CONFIG.PREDICTION_TTL_MS;
	}
}

/**
 * Check if a cache entry is expired.
 */
function isExpired(entry: CacheEntry): boolean {
	const ttl = getTtl(entry.type);
	return Date.now() - entry.cachedAt > ttl;
}

/**
 * Get a cached weather condition.
 */
export function getFromCache(
	lat: number,
	lon: number,
	date: string,
	type: CacheType
): WeatherCondition | null {
	if (typeof localStorage === 'undefined') return null;

	const key = getCacheKey(lat, lon, date, type);

	try {
		const stored = localStorage.getItem(key);
		if (!stored) return null;

		const entry: CacheEntry = JSON.parse(stored);

		if (isExpired(entry)) {
			localStorage.removeItem(key);
			return null;
		}

		return entry.data;
	} catch {
		return null;
	}
}

/**
 * Store a weather condition in cache.
 */
export function setInCache(
	lat: number,
	lon: number,
	date: string,
	type: CacheType,
	data: WeatherCondition
): void {
	if (typeof localStorage === 'undefined') return;

	const key = getCacheKey(lat, lon, date, type);
	const entry: CacheEntry = {
		data,
		cachedAt: Date.now(),
		type
	};

	try {
		localStorage.setItem(key, JSON.stringify(entry));
	} catch (e) {
		// localStorage might be full - try targeted cleanup and retry
		if (e instanceof DOMException && e.name === 'QuotaExceededError') {
			cleanupOldestEntries(10); // Remove oldest 10 entries
			try {
				localStorage.setItem(key, JSON.stringify(entry));
			} catch {
				console.warn('Unable to cache weather data - localStorage full');
			}
		}
	}
}

/**
 * Store multiple weather conditions in cache.
 */
export function setManyInCache(
	lat: number,
	lon: number,
	type: CacheType,
	conditions: WeatherCondition[]
): void {
	for (const condition of conditions) {
		setInCache(lat, lon, condition.date, type, condition);
	}
}

/**
 * Get multiple weather conditions from cache.
 * Returns a map of date -> WeatherCondition for found entries.
 */
export function getManyFromCache(
	lat: number,
	lon: number,
	dates: string[],
	type: CacheType
): Map<string, WeatherCondition> {
	const result = new Map<string, WeatherCondition>();

	for (const date of dates) {
		const cached = getFromCache(lat, lon, date, type);
		if (cached) {
			result.set(date, cached);
		}
	}

	return result;
}

/**
 * Clean up expired cache entries.
 * Should be called on app startup.
 */
export function cleanupCache(): void {
	if (typeof localStorage === 'undefined') return;

	const keysToRemove: string[] = [];

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key?.startsWith(CACHE_CONFIG.CACHE_PREFIX + ':')) continue;

		try {
			const stored = localStorage.getItem(key);
			if (!stored) continue;

			const entry: CacheEntry = JSON.parse(stored);
			if (isExpired(entry)) {
				keysToRemove.push(key);
			}
		} catch {
			// Invalid entry - remove it
			keysToRemove.push(key);
		}
	}

	for (const key of keysToRemove) {
		localStorage.removeItem(key);
	}

	if (keysToRemove.length > 0) {
		console.debug(`Weather cache cleanup: removed ${keysToRemove.length} expired entries`);
	}
}

/**
 * Remove the oldest N cache entries to free up space.
 * Used when localStorage is full (QuotaExceededError).
 */
function cleanupOldestEntries(count: number): void {
	if (typeof localStorage === 'undefined') return;

	const entries: { key: string; cachedAt: number }[] = [];

	// Collect all weather cache entries with their timestamps
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key?.startsWith(CACHE_CONFIG.CACHE_PREFIX + ':')) continue;

		try {
			const stored = localStorage.getItem(key);
			if (!stored) continue;

			const entry: CacheEntry = JSON.parse(stored);
			entries.push({ key, cachedAt: entry.cachedAt });
		} catch {
			// Invalid entry - will be removed
			entries.push({ key, cachedAt: 0 });
		}
	}

	// Sort by age (oldest first) and remove the oldest N
	entries.sort((a, b) => a.cachedAt - b.cachedAt);
	const toRemove = entries.slice(0, count);

	for (const { key } of toRemove) {
		localStorage.removeItem(key);
	}

	if (toRemove.length > 0) {
		console.debug(`Weather cache: removed ${toRemove.length} oldest entries`);
	}
}

/**
 * Clear all weather cache entries.
 */
export function clearCache(): void {
	if (typeof localStorage === 'undefined') return;

	const keysToRemove: string[] = [];

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith(CACHE_CONFIG.CACHE_PREFIX + ':')) {
			keysToRemove.push(key);
		}
	}

	for (const key of keysToRemove) {
		localStorage.removeItem(key);
	}
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats(): { total: number; forecast: number; historical: number; prediction: number } {
	if (typeof localStorage === 'undefined') {
		return { total: 0, forecast: 0, historical: 0, prediction: 0 };
	}

	const stats = { total: 0, forecast: 0, historical: 0, prediction: 0 };

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key?.startsWith(CACHE_CONFIG.CACHE_PREFIX + ':')) continue;

		stats.total++;
		if (key.includes(':forecast:')) stats.forecast++;
		else if (key.includes(':historical:')) stats.historical++;
		else if (key.includes(':prediction:')) stats.prediction++;
	}

	return stats;
}

export const weatherCache = {
	get: getFromCache,
	set: setInCache,
	getMany: getManyFromCache,
	setMany: setManyInCache,
	cleanup: cleanupCache,
	clear: clearCache,
	getStats: getCacheStats
};
