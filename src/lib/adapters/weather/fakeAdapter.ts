import type { WeatherAdapter, WeatherCondition, Location, WeatherConditionType } from '$lib/types/travel';

const cityWeatherPatterns: Record<string, { avgHigh: number; avgLow: number; conditions: WeatherConditionType[] }> = {
	paris: { avgHigh: 15, avgLow: 8, conditions: ['partly_cloudy', 'cloudy', 'rain', 'sunny'] },
	tokyo: { avgHigh: 20, avgLow: 12, conditions: ['sunny', 'partly_cloudy', 'rain', 'cloudy'] },
	sydney: { avgHigh: 25, avgLow: 18, conditions: ['sunny', 'partly_cloudy', 'sunny', 'sunny'] },
	london: { avgHigh: 14, avgLow: 7, conditions: ['cloudy', 'rain', 'partly_cloudy', 'cloudy'] },
	'new york': { avgHigh: 18, avgLow: 10, conditions: ['sunny', 'partly_cloudy', 'rain', 'cloudy'] },
	default: { avgHigh: 22, avgLow: 15, conditions: ['sunny', 'partly_cloudy', 'cloudy', 'rain'] }
};

function getCityPattern(city: string) {
	const lowerCity = city.toLowerCase();
	for (const [key, pattern] of Object.entries(cityWeatherPatterns)) {
		if (lowerCity.includes(key)) {
			return pattern;
		}
	}
	return cityWeatherPatterns.default;
}

function generateWeatherForDate(location: Location, date: string, isHistorical: boolean): WeatherCondition {
	const city = location.address.city;
	const pattern = getCityPattern(city);

	// Add some randomness
	const dateNum = new Date(date).getDate();
	const variance = (dateNum % 7) - 3;

	const conditionIndex = dateNum % pattern.conditions.length;

	return {
		date,
		location,
		tempHigh: pattern.avgHigh + variance + Math.floor(Math.random() * 4),
		tempLow: pattern.avgLow + variance + Math.floor(Math.random() * 3),
		condition: pattern.conditions[conditionIndex],
		precipitation: pattern.conditions[conditionIndex] === 'rain' ? 60 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 20),
		humidity: 50 + Math.floor(Math.random() * 30),
		windSpeed: 5 + Math.floor(Math.random() * 15),
		uvIndex: pattern.conditions[conditionIndex] === 'sunny' ? 6 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 3),
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
	}
};
