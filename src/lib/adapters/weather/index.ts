import type { WeatherAdapter, WeatherCondition, Location } from '$lib/types/travel';
import { CACHE_CONFIG, type DateCategory } from './types';
import { openMeteoAdapter } from './openMeteoAdapter';
import { weatherCache } from './cacheAdapter';
import { predictionService } from './predictionService';

// Run cache cleanup on module load (browser only) and periodically during session
if (typeof window !== 'undefined') {
	// Initial cleanup on load
	weatherCache.cleanup();

	// Periodic cleanup to remove entries that expire during the session.
	// This is safe even with multiple tabs since each tab independently
	// maintains the same cache; redundant cleanups are acceptable.
	const CACHE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
	setInterval(() => {
		weatherCache.cleanup();
	}, CACHE_CLEANUP_INTERVAL_MS);
}

/**
 * Get today's date in a specific timezone.
 * @param timezone - IANA timezone name (e.g., 'Australia/Sydney', 'America/New_York')
 * @returns Date string in YYYY-MM-DD format
 */
function getTodayInTimezone(timezone?: string): string {
	const now = new Date();
	
	if (!timezone) {
		// Use browser local time
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	
	try {
		// Format date in the target timezone
		const formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		return formatter.format(now); // Returns YYYY-MM-DD in en-CA locale
	} catch {
		// Invalid timezone - fall back to browser local time
		// Browser local time is a reasonable fallback for client-side code
		// since the user is likely planning from their local context
		console.warn(`[Weather] Invalid timezone '${timezone}', using browser local time`);
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
}

/**
 * Classify a date into categories for routing to appropriate data source.
 * Uses the destination timezone to determine what "today" is.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @param timezone - Optional IANA timezone name for the destination
 */
function classifyDate(date: string, timezone?: string): DateCategory {
	// Validate date format (YYYY-MM-DD)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		console.warn(`Invalid date format: ${date}. Expected YYYY-MM-DD format.`);
		// Return 'future' as safe fallback for invalid dates
		return 'future';
	}

	const [year, month, day] = date.split('-').map(Number);
	
	// Validate date components are in valid ranges
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		console.warn(`Invalid date components: ${date}`);
		return 'future';
	}

	const targetDate = new Date(year, month - 1, day);
	targetDate.setHours(0, 0, 0, 0);
	
	// Check if date is valid (e.g., not Feb 30)
	if (targetDate.getFullYear() !== year || targetDate.getMonth() !== month - 1 || targetDate.getDate() !== day) {
		console.warn(`Invalid date: ${date} (does not exist in calendar)`);
		return 'future';
	}

	// Get today in the destination timezone
	const todayStr = getTodayInTimezone(timezone);
	const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
	const today = new Date(todayYear, todayMonth - 1, todayDay);
	today.setHours(0, 0, 0, 0);

	const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return 'past';
	if (diffDays <= CACHE_CONFIG.FORECAST_MAX_DAYS) return 'forecast';
	return 'future';
}

/**
 * Group dates by their category for efficient batched fetching.
 */
function groupDatesByCategory(dates: string[], timezone?: string): Record<DateCategory, string[]> {
	const groups: Record<DateCategory, string[]> = {
		past: [],
		forecast: [],
		future: []
	};

	for (const date of dates) {
		const category = classifyDate(date, timezone);
		groups[category].push(date);
	}

	// Sort dates within each group
	for (const category of Object.keys(groups) as DateCategory[]) {
		groups[category].sort();
	}

	return groups;
}

/**
 * Fetch historical data for past dates, using cache where available.
 */
async function fetchPastDates(
	location: Location,
	dates: string[]
): Promise<WeatherCondition[]> {
	if (dates.length === 0) return [];

	const lat = location.geo.latitude;
	const lon = location.geo.longitude;

	// Check cache for each date
	const cached = weatherCache.getMany(lat, lon, dates, 'historical');
	const uncachedDates = dates.filter((d) => !cached.has(d));

	if (uncachedDates.length === 0) {
		// All dates were cached
		return dates.map((d) => cached.get(d)!);
	}

	// Fetch uncached dates from API
	// Group consecutive dates for efficient API calls
	const startDate = uncachedDates[0];
	const endDate = uncachedDates[uncachedDates.length - 1];

	try {
		const fetched = await openMeteoAdapter.fetchHistorical(location, startDate, endDate);

		// Cache all fetched results
		weatherCache.setMany(lat, lon, 'historical', fetched);

		// Build result map
		const fetchedMap = new Map(fetched.map((c) => [c.date, c]));

		// Return in original order, merging cached and fetched
		return dates.map((d) => cached.get(d) ?? fetchedMap.get(d)!).filter(Boolean);
	} catch (error) {
		console.error('Failed to fetch historical weather:', error);
		// Return only cached results
		return dates.map((d) => cached.get(d)).filter((c): c is WeatherCondition => c !== undefined);
	}
}

