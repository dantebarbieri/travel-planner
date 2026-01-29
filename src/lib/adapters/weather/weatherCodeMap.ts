import type { WeatherConditionType } from '$lib/types/travel';

/**
 * Maps WMO Weather interpretation codes to our WeatherConditionType.
 * See: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 *
 * WMO Codes:
 * 0: Clear sky
 * 1, 2, 3: Mainly clear, partly cloudy, overcast
 * 45, 48: Fog and depositing rime fog
 * 51, 53, 55: Drizzle (light, moderate, dense)
 * 56, 57: Freezing drizzle
 * 61, 63, 65: Rain (slight, moderate, heavy)
 * 66, 67: Freezing rain
 * 71, 73, 75: Snow fall (slight, moderate, heavy)
 * 77: Snow grains
 * 80, 81, 82: Rain showers (slight, moderate, violent)
 * 85, 86: Snow showers (slight, heavy)
 * 95: Thunderstorm (slight or moderate)
 * 96, 99: Thunderstorm with hail
 */
export function mapWmoCodeToCondition(code: number): WeatherConditionType {
	if (code === 0) return 'sunny';
	if (code >= 1 && code <= 3) return 'partly_cloudy';
	if (code >= 45 && code <= 48) return 'fog';
	if (code >= 51 && code <= 67) return 'rain';
	if (code >= 71 && code <= 77) return 'snow';
	if (code >= 80 && code <= 82) return 'rain';
	if (code >= 85 && code <= 86) return 'snow';
	if (code >= 95 && code <= 99) return 'storm';

	// Default to cloudy for any unknown codes
	return 'cloudy';
}

/**
 * Get a numeric code for a weather condition (for blending purposes).
 * Higher values = more severe weather.
 */
export function conditionToSeverity(condition: WeatherConditionType): number {
	const severityMap: Record<WeatherConditionType, number> = {
		sunny: 0,
		partly_cloudy: 1,
		cloudy: 2,
		fog: 3,
		rain: 4,
		snow: 5,
		storm: 6
	};
	return severityMap[condition];
}

/**
 * Get weather condition from severity value (for blending purposes).
 */
export function severityToCondition(severity: number): WeatherConditionType {
	const conditions: WeatherConditionType[] = [
		'sunny',
		'partly_cloudy',
		'cloudy',
		'fog',
		'rain',
		'snow',
		'storm'
	];
	const index = Math.min(Math.max(Math.round(severity), 0), conditions.length - 1);
	return conditions[index];
}
