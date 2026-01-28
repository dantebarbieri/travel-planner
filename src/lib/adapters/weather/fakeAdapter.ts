import type { WeatherAdapter, WeatherCondition, Location, WeatherConditionType } from '$lib/types/travel';

const cityWeatherPatterns: Record<string, { avgHigh: number; avgLow: number; conditions: WeatherConditionType[] }> = {
	paris: { avgHigh: 15, avgLow: 8, conditions: ['partly_cloudy', 'cloudy', 'rain', 'sunny'] },
	tokyo: { avgHigh: 20, avgLow: 12, conditions: ['sunny', 'partly_cloudy', 'rain', 'cloudy'] },
	sydney: { avgHigh: 25, avgLow: 18, conditions: ['sunny', 'partly_cloudy', 'sunny', 'sunny'] },
	london: { avgHigh: 14, avgLow: 7, conditions: ['cloudy', 'rain', 'partly_cloudy', 'cloudy', 'fog'] },
	'new york': { avgHigh: 18, avgLow: 10, conditions: ['sunny', 'partly_cloudy', 'rain', 'cloudy', 'storm'] },
	bangkok: { avgHigh: 33, avgLow: 26, conditions: ['sunny', 'partly_cloudy', 'storm', 'rain', 'sunny'] },
	moscow: { avgHigh: 5, avgLow: -3, conditions: ['cloudy', 'snow', 'cloudy', 'partly_cloudy', 'fog'] },
	dubai: { avgHigh: 35, avgLow: 25, conditions: ['sunny', 'sunny', 'sunny', 'partly_cloudy', 'sunny'] },
	reykjavik: { avgHigh: 8, avgLow: 2, conditions: ['cloudy', 'rain', 'fog', 'partly_cloudy', 'snow'] },
	default: { avgHigh: 22, avgLow: 15, conditions: ['sunny', 'partly_cloudy', 'cloudy', 'rain'] }
};

// Maximum days in the future for which we provide a "forecast"
const FORECAST_WINDOW_DAYS = 14;

function getCityPattern(city: string) {
	const lowerCity = city.toLowerCase();
	for (const [key, pattern] of Object.entries(cityWeatherPatterns)) {
		if (lowerCity.includes(key)) {
			return pattern;
		}
	}
	return cityWeatherPatterns.default;
}

type WeatherDataType = 'historical' | 'forecast' | 'estimate';

/**
 * Determines the type of weather data for a date:
 * - historical: Past dates (definitive data, no asterisk)
 * - forecast: 0-14 days in future (accurate forecast, no asterisk)
 * - estimate: 14+ days in future (seasonal estimate, show asterisk)
 */
function getWeatherDataType(date: string): WeatherDataType {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const targetDate = new Date(date);
	targetDate.setHours(0, 0, 0, 0);

	const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return 'historical';      // Past = definitive
	if (diffDays <= FORECAST_WINDOW_DAYS) return 'forecast';  // Near future
	return 'estimate';                           // Far future = show asterisk
}

function generateWeatherForDate(location: Location, date: string, isHistorical: boolean): WeatherCondition {
	const city = location.address.city;
	const pattern = getCityPattern(city);

	// Use date to seed "randomness" for consistency
	const dateNum = new Date(date).getDate();
	const month = new Date(date).getMonth();

	// Seasonal variance: higher temps in summer (months 5-8), lower in winter
	const seasonalVariance = month >= 5 && month <= 8 ? 5 : month >= 11 || month <= 2 ? -5 : 0;

	// Daily variance based on date
	const dailyVariance = (dateNum % 7) - 3;

	const conditionIndex = (dateNum + month) % pattern.conditions.length;
	const condition = pattern.conditions[conditionIndex];

	// Historical estimates have wider temperature ranges (less precise)
	const tempVariance = isHistorical ? 5 : 2;

	return {
		date,
		location,
		tempHigh: pattern.avgHigh + seasonalVariance + dailyVariance + Math.floor(Math.random() * tempVariance),
		tempLow: pattern.avgLow + seasonalVariance + dailyVariance + Math.floor(Math.random() * tempVariance),
		condition,
		precipitation: condition === 'rain' || condition === 'storm'
			? 60 + Math.floor(Math.random() * 30)
			: condition === 'snow'
				? 40 + Math.floor(Math.random() * 30)
				: Math.floor(Math.random() * 20),
		humidity: 50 + Math.floor(Math.random() * 30),
		windSpeed: condition === 'storm' ? 20 + Math.floor(Math.random() * 25) : 5 + Math.floor(Math.random() * 15),
		uvIndex: condition === 'sunny' ? 6 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 3),
		sunrise: '06:30',
		sunset: '19:45',
		isHistorical
	};
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fakeWeatherAdapter: WeatherAdapter = {
	async getForecast(location: Location, dates: string[]): Promise<WeatherCondition[]> {
		await delay(150 + Math.random() * 100);

		return dates.map((date) => generateWeatherForDate(location, date, false));
	},

	async getHistorical(location: Location, dates: string[]): Promise<WeatherCondition[]> {
		await delay(150 + Math.random() * 100);

		return dates.map((date) => generateWeatherForDate(location, date, true));
	},

	/**
	 * Smart weather fetch:
	 * - Past dates: definitive historical data (no asterisk)
	 * - 0-14 days future: forecast data (no asterisk)
	 * - 14+ days future: seasonal estimate (show asterisk)
	 */
	async getWeather(location: Location, dates: string[]): Promise<WeatherCondition[]> {
		await delay(150 + Math.random() * 100);

		return dates.map((date) => {
			const dataType = getWeatherDataType(date);
			// Only show asterisk for estimates (far future), not historical or forecast
			return generateWeatherForDate(location, date, dataType === 'estimate');
		});
	}
};