/**
 * Helper to create a historical estimate for a date.
 * Used as fallback when predictions fail or no previous weather is available.
 */
async function getHistoricalEstimate(
	location: Location,
	date: string,
	lat: number,
	lon: number
): Promise<WeatherCondition> {
	const historical = await predictionService.getHistoricalAverage(location, date);
	const estimate: WeatherCondition = {
		...historical,
		isHistorical: false,
		isEstimate: true
	};
	weatherCache.set(lat, lon, date, 'prediction', estimate);
	return estimate;
}

/**
 * Fetch forecast data for near-future dates, using cache where available.
 * Returns a map of date -> condition for valid forecasts, and a set of dates with missing data.
 */
async function fetchForecastDatesWithGaps(
	location: Location,
	dates: string[]
): Promise<{ forecasts: Map<string, WeatherCondition>; missingDates: string[] }> {
	if (dates.length === 0) return { forecasts: new Map(), missingDates: [] };

	const lat = location.geo.latitude;
	const lon = location.geo.longitude;
	const forecasts = new Map<string, WeatherCondition>();

	// Check cache for each date
	const cached = weatherCache.getMany(lat, lon, dates, 'forecast');
	for (const [date, condition] of cached) {
		forecasts.set(date, condition);
	}

	const uncachedDates = dates.filter((d) => !cached.has(d));

	if (uncachedDates.length > 0) {
		try {
			// Fetch full forecast (API returns all available days)
			const fetched = await openMeteoAdapter.fetchForecast(location);

			// Cache all valid fetched results
			weatherCache.setMany(lat, lon, 'forecast', fetched);

			// Add to forecasts map
			for (const condition of fetched) {
				forecasts.set(condition.date, condition);
			}
		} catch (error) {
			console.error('Failed to fetch forecast weather:', error);
		}
	}

	// Identify dates that don't have valid forecast data
	const missingDates = dates.filter((d) => !forecasts.has(d));

	return { forecasts, missingDates };
}

/**
 * Fetch forecast data for near-future dates, using cache where available.
 */
async function fetchForecastDates(
	location: Location,
	dates: string[]
): Promise<WeatherCondition[]> {
	const { forecasts } = await fetchForecastDatesWithGaps(location, dates);
	return dates.map((d) => forecasts.get(d)).filter((c): c is WeatherCondition => c !== undefined);
}

/**
 * Get predictions for dates that need prediction, handling gaps in forecast data.
 * This processes dates sequentially, using either forecast data or previous predictions
 * as the seed for the next day's prediction.
 *
 * @param location - Location for weather
 * @param dates - Sorted array of dates that need prediction (may include gaps)
 * @param lastForecast - The last valid forecast before the first prediction date
 * @param existingForecasts - Map of dates that have valid forecast data (for gap handling)
 */
async function fetchFutureDatesSequentially(
	location: Location,
	dates: string[],
	lastForecast: WeatherCondition | null,
	existingForecasts: Map<string, WeatherCondition>
): Promise<WeatherCondition[]> {
	if (dates.length === 0) return [];

	const lat = location.geo.latitude;
	const lon = location.geo.longitude;
	const results: WeatherCondition[] = [];

	// Check cache for predictions
	const cachedPredictions = weatherCache.getMany(lat, lon, dates, 'prediction');

	let previousWeather = lastForecast;

	for (const date of dates) {
		// Check if this date has a valid forecast (gap in the middle)
		const existingForecast = existingForecasts.get(date);
		if (existingForecast) {
			// Use the forecast and update previousWeather for next iteration
			results.push(existingForecast);
			previousWeather = existingForecast;
			continue;
		}

		// Check if we have a cached prediction
		const cachedPrediction = cachedPredictions.get(date);
		if (cachedPrediction) {
			results.push(cachedPrediction);
			previousWeather = cachedPrediction;
			continue;
		}

		// Generate a prediction for this date
		try {
			if (!previousWeather) {
				// No prior weather context available; fall back to historical average
				const estimate = await getHistoricalEstimate(location, date, lat, lon);
				results.push(estimate);
				previousWeather = estimate;
			} else {
				const prediction = await predictionService.predictFutureWeather(
					location,
					date,
					previousWeather
				);
				results.push(prediction);
				previousWeather = prediction;

				// Cache the prediction
				weatherCache.set(lat, lon, date, 'prediction', prediction);
			}
		} catch (error) {
			console.warn(`Failed to predict weather for ${date}:`, error);
			// If we can't predict, try to use just historical data
			try {
				const estimate = await getHistoricalEstimate(location, date, lat, lon);
				results.push(estimate);
				previousWeather = estimate;
			} catch (historicalError) {
				// If we can't get historical data either, create a reasonable default
				// This ensures we can still make predictions for subsequent days
				console.error(
					`Failed to obtain weather data for ${date}, using default fallback:`,
					historicalError instanceof Error ? historicalError.message : String(historicalError)
				);
				
				// Create a fallback weather condition with reasonable defaults
				// This allows the prediction chain to continue
				const fallback: WeatherCondition = {
					date,
					location,
					tempHigh: 20, // 20°C = 68°F (mild temperature)
					tempLow: 10, // 10°C = 50°F
					condition: 'partly_cloudy',
					precipitation: 20,
					humidity: 60,
					windSpeed: 10,
					uvIndex: 5,
					isHistorical: false,
					isEstimate: true
				};
				results.push(fallback);
				previousWeather = fallback;
				weatherCache.set(lat, lon, date, 'prediction', fallback);
			}
		}
	}

	return results;
}

