/**
 * Server-side weather adapter using Open-Meteo API.
 * Handles caching and rate limiting server-side.
 * 
 * This is a server-only module ($lib/server/).
 */

import type { Location, WeatherCondition, WeatherConditionType } from '$lib/types/travel';
import { cache, weatherCacheKey, type CacheType } from '$lib/server/db/cache';

// API endpoints
const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_API_URL = 'https://archive-api.open-meteo.com/v1/archive';

// Configuration
const FORECAST_MAX_DAYS = 16;
const HISTORICAL_YEARS_FOR_PREDICTION = 3;

// WMO weather code mapping
const WMO_CODE_MAP: Record<number, WeatherConditionType> = {
	0: 'clear',
	1: 'clear',
	2: 'partly_cloudy',
	3: 'overcast',
	45: 'fog',
	48: 'fog',
	51: 'drizzle',
	53: 'drizzle',
	55: 'drizzle',
	56: 'drizzle',
	57: 'drizzle',
	61: 'rain',
	63: 'rain',
	65: 'rain',
	66: 'rain',
	67: 'rain',
	71: 'snow',
	73: 'snow',
	75: 'snow',
	77: 'snow',
	80: 'rain',
	81: 'rain',
	82: 'rain',
	85: 'snow',
	86: 'snow',
	95: 'storm',
	96: 'storm',
	99: 'storm'
};

function mapWmoCodeToCondition(code: number): WeatherConditionType {
	return WMO_CODE_MAP[code] ?? 'partly_cloudy';
}

function roundCoord(coord: number): number {
	return Math.round(coord * 100) / 100;
}

function fahrenheitToCelsius(f: number): number {
	return Math.round(((f - 32) * 5) / 9);
}

function extractTime(isoDateTime: string): string {
	const match = isoDateTime.match(/T(\d{2}:\d{2})/);
	return match ? match[1] : '06:00';
}

interface OpenMeteoForecastResponse {
	daily: {
		time: string[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
		weathercode: number[];
		precipitation_probability_max: number[];
		windspeed_10m_max: number[];
		relative_humidity_2m_max: number[];
		uv_index_max: number[];
		sunrise: string[];
		sunset: string[];
	};
}

interface OpenMeteoHistoricalResponse {
	daily: {
		time: string[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
		weathercode: number[];
		precipitation_sum: number[];
		windspeed_10m_max: number[];
		relative_humidity_2m_mean: number[];
	};
}

type DateCategory = 'past' | 'forecast' | 'future';

function classifyDate(date: string): DateCategory {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return 'future';
	}

