/**
 * Server-side flight adapter.
 * Uses AeroDataBox API (via RapidAPI) for flight data.
 * Supports flights up to 365 days in the future with departure/arrival times.
 * 
 * This is a server-only module ($lib/server/).
 */

import type { Airline, FlightSearchResult } from '$lib/types/travel';
import { 
	aerodataboxAdapter, 
	isConfigured as isAeroDataBoxConfigured,
	getFlightByNumber,
	getAllFlightsByNumber,
	searchAirlines as searchAirlinesAeroDataBox
} from '$lib/server/adapters/aerodatabox';

// =============================================================================
// API Configuration Check
// =============================================================================

/**
 * Check if the AeroDataBox API is configured.
 */
export function hasKeyedApi(): boolean {
	return isAeroDataBoxConfigured();
}

// =============================================================================
// Flight Search
// =============================================================================

/**
 * Search for a flight by airline code, flight number, and date.
 * Uses AeroDataBox API which provides full schedule data including times.
 */
export async function searchFlight(
	airlineCode: string,
	flightNumber: string,
	date: string
): Promise<FlightSearchResult | null> {
	if (!hasKeyedApi()) {
		console.warn('AeroDataBox API key not configured. Flight search unavailable.');
		return null;
	}

	// Combine airline code and flight number (e.g., "AA" + "100" = "AA100")
	const fullFlightNumber = `${airlineCode}${flightNumber}`.replace(/\s+/g, '');
	
	return getFlightByNumber(fullFlightNumber, date);
}

/**
 * Search for ALL flights matching a flight number and date.
 * Returns all matching flights (e.g., same flight number operating multiple legs).
 */
export async function searchAllFlights(
	airlineCode: string,
	flightNumber: string,
	date: string
): Promise<FlightSearchResult[]> {
	if (!hasKeyedApi()) {
		console.warn('AeroDataBox API key not configured. Flight search unavailable.');
		return [];
	}

	const fullFlightNumber = `${airlineCode}${flightNumber}`.replace(/\s+/g, '');
	
	return getAllFlightsByNumber(fullFlightNumber, date);
}

// =============================================================================
// Airline Search
// =============================================================================

/**
 * Search for airlines by name or code.
 * Uses a comprehensive static list since AeroDataBox doesn't have airline search.
 */
export async function searchAirlines(query: string): Promise<Airline[]> {
	return searchAirlinesAeroDataBox(query);
}

// =============================================================================
// Exported Adapter
// =============================================================================

export const flightAdapter = {
	searchFlight,
	searchAllFlights,
	searchAirlines,
	hasKeyedApi
};