/**
 * The main weather adapter that implements the WeatherAdapter interface.
 * Routes requests to appropriate data sources based on date:
 * - Past dates → Historical API
 * - Today to +16 days → Forecast API
 * - Beyond +16 days → Prediction service (blended forecast + historical)
 * 
 * Uses the location's timezone to correctly classify dates.
 */
export const weatherAdapter: WeatherAdapter = {
	/**
	 * Get forecast data for near-future dates.
	 * Note: For dates beyond forecast range, returns empty array.
	 */
	async getForecast(location: Location, dates: string[]): Promise<WeatherCondition[]> {
		const forecastDates = dates.filter((d) => classifyDate(d, location.timezone) === 'forecast');
		return fetchForecastDates(location, forecastDates);
	},

	/**
	 * Get historical data for past dates.
	 */
	async getHistorical(location: Location, dates: string[]): Promise<WeatherCondition[]> {
		const pastDates = dates.filter((d) => classifyDate(d, location.timezone) === 'past');
		return fetchPastDates(location, pastDates);
	},

	/**
	 * Smart weather fetch that automatically routes to the appropriate data source.
	 * - Past dates: Historical API (marked with isHistorical: true)
	 * - 0-16 days future: Forecast API (with gap-filling via predictions)
	 * - 17+ days future: Prediction service (marked with isEstimate: true)
	 *
	 * Handles gaps in forecast data by using predictions for missing dates.
	 * Uses the last valid forecast as the seed for predictions.
	 * Uses the location's timezone to correctly classify dates.
	 */
	async getWeather(location: Location, dates: string[]): Promise<WeatherCondition[]> {
		const timezone = location.timezone;
		const groups = groupDatesByCategory(dates, timezone);
		const resultsMap = new Map<string, WeatherCondition>();

		// Fetch past dates (historical)
		const historical = await fetchPastDates(location, groups.past);
		for (const condition of historical) {
			resultsMap.set(condition.date, condition);
		}

		// Fetch forecast dates - get both valid forecasts and dates with missing data
		const { forecasts, missingDates: forecastGaps } = await fetchForecastDatesWithGaps(
			location,
			groups.forecast
		);
		for (const [date, condition] of forecasts) {
			resultsMap.set(date, condition);
		}

		// Find the last valid forecast date to use as seed for predictions
		let lastForecast: WeatherCondition | null = null;
		if (forecasts.size > 0) {
			const sortedDates = [...forecasts.keys()].sort();
			lastForecast = forecasts.get(sortedDates[sortedDates.length - 1]) ?? null;
		}

		// Combine forecast gaps with future dates for prediction
		// Sort all dates that need prediction
		const allDatesToPredict = [...forecastGaps, ...groups.future].sort();

		if (allDatesToPredict.length > 0) {
			// Generate predictions for all missing dates
			const predictions = await fetchFutureDatesSequentially(
				location,
				allDatesToPredict,
				lastForecast,
				forecasts
			);
			for (const condition of predictions) {
				resultsMap.set(condition.date, condition);
			}
		}

		// Return results in original request order
		return dates
			.map((d) => resultsMap.get(d))
			.filter((c): c is WeatherCondition => c !== undefined);
	}
};

// Export utilities for testing and debugging
export { weatherCache, predictionService, openMeteoAdapter };
export type { DateCategory };
