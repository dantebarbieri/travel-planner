import type { WeatherCondition } from '$lib/types/travel';

// Cache configuration
export const CACHE_CONFIG = {
	/** TTL for forecast data in milliseconds (3 hours) */
	FORECAST_TTL_MS: 3 * 60 * 60 * 1000,
	/** TTL for historical data in milliseconds (30 days) */
	HISTORICAL_TTL_MS: 30 * 24 * 60 * 60 * 1000,
	/** TTL for prediction data in milliseconds (same as forecast) */
	PREDICTION_TTL_MS: 3 * 60 * 60 * 1000,
	/** Maximum days ahead that Open-Meteo forecast API supports */
	FORECAST_MAX_DAYS: 16,
	/** Number of years of historical data to average for predictions */
	HISTORICAL_YEARS_FOR_PREDICTION: 3,
	/** Weight for historical data in prediction blending (0-1) */
	HISTORICAL_WEIGHT: 0.7,
	/** Weight for forecast data in prediction blending (0-1) */
	FORECAST_WEIGHT: 0.3,
	/** Cache key prefix */
	CACHE_PREFIX: 'weather'
} as const;

export type CacheType = 'forecast' | 'historical' | 'prediction';

export interface CacheEntry {
	data: WeatherCondition;
	cachedAt: number;
	type: CacheType;
}

export interface CacheKey {
	lat: number;
	lon: number;
	date: string;
	type: CacheType;
}

/** Date classification for routing to appropriate data source */
export type DateCategory = 'past' | 'forecast' | 'future';

/** Open-Meteo forecast API response structure */
export interface OpenMeteoForecastResponse {
	latitude: number;
	longitude: number;
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

/** Open-Meteo historical API response structure */
export interface OpenMeteoHistoricalResponse {
	latitude: number;
	longitude: number;
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
