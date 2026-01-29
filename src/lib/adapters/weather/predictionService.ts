import type { Location, WeatherCondition } from '$lib/types/travel';
import { CACHE_CONFIG } from './types';
import { conditionToSeverity, severityToCondition } from './weatherCodeMap';
import { openMeteoAdapter } from './openMeteoAdapter';
import { weatherCache } from './cacheAdapter';

/**
 * Average multiple weather conditions into one.
 * Used for averaging historical data across multiple years.
 */
export function averageWeatherConditions(
	conditions: WeatherCondition[],
	targetDate: string,
	location: Location
): WeatherCondition {
	if (conditions.length === 0) {
		throw new Error('Cannot average empty conditions array');
	}

	if (conditions.length === 1) {
		return { ...conditions[0], date: targetDate, location };
	}

	const avgTempHigh = Math.round(
		conditions.reduce((sum, c) => sum + c.tempHigh, 0) / conditions.length
	);
	const avgTempLow = Math.round(
		conditions.reduce((sum, c) => sum + c.tempLow, 0) / conditions.length
	);
	const avgPrecipitation = Math.round(
		conditions.reduce((sum, c) => sum + (c.precipitation ?? 0), 0) / conditions.length
	);
	const avgHumidity = Math.round(
		conditions.reduce((sum, c) => sum + (c.humidity ?? 50), 0) / conditions.length
	);
	const avgWindSpeed = Math.round(
		conditions.reduce((sum, c) => sum + (c.windSpeed ?? 10), 0) / conditions.length
	);
	const avgUvIndex = Math.round(
		conditions.reduce((sum, c) => sum + (c.uvIndex ?? 3), 0) / conditions.length
	);

	// For condition, take the most common one (mode)
	const conditionCounts = new Map<string, number>();
	for (const c of conditions) {
		const count = conditionCounts.get(c.condition) ?? 0;
		conditionCounts.set(c.condition, count + 1);
	}
	let modeCondition = conditions[0].condition;
	let maxCount = 0;
	for (const [condition, count] of conditionCounts) {
		if (count > maxCount) {
			maxCount = count;
			modeCondition = condition as typeof modeCondition;
		}
	}

	return {
		date: targetDate,
		location,
		tempHigh: avgTempHigh,
		tempLow: avgTempLow,
		condition: modeCondition,
		precipitation: avgPrecipitation,
		humidity: avgHumidity,
		windSpeed: avgWindSpeed,
		uvIndex: avgUvIndex,
		isHistorical: true,
		isEstimate: false
	};
}

/**
 * Blend forecast and historical data to create a prediction.
 * Uses configured weights (default: 70% historical, 30% forecast).
 * Weights are automatically normalized to sum to 1.0.
 */
export function blendWeatherConditions(
	forecast: WeatherCondition,
	historical: WeatherCondition,
	targetDate: string,
	location: Location,
	weights = { forecast: CACHE_CONFIG.FORECAST_WEIGHT, historical: CACHE_CONFIG.HISTORICAL_WEIGHT }
): WeatherCondition {
	// Normalize weights so they sum to 1.0
	const totalWeight = weights.forecast + weights.historical;
	const normalizedWeights =
		Number.isFinite(totalWeight) && totalWeight > 0
			? {
					forecast: weights.forecast / totalWeight,
					historical: weights.historical / totalWeight
				}
			: {
					forecast: 0.3, // Default: 30% forecast
					historical: 0.7 // Default: 70% historical
				};

	const { forecast: forecastWeight, historical: historicalWeight } = normalizedWeights;

	const tempHigh = Math.round(
		forecast.tempHigh * forecastWeight + historical.tempHigh * historicalWeight
	);
	const tempLow = Math.round(
		forecast.tempLow * forecastWeight + historical.tempLow * historicalWeight
	);
	const precipitation = Math.round(
		(forecast.precipitation ?? 0) * forecastWeight +
			(historical.precipitation ?? 0) * historicalWeight
	);
	const humidity = Math.round(
		(forecast.humidity ?? 50) * forecastWeight + (historical.humidity ?? 50) * historicalWeight
	);
	const windSpeed = Math.round(
		(forecast.windSpeed ?? 10) * forecastWeight + (historical.windSpeed ?? 10) * historicalWeight
	);
	const uvIndex = Math.round(
		(forecast.uvIndex ?? 3) * forecastWeight + (historical.uvIndex ?? 3) * historicalWeight
	);

	// Blend condition by averaging severity values
	const forecastSeverity = conditionToSeverity(forecast.condition);
	const historicalSeverity = conditionToSeverity(historical.condition);
	const blendedSeverity = forecastSeverity * forecastWeight + historicalSeverity * historicalWeight;
	const condition = severityToCondition(blendedSeverity);

	return {
		date: targetDate,
		location,
		tempHigh,
		tempLow,
		condition,
		precipitation,
		humidity,
		windSpeed,
		uvIndex,
		sunrise: forecast.sunrise ?? historical.sunrise,
		sunset: forecast.sunset ?? historical.sunset,
		isHistorical: false,
		isEstimate: true
	};
}

