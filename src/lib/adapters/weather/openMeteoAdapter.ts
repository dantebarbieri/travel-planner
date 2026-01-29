import type { Location, WeatherCondition } from '$lib/types/travel';
import type { OpenMeteoForecastResponse, OpenMeteoHistoricalResponse } from './types';
import { mapWmoCodeToCondition } from './weatherCodeMap';

const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_API_URL = 'https://archive-api.open-meteo.com/v1/archive';

/**
 * Round coordinates to 2 decimal places for cache efficiency.
 * Open-Meteo uses ~11km grid resolution, so 2 decimals is sufficient.
 */
function roundCoord(coord: number): number {
	return Math.round(coord * 100) / 100;
}

/**
 * Convert Fahrenheit to Celsius with better precision.
 * Fetching in Fahrenheit gives more resolution since it has smaller increments.
 */
function fahrenheitToCelsius(f: number): number {
	return Math.round(((f - 32) * 5) / 9);
}

/**
 * Extract time from ISO datetime string (e.g., "2024-01-01T06:30" -> "06:30")
 */
function extractTime(isoDateTime: string): string {
	const match = isoDateTime.match(/T(\d{2}:\d{2})/);
	return match ? match[1] : '06:00';
}

/**
 * Check if a weather condition has valid data.
 * Filters out null/invalid responses from the API (e.g., 0/0 temps in Fahrenheit = -18/-18 in Celsius).
 */
function isValidForecast(condition: WeatherCondition): boolean {
	// 0°F high AND 0°F low is almost certainly null data (converts to -18°C)
	// Real weather would rarely have both high and low at exactly -18°C
	if (condition.tempHigh === -18 && condition.tempLow === -18) {
		return false;
	}
	// Also check for null values that might slip through
	if (condition.tempHigh === null || condition.tempLow === null) {
		return false;
	}
	return true;
}

/**
 * Transform Open-Meteo forecast response to WeatherCondition array.
 * Converts from Fahrenheit to Celsius for storage.
 * Filters out invalid/null data entries.
 */
function transformForecastResponse(
	response: OpenMeteoForecastResponse,
	location: Location
): WeatherCondition[] {
	const { daily } = response;
	const conditions: WeatherCondition[] = [];

	for (let i = 0; i < daily.time.length; i++) {
		// Skip entries with null temperature data
		if (daily.temperature_2m_max[i] === null || daily.temperature_2m_min[i] === null) {
			continue;
		}
		// Skip entries where both temps are exactly 0°F (likely null data)
		if (daily.temperature_2m_max[i] === 0 && daily.temperature_2m_min[i] === 0) {
			continue;
		}

		conditions.push({
			date: daily.time[i],
			location,
			tempHigh: fahrenheitToCelsius(daily.temperature_2m_max[i]),
			tempLow: fahrenheitToCelsius(daily.temperature_2m_min[i]),
			condition: mapWmoCodeToCondition(daily.weathercode[i]),
			precipitation: daily.precipitation_probability_max[i] ?? 0,
			humidity: daily.relative_humidity_2m_max[i] ?? 50,
			windSpeed: Math.round(daily.windspeed_10m_max[i] ?? 0),
			uvIndex: Math.round(daily.uv_index_max[i] ?? 0),
			sunrise: extractTime(daily.sunrise[i] ?? ''),
			sunset: extractTime(daily.sunset[i] ?? ''),
			isHistorical: false,
			isEstimate: false
		});
	}

	return conditions;
}

/**
 * Transform Open-Meteo historical response to WeatherCondition array.
 * Converts from Fahrenheit to Celsius for storage.
 */
