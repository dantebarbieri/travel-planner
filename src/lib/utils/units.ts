/**
 * Day-based unit resolution utilities.
 * 
 * Units are resolved per-day based on the country for that day.
 * For multi-country days (transition days), special handling applies:
 * - Show a warning that units change during the day
 * - Use either user settings fallback, or a heuristic:
 *   - If last day of trip → use country at START of day
 *   - Otherwise → use country at END of day
 */

import type { City, ItineraryDay, Trip } from '$lib/types/travel';
import type { TemperatureUnit, DistanceUnit } from '$lib/types/settings';
import {
	resolveLocationBasedTemperature,
	resolveLocationBasedDistance
} from '$lib/types/settings';

// ============ Types ============

export interface DayUnitResolution {
	/** The resolved concrete temperature unit for this day */
	temperatureUnit: 'celsius' | 'fahrenheit';
	/** The resolved concrete distance unit for this day */
	distanceUnit: 'km' | 'miles';
	/** Whether this day involves multiple countries with different units */
	hasUnitChange: boolean;
	/** The country used to determine units (for display purposes) */
	resolvedCountry: string | undefined;
	/** For multi-country days, the countries involved */
	countries?: string[];
}

export interface DayCountryInfo {
	/** Countries for this day, in order */
	countries: string[];
	/** Whether this is a transition day between countries */
	isTransitionDay: boolean;
	/** The country at the start of the day */
	startCountry: string | undefined;
	/** The country at the end of the day */
	endCountry: string | undefined;
}

// ============ Country Info Resolution ============

/**
 * Get country information for a specific day.
 */
export function getDayCountryInfo(
	day: ItineraryDay,
	cities: City[]
): DayCountryInfo {
	const dayCities = cities.filter((c) => day.cityIds.includes(c.id));
	
	if (dayCities.length === 0) {
		return {
			countries: [],
			isTransitionDay: false,
			startCountry: undefined,
			endCountry: undefined
		};
	}

	// Extract unique countries (preserve order based on city order)
	const countries = [...new Set(dayCities.map((c) => c.country))];
	
	// Determine if this is a transition day (cities ending and starting on same day)
	let startCountry: string | undefined;
	let endCountry: string | undefined;
	
	if (dayCities.length === 1) {
		startCountry = dayCities[0].country;
		endCountry = dayCities[0].country;
	} else {
		// Multiple cities - check which is leaving (end date matches) and which is arriving (start date matches)
		const leavingCity = dayCities.find((c) => c.endDate === day.date && c.startDate !== day.date);
		const arrivingCity = dayCities.find((c) => c.startDate === day.date && c.endDate !== day.date);
		
		if (leavingCity && arrivingCity) {
			// True transition day
			startCountry = leavingCity.country;
			endCountry = arrivingCity.country;
		} else {
			// Multiple cities but not a clear transition (maybe both start/end same day, or other edge case)
			// Use first and last based on order
			startCountry = dayCities[0].country;
			endCountry = dayCities[dayCities.length - 1].country;
		}
	}

	const isTransitionDay = countries.length > 1 && startCountry !== endCountry;

	return {
		countries,
		isTransitionDay,
		startCountry,
		endCountry
	};
}

// ============ Check if Units Differ Between Countries ============

/**
 * Check if two countries have different temperature units.
 */
export function countriesHaveDifferentTempUnits(
	country1: string | undefined,
	country2: string | undefined
): boolean {
	if (!country1 || !country2) return false;
	return resolveLocationBasedTemperature(country1) !== resolveLocationBasedTemperature(country2);
}

/**
 * Check if two countries have different distance units.
 */
export function countriesHaveDifferentDistanceUnits(
	country1: string | undefined,
	country2: string | undefined
): boolean {
	if (!country1 || !country2) return false;
	return resolveLocationBasedDistance(country1) !== resolveLocationBasedDistance(country2);
}

// ============ Main Resolution Functions ============

/**
 * Resolve units for a specific day.
 * 
 * @param day - The itinerary day
 * @param cities - All cities in the trip
 * @param isLastDay - Whether this is the last day of the trip
 * @param userTempUnit - User's temperature unit preference (may be 'trip-location')
 * @param userDistUnit - User's distance unit preference (may be 'trip-location')
 */
export function resolveDayUnits(
	day: ItineraryDay,
	cities: City[],
	isLastDay: boolean,
	userTempUnit: TemperatureUnit,
	userDistUnit: DistanceUnit
): DayUnitResolution {
	const countryInfo = getDayCountryInfo(day, cities);
	
	// If user has explicit unit preference (not trip-location), use that
	const userHasExplicitTemp = userTempUnit !== 'trip-location';
	const userHasExplicitDist = userDistUnit !== 'trip-location';
	
	// Determine which country to use for resolution
	let resolvedCountry: string | undefined;
	
	if (countryInfo.countries.length === 0) {
		resolvedCountry = undefined;
	} else if (!countryInfo.isTransitionDay) {
		// Single country day - straightforward
		resolvedCountry = countryInfo.startCountry;
	} else {
		// Multi-country transition day - apply heuristic
		// If last day of trip → use country at START of day
		// Otherwise → use country at END of day
		resolvedCountry = isLastDay ? countryInfo.startCountry : countryInfo.endCountry;
	}
	
	// Resolve temperature unit
	let temperatureUnit: 'celsius' | 'fahrenheit';
	if (userHasExplicitTemp) {
		temperatureUnit = userTempUnit as 'celsius' | 'fahrenheit';
	} else {
		temperatureUnit = resolveLocationBasedTemperature(resolvedCountry);
	}
	
	// Resolve distance unit
	let distanceUnit: 'km' | 'miles';
	if (userHasExplicitDist) {
		distanceUnit = userDistUnit as 'km' | 'miles';
	} else {
		distanceUnit = resolveLocationBasedDistance(resolvedCountry);
	}
	
	// Determine if there's a unit change (only relevant if using trip-location)
	const hasUnitChange = countryInfo.isTransitionDay && (
		(!userHasExplicitTemp && countriesHaveDifferentTempUnits(countryInfo.startCountry, countryInfo.endCountry)) ||
		(!userHasExplicitDist && countriesHaveDifferentDistanceUnits(countryInfo.startCountry, countryInfo.endCountry))
	);
	
	return {
		temperatureUnit,
		distanceUnit,
		hasUnitChange,
		resolvedCountry,
		countries: countryInfo.isTransitionDay ? countryInfo.countries : undefined
	};
}

/**
 * Get unit resolution for all days in a trip.
 * Returns a map of day ID to unit resolution.
 */
export function resolveAllDayUnits(
	trip: Trip,
	userTempUnit: TemperatureUnit,
	userDistUnit: DistanceUnit
): Map<string, DayUnitResolution> {
	const result = new Map<string, DayUnitResolution>();
	const lastDayIndex = trip.itinerary.length - 1;
	
	for (let i = 0; i < trip.itinerary.length; i++) {
		const day = trip.itinerary[i];
		const isLastDay = i === lastDayIndex;
		const resolution = resolveDayUnits(day, trip.cities, isLastDay, userTempUnit, userDistUnit);
		result.set(day.id, resolution);
	}
	
	return result;
}

/**
 * Format a user-friendly message about units changing.
 */
export function formatUnitChangeMessage(resolution: DayUnitResolution): string | null {
	if (!resolution.hasUnitChange || !resolution.countries || resolution.countries.length < 2) {
		return null;
	}
	
	const [fromCountry, toCountry] = resolution.countries;
	return `Units change: ${fromCountry} → ${toCountry}`;
}