/**
 * Get historical average for a specific calendar date (month-day).
 * Fetches data from multiple past years and averages them.
 */
export async function getHistoricalAverage(
	location: Location,
	targetDate: string
): Promise<WeatherCondition> {
	const lat = location.geo.latitude;
	const lon = location.geo.longitude;

	// Check cache first
	const cached = weatherCache.get(lat, lon, targetDate, 'historical');
	if (cached) {
		return cached;
	}

	// Fetch historical data for the past N years
	const historicalConditions = await openMeteoAdapter.fetchHistoricalForYears(
		location,
		targetDate,
		CACHE_CONFIG.HISTORICAL_YEARS_FOR_PREDICTION
	);

	if (historicalConditions.length === 0) {
		throw new Error(`No historical data available for ${targetDate}`);
	}

	const averaged = averageWeatherConditions(historicalConditions, targetDate, location);

	// Cache the averaged result
	weatherCache.set(lat, lon, targetDate, 'historical', averaged);

	return averaged;
}

/**
 * Predict weather for a future date beyond the forecast range.
 * Uses the last available forecast blended with historical averages.
 *
 * Algorithm:
 * 1. Get the last forecast day (day 16)
 * 2. Get historical average for the target date (same month-day from past years)
 * 3. Blend them: 30% forecast trend + 70% historical average
 * 4. For days further out, use previous prediction as the "forecast" component
 *
 * @throws Error if previousDayWeather is null or if historical data is unavailable
 */
export async function predictFutureWeather(
	location: Location,
	targetDate: string,
	previousDayWeather: WeatherCondition | null
): Promise<WeatherCondition> {
	if (!previousDayWeather) {
		throw new Error(
			`Cannot predict weather for ${targetDate}: no previous weather data available`
		);
	}

	const lat = location.geo.latitude;
	const lon = location.geo.longitude;

	// Check cache first
	const cached = weatherCache.get(lat, lon, targetDate, 'prediction');
	if (cached) {
		return cached;
	}

	// Get historical average for this calendar date
	const historicalAvg = await getHistoricalAverage(location, targetDate);

	// Blend previous day's weather (forecast or prediction) with historical
	const prediction = blendWeatherConditions(
		previousDayWeather,
		historicalAvg,
		targetDate,
		location
	);

	// Cache the prediction
	weatherCache.set(lat, lon, targetDate, 'prediction', prediction);

	return prediction;
}

/**
 * Generate predictions for all dates beyond the forecast range.
 * Uses recursive blending with historical data.
 *
 * @param location - Location for weather
 * @param futureDates - Sorted array of dates to predict (YYYY-MM-DD format)
 * @param lastForecast - The last available forecast (typically day 16)
 */
export async function predictFutureWeatherRange(
	location: Location,
	futureDates: string[],
	lastForecast: WeatherCondition | null
): Promise<WeatherCondition[]> {
	const predictions: WeatherCondition[] = [];

	if (futureDates.length === 0) {
		return predictions;
	}

	// If no forecast available, use pure historical estimates
	if (!lastForecast) {
		for (const date of futureDates) {
			try {
				const historical = await getHistoricalAverage(location, date);
				// Mark as estimate since we're using historical for future dates
				const estimate: WeatherCondition = {
					...historical,
					isHistorical: false,
					isEstimate: true
				};
				predictions.push(estimate);
			} catch {
				console.warn(`Unable to get historical data for ${date}`);
			}
		}
		return predictions;
	}

	// Recursively predict each day
	let previousWeather = lastForecast;
	for (const date of futureDates) {
		try {
			const prediction = await predictFutureWeather(location, date, previousWeather);
			predictions.push(prediction);
			previousWeather = prediction;
		} catch {
			console.warn(`Unable to predict weather for ${date}`);
		}
	}

	return predictions;
}

export const predictionService = {
	averageWeatherConditions,
	blendWeatherConditions,
	getHistoricalAverage,
	predictFutureWeather,
	predictFutureWeatherRange
};