	const [year, month, day] = date.split('-').map(Number);
	const targetDate = new Date(year, month - 1, day);
	targetDate.setHours(0, 0, 0, 0);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return 'past';
	if (diffDays < FORECAST_MAX_DAYS) return 'forecast';
	return 'future';
}

function groupDatesByCategory(dates: string[]): Record<DateCategory, string[]> {
	const groups: Record<DateCategory, string[]> = { past: [], forecast: [], future: [] };
	for (const date of dates) {
		groups[classifyDate(date)].push(date);
	}
	for (const category of Object.keys(groups) as DateCategory[]) {
		groups[category].sort();
	}
	return groups;
}

async function fetchForecast(location: Location): Promise<WeatherCondition[]> {
	const lat = roundCoord(location.geo.latitude);
	const lon = roundCoord(location.geo.longitude);

	const params = new URLSearchParams({
		latitude: lat.toString(),
		longitude: lon.toString(),
		daily: [
			'temperature_2m_max', 'temperature_2m_min', 'weathercode',
			'precipitation_probability_max', 'windspeed_10m_max',
			'relative_humidity_2m_max', 'uv_index_max', 'sunrise', 'sunset'
		].join(','),
		timezone: 'auto',
		forecast_days: FORECAST_MAX_DAYS.toString(),
		temperature_unit: 'fahrenheit'
	});

	const response = await fetch(`${FORECAST_API_URL}?${params}`);
	if (!response.ok) {
		throw new Error(`Open-Meteo forecast API error: ${response.status}`);
	}

	const data: OpenMeteoForecastResponse = await response.json();
	const conditions: WeatherCondition[] = [];

	for (let i = 0; i < data.daily.time.length; i++) {
		if (!Number.isFinite(data.daily.temperature_2m_max[i])) continue;
		if (!Number.isFinite(data.daily.weathercode[i])) continue;

		conditions.push({
			date: data.daily.time[i],
			location,
			tempHigh: fahrenheitToCelsius(data.daily.temperature_2m_max[i]),
			tempLow: fahrenheitToCelsius(data.daily.temperature_2m_min[i]),
			condition: mapWmoCodeToCondition(data.daily.weathercode[i]),
			precipitation: data.daily.precipitation_probability_max[i] ?? 0,
			humidity: data.daily.relative_humidity_2m_max[i] ?? 50,
			windSpeed: Math.round(data.daily.windspeed_10m_max[i] ?? 0),
			uvIndex: Math.round(data.daily.uv_index_max[i] ?? 0),
			sunrise: extractTime(data.daily.sunrise[i] ?? ''),
			sunset: extractTime(data.daily.sunset[i] ?? ''),
			isHistorical: false,
			isEstimate: false
		});
	}

	return conditions;
}

async function fetchHistorical(location: Location, startDate: string, endDate: string): Promise<WeatherCondition[]> {
	const lat = roundCoord(location.geo.latitude);
	const lon = roundCoord(location.geo.longitude);

	const params = new URLSearchParams({
		latitude: lat.toString(),
		longitude: lon.toString(),
		start_date: startDate,
		end_date: endDate,
		daily: [
			'temperature_2m_max', 'temperature_2m_min', 'weathercode',
			'precipitation_sum', 'windspeed_10m_max', 'relative_humidity_2m_mean'
		].join(','),
		timezone: 'auto',
		temperature_unit: 'fahrenheit'
	});

	const response = await fetch(`${HISTORICAL_API_URL}?${params}`);
	if (!response.ok) {
		throw new Error(`Open-Meteo historical API error: ${response.status}`);
	}

	const data: OpenMeteoHistoricalResponse = await response.json();
	const conditions: WeatherCondition[] = [];

	for (let i = 0; i < data.daily.time.length; i++) {
		if (!Number.isFinite(data.daily.temperature_2m_max[i])) continue;

		const precipMm = data.daily.precipitation_sum[i];
		const precipitationPct = !precipMm || precipMm <= 0 ? 0 :
			precipMm < 1 ? 10 : precipMm < 5 ? 30 : precipMm < 10 ? 50 : precipMm < 20 ? 70 : 90;

		conditions.push({
			date: data.daily.time[i],
			location,
			tempHigh: fahrenheitToCelsius(data.daily.temperature_2m_max[i]),
			tempLow: fahrenheitToCelsius(data.daily.temperature_2m_min[i]),
			condition: mapWmoCodeToCondition(data.daily.weathercode[i]),
			precipitation: precipitationPct,
			humidity: Math.round(data.daily.relative_humidity_2m_mean[i]),
			windSpeed: Math.round(data.daily.windspeed_10m_max[i]),
			isHistorical: true,
			isEstimate: false
		});
	}

	return conditions;
}

function getCacheTypeForCategory(category: DateCategory): CacheType {
	switch (category) {
		case 'past': return 'WEATHER_HISTORICAL';
		case 'forecast': return 'WEATHER_FORECAST';
		case 'future': return 'WEATHER_PREDICTION';
	}
}

function getCacheKeyTypeForCategory(category: DateCategory): 'forecast' | 'historical' | 'prediction' {
	switch (category) {
		case 'past': return 'historical';
		case 'forecast': return 'forecast';
		case 'future': return 'prediction';
	}
}

/**
 * Get weather conditions for a location and dates.
 * Handles caching, date classification, and appropriate data source routing.
 */
export async function getWeather(location: Location, dates: string[]): Promise<WeatherCondition[]> {
	if (dates.length === 0) return [];

	const lat = location.geo.latitude;
	const lon = location.geo.longitude;
	const groups = groupDatesByCategory(dates);
	const resultsMap = new Map<string, WeatherCondition>();

	// Process each category
	for (const category of ['past', 'forecast', 'future'] as DateCategory[]) {
		const categoryDates = groups[category];
		if (categoryDates.length === 0) continue;

		const cacheType = getCacheTypeForCategory(category);
		const cacheKeyType = getCacheKeyTypeForCategory(category);

		// Check cache for all dates in this category
		const cacheKeys = categoryDates.map(d => weatherCacheKey(lat, lon, d, cacheKeyType));
		const cached = cache.getMany<WeatherCondition>(cacheKeys);

		// Map cached results back to dates
		const uncachedDates: string[] = [];
		for (let i = 0; i < categoryDates.length; i++) {
			const date = categoryDates[i];
			const key = cacheKeys[i];
			const cachedValue = cached.get(key);
			if (cachedValue) {
				resultsMap.set(date, cachedValue);
			} else {
				uncachedDates.push(date);
			}
		}

		if (uncachedDates.length === 0) continue;

		// Fetch uncached data
		try {
			let fetched: WeatherCondition[] = [];

			if (category === 'forecast') {
				fetched = await fetchForecast(location);
			} else if (category === 'past') {
				const startDate = uncachedDates[0];
				const endDate = uncachedDates[uncachedDates.length - 1];
				fetched = await fetchHistorical(location, startDate, endDate);
			} else if (category === 'future') {
				// For future dates, get historical average
				fetched = await getHistoricalPredictions(location, uncachedDates);
			}

			// Cache and add to results
			const toCache: Array<{ key: string; value: WeatherCondition }> = [];
			for (const condition of fetched) {
				const key = weatherCacheKey(lat, lon, condition.date, cacheKeyType);
				toCache.push({ key, value: condition });
				resultsMap.set(condition.date, condition);
			}
			if (toCache.length > 0) {
				cache.setMany(toCache, cacheType);
			}
		} catch (error) {
			console.error(`Failed to fetch ${category} weather:`, error);
		}
	}

	// Return in original order
	return dates
		.map(d => resultsMap.get(d))
		.filter((c): c is WeatherCondition => c !== undefined);
}

/**
 * Get historical predictions for future dates by averaging past years.
 */
async function getHistoricalPredictions(location: Location, dates: string[]): Promise<WeatherCondition[]> {
	const results: WeatherCondition[] = [];
	const currentYear = new Date().getFullYear();

	for (const date of dates) {
		const [, month, day] = date.split('-');
		const historicalConditions: WeatherCondition[] = [];

		// Fetch same day from past years
		for (let i = 1; i <= HISTORICAL_YEARS_FOR_PREDICTION; i++) {
			const year = currentYear - i;
			const historicalDate = `${year}-${month}-${day}`;
			
			try {
				const conditions = await fetchHistorical(location, historicalDate, historicalDate);
				if (conditions.length > 0) {
					historicalConditions.push(conditions[0]);
				}
			} catch {
				// Skip years where data is unavailable
			}
		}

		if (historicalConditions.length > 0) {
			// Average the historical data
			const avgTempHigh = Math.round(
				historicalConditions.reduce((sum, c) => sum + c.tempHigh, 0) / historicalConditions.length
			);
			const avgTempLow = Math.round(
				historicalConditions.reduce((sum, c) => sum + c.tempLow, 0) / historicalConditions.length
			);
			const avgPrecip = Math.round(
				historicalConditions.reduce((sum, c) => sum + (c.precipitation ?? 0), 0) / historicalConditions.length
			);
			const avgHumidity = Math.round(
				historicalConditions.reduce((sum, c) => sum + (c.humidity ?? 0), 0) / historicalConditions.length
			);

			// Use most common condition
			const conditionCounts = new Map<WeatherConditionType, number>();
			for (const c of historicalConditions) {
				conditionCounts.set(c.condition, (conditionCounts.get(c.condition) ?? 0) + 1);
			}
			let mostCommonCondition: WeatherConditionType = 'partly_cloudy';
			let maxCount = 0;
			for (const [condition, count] of conditionCounts) {
				if (count > maxCount) {
					maxCount = count;
					mostCommonCondition = condition;
				}
			}

			results.push({
				date,
				location,
				tempHigh: avgTempHigh,
				tempLow: avgTempLow,
				condition: mostCommonCondition,
				precipitation: avgPrecip,
				humidity: avgHumidity,
				windSpeed: Math.round(
					historicalConditions.reduce((sum, c) => sum + (c.windSpeed ?? 0), 0) / historicalConditions.length
				),
				isHistorical: false,
				isEstimate: true
			});
		} else {
			// Fallback if no historical data
			results.push({
				date,
				location,
				tempHigh: 20,
				tempLow: 10,
				condition: 'partly_cloudy',
				precipitation: 20,
				humidity: 60,
				windSpeed: 10,
				isHistorical: false,
				isEstimate: true
			});
		}
	}

	return results;
}

/**
 * Get forecast data only (used for initial page load).
 */
export async function getForecast(location: Location): Promise<WeatherCondition[]> {
	const lat = location.geo.latitude;
	const lon = location.geo.longitude;
	
	// Check cache for recent forecast
	const today = new Date().toISOString().split('T')[0];
	const cacheKey = weatherCacheKey(lat, lon, today, 'forecast');
	
	// Try to get from cache
	const cached = cache.get<WeatherCondition[]>(`forecast:${roundCoord(lat)}:${roundCoord(lon)}`);
	if (cached) return cached;

	// Fetch fresh forecast
	const forecast = await fetchForecast(location);
	
	// Cache individual days
	const toCache = forecast.map(c => ({
		key: weatherCacheKey(lat, lon, c.date, 'forecast'),
		value: c
	}));
	cache.setMany(toCache, 'WEATHER_FORECAST');

	return forecast;
}

export const weatherAdapter = {
	getWeather,
	getForecast
};