function transformHistoricalResponse(
	response: OpenMeteoHistoricalResponse,
	location: Location
): WeatherCondition[] {
	const { daily } = response;
	const conditions: WeatherCondition[] = [];

	for (let i = 0; i < daily.time.length; i++) {
		conditions.push({
			date: daily.time[i],
			location,
			tempHigh: fahrenheitToCelsius(daily.temperature_2m_max[i]),
			tempLow: fahrenheitToCelsius(daily.temperature_2m_min[i]),
			condition: mapWmoCodeToCondition(daily.weathercode[i]),
			precipitation: daily.precipitation_sum[i] > 0 ? Math.min(100, daily.precipitation_sum[i] * 10) : 0,
			humidity: Math.round(daily.relative_humidity_2m_mean[i]),
			windSpeed: Math.round(daily.windspeed_10m_max[i]),
			isHistorical: true,
			isEstimate: false
		});
	}

	return conditions;
}

/**
 * Fetch forecast data from Open-Meteo API.
 * Returns weather for today + up to 16 days ahead.
 */
export async function fetchForecast(location: Location): Promise<WeatherCondition[]> {
	const lat = roundCoord(location.geo.latitude);
	const lon = roundCoord(location.geo.longitude);

	const params = new URLSearchParams({
		latitude: lat.toString(),
		longitude: lon.toString(),
		daily: [
			'temperature_2m_max',
			'temperature_2m_min',
			'weathercode',
			'precipitation_probability_max',
			'windspeed_10m_max',
			'relative_humidity_2m_max',
			'uv_index_max',
			'sunrise',
			'sunset'
		].join(','),
		timezone: 'auto',
		forecast_days: '16',
		temperature_unit: 'fahrenheit'
	});

	const response = await fetch(`${FORECAST_API_URL}?${params}`);

	if (!response.ok) {
		throw new Error(`Open-Meteo forecast API error: ${response.status} ${response.statusText}`);
	}

	const data: OpenMeteoForecastResponse = await response.json();
	return transformForecastResponse(data, location);
}

/**
 * Fetch historical data from Open-Meteo Archive API.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export async function fetchHistorical(
	location: Location,
	startDate: string,
	endDate: string
): Promise<WeatherCondition[]> {
	const lat = roundCoord(location.geo.latitude);
	const lon = roundCoord(location.geo.longitude);

	const params = new URLSearchParams({
		latitude: lat.toString(),
		longitude: lon.toString(),
		start_date: startDate,
		end_date: endDate,
		daily: [
			'temperature_2m_max',
			'temperature_2m_min',
			'weathercode',
			'precipitation_sum',
			'windspeed_10m_max',
			'relative_humidity_2m_mean'
		].join(','),
		timezone: 'auto',
		temperature_unit: 'fahrenheit'
	});

	const response = await fetch(`${HISTORICAL_API_URL}?${params}`);

	if (!response.ok) {
		throw new Error(`Open-Meteo historical API error: ${response.status} ${response.statusText}`);
	}

	const data: OpenMeteoHistoricalResponse = await response.json();
	return transformHistoricalResponse(data, location);
}

/**
 * Fetch historical data for a specific date across multiple years.
 * Used for averaging historical patterns for predictions.
 * @param targetDate - Target date in YYYY-MM-DD format (year will be replaced)
 * @param years - Number of past years to fetch
 */
export async function fetchHistoricalForYears(
	location: Location,
	targetDate: string,
	years: number
): Promise<WeatherCondition[]> {
	const [, month, day] = targetDate.split('-');
	const currentYear = new Date().getFullYear();
	const results: WeatherCondition[] = [];

	// Fetch each year's data individually to handle leap years and data availability
	for (let i = 1; i <= years; i++) {
		const year = currentYear - i;
		const date = `${year}-${month}-${day}`;

		try {
			const conditions = await fetchHistorical(location, date, date);
			if (conditions.length > 0) {
				results.push(conditions[0]);
			}
		} catch {
			// Skip years where data is unavailable (e.g., Feb 29 in non-leap years)
			console.warn(`Historical data unavailable for ${date}`);
		}
	}

	return results;
}

export const openMeteoAdapter = {
	fetchForecast,
	fetchHistorical,
	fetchHistoricalForYears
};
