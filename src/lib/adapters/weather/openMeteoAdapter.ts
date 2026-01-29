import type { Location, WeatherCondition } from '$lib/types/travel';
import type { OpenMeteoForecastResponse, OpenMeteoHistoricalResponse } from './types';
import { mapWmoCodeToCondition } from './weatherCodeMap';
import { CACHE_CONFIG } from './types';

const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_API_URL = 'https://archive-api.open-meteo.com/v1/archive';

/**
 * Queue-based rate limiter to prevent API abuse.
 * Ensures requests are serialized and properly spaced even under concurrent load.
 */
class RateLimiter {
	private lastRequestTime = 0;
	private readonly minDelayMs: number;
	private requestQueue: Array<() => void> = [];
	private isProcessing = false;

	constructor(minDelayMs = 100) {
		if (minDelayMs <= 0) {
			throw new Error('Rate limiter minDelayMs must be greater than 0');
		}
		this.minDelayMs = minDelayMs;
	}

	async waitForSlot(): Promise<void> {
		return new Promise((resolve) => {
			this.requestQueue.push(resolve);
			this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.requestQueue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.requestQueue.length > 0) {
			const now = Date.now();
			const timeSinceLastRequest = now - this.lastRequestTime;

			if (timeSinceLastRequest < this.minDelayMs) {
				const delay = this.minDelayMs - timeSinceLastRequest;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			this.lastRequestTime = Date.now();
			const resolve = this.requestQueue.shift();
			if (resolve) {
				resolve();
			}
		}

		this.isProcessing = false;
	}
}

// Single rate limiter instance shared across all API calls
const rateLimiter = new RateLimiter(100); // 100ms minimum between requests

/**
 * Round coordinates for cache efficiency.
 *
 * Rounds to 2 decimal places (~1.1km), which is a good trade-off for
 * Open-Meteo's ~11km grid resolution and keeps the number of cache entries small.
 *
 * NOTE: Using coarse rounding means nearby locations (e.g., different
 * neighborhoods or airport vs. downtown) may share the same cache key.
 * This is acceptable given the API's resolution but may miss microclimates.
 */
function roundCoord(coord: number): number {
	return Math.round(coord * 100) / 100;
}

/**
 * Convert Fahrenheit to Celsius.
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
		// Skip entries with null or undefined temperature data
		if (
			daily.temperature_2m_max[i] === null ||
			daily.temperature_2m_max[i] === undefined ||
			daily.temperature_2m_min[i] === null ||
			daily.temperature_2m_min[i] === undefined ||
			!Number.isFinite(daily.temperature_2m_max[i]) ||
			!Number.isFinite(daily.temperature_2m_min[i])
		) {
			continue;
		}
		// Skip entries where both temps are exactly 0°F (likely null data placeholder)
		if (daily.temperature_2m_max[i] === 0 && daily.temperature_2m_min[i] === 0) {
			continue;
		}
		// Skip entries with invalid or missing weathercode
		if (
			daily.weathercode[i] === null ||
			daily.weathercode[i] === undefined ||
			!Number.isFinite(daily.weathercode[i])
		) {
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
		// Skip entries with null or undefined temperature data
		if (
			daily.temperature_2m_max[i] === null ||
			daily.temperature_2m_max[i] === undefined ||
			daily.temperature_2m_min[i] === null ||
			daily.temperature_2m_min[i] === undefined ||
			!Number.isFinite(daily.temperature_2m_max[i]) ||
			!Number.isFinite(daily.temperature_2m_min[i])
		) {
			continue;
		}
		// Skip entries where both temps are exactly 0°F (likely null data placeholder)
		if (daily.temperature_2m_max[i] === 0 && daily.temperature_2m_min[i] === 0) {
			continue;
		}
		// Skip entries with invalid or missing weathercode
		if (
			daily.weathercode[i] === null ||
			daily.weathercode[i] === undefined ||
			!Number.isFinite(daily.weathercode[i])
		) {
			continue;
		}

		// Convert precipitation_sum (mm) to approximate percentage
		// Use thresholds: 0-1mm=10%, 1-5mm=30%, 5-10mm=50%, 10-20mm=70%, 20+mm=90%
		const precipMm = daily.precipitation_sum[i];
		const precipitationPct =
			precipMm === null || precipMm === undefined || !Number.isFinite(precipMm) || precipMm <= 0
				? 0
				: precipMm < 1
					? 10
					: precipMm < 5
						? 30
						: precipMm < 10
							? 50
							: precipMm < 20
								? 70
								: 90;

		conditions.push({
			date: daily.time[i],
			location,
			tempHigh: fahrenheitToCelsius(daily.temperature_2m_max[i]),
			tempLow: fahrenheitToCelsius(daily.temperature_2m_min[i]),
			condition: mapWmoCodeToCondition(daily.weathercode[i]),
			precipitation: precipitationPct,
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
	await rateLimiter.waitForSlot();

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
		forecast_days: CACHE_CONFIG.FORECAST_MAX_DAYS.toString(),
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
	await rateLimiter.waitForSlot();

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
 * @returns Array of weather conditions
 * @throws Error if less than half of the requested years are available
 */
export async function fetchHistoricalForYears(
	location: Location,
	targetDate: string,
	years: number
): Promise<WeatherCondition[]> {
	const [, month, day] = targetDate.split('-');
	const currentYear = new Date().getFullYear();
	const results: WeatherCondition[] = [];
	let successCount = 0;
	let failCount = 0;

	// Fetch each year's data individually to handle leap years and data availability
	for (let i = 1; i <= years; i++) {
		const year = currentYear - i;
		const date = `${year}-${month}-${day}`;

		try {
			const conditions = await fetchHistorical(location, date, date);
			if (conditions.length > 0) {
				results.push(conditions[0]);
				successCount++;
			}
		} catch (error) {
			failCount++;
			// Skip years where data is unavailable (e.g., Feb 29 in non-leap years)
			console.warn(
				`Historical data unavailable for ${date}:`,
				error instanceof Error ? error.message : String(error)
			);
		}
	}

	// Throw error if too few years were successfully fetched
	if (successCount < Math.ceil(years / 2)) {
		throw new Error(
			`Insufficient historical data: only ${successCount}/${years} years available for ${targetDate}`
		);
	}

	return results;
}

export const openMeteoAdapter = {
	fetchForecast,
	fetchHistorical,
	fetchHistoricalForYears
};
