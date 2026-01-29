import type { WeatherConditionType } from '$lib/types/travel';

/**
 * Maps WMO Weather interpretation codes to our WeatherConditionType.
 * See: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 *
 * WMO Codes:
 * 0: Clear sky
 * 1: Mainly clear
 * 2: Partly cloudy
 * 3: Overcast
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
	if (code === 0) return 'clear';
	if (code === 1) return 'mostly_clear';
	if (code === 2) return 'partly_cloudy';
	if (code === 3) return 'overcast';
	if (code >= 45 && code <= 48) return 'fog';
	if (code >= 51 && code <= 57) return 'drizzle';
	if (code >= 61 && code <= 67) return 'rain';
	if (code >= 71 && code <= 77) return 'snow';
	if (code >= 80 && code <= 82) return 'rain';
	if (code >= 85 && code <= 86) return 'snow';
	if (code >= 95 && code <= 99) return 'storm';

	// Default to overcast for any unknown codes
	return 'overcast';
}

/**
 * Get a numeric code for a weather condition (for blending purposes).
 * Higher values = more severe weather.
 */
export function conditionToSeverity(condition: WeatherConditionType): number {
	const severityMap: Record<WeatherConditionType, number> = {
		clear: 0,
		mostly_clear: 1,
		partly_cloudy: 2,
		overcast: 3,
		fog: 4,
		drizzle: 5,
		rain: 6,
		snow: 7,
		storm: 8
	};
	return severityMap[condition];
}

/**
 * Get weather condition from severity value (for blending purposes).
 */
export function severityToCondition(severity: number): WeatherConditionType {
	const conditions: WeatherConditionType[] = [
		'clear',
		'mostly_clear',
		'partly_cloudy',
		'overcast',
		'fog',
		'drizzle',
		'rain',
		'snow',
		'storm'
	];
	const index = Math.min(Math.max(Math.round(severity), 0), conditions.length - 1);
	return conditions[index];
}
