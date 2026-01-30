/**
 * Server-side flight adapter.
 * Currently uses adsbdb.com (free, keyless API) with structure 
 * for easy swap to a keyed API (Amadeus, AeroDataBox, etc.).
 * 
 * This is a server-only module ($lib/server/).
 */

import type { Location, Airline, FlightSearchResult } from '$lib/types/travel';
import { cache, flightCacheKey, airlineCacheKey } from '$lib/server/db/cache';
import { env } from '$env/dynamic/private';

// adsbdb API types
interface AdsbdbAirport {
	name: string;
	iata_code: string;
	icao_code: string;
	latitude: number;
	longitude: number;
	municipality: string;
	country_name: string;
}

interface AdsbdbAirline {
	name: string;
	icao: string;
	iata: string | null;
	country: string;
}

interface AdsbdbFlightRoute {
	callsign: string;
	airline: AdsbdbAirline;
	origin: AdsbdbAirport;
	destination: AdsbdbAirport;
}

interface AdsbdbCallsignResponse {
	response: { flightroute: AdsbdbFlightRoute } | string;
}

interface AdsbdbAirlineResponse {
	response: AdsbdbAirline[] | string;
}

const ADSBDB_API_BASE = 'https://api.adsbdb.com/v0';

// Timezone lookup - simple mapping for common airports
// In production, you might want to use a proper timezone database
const AIRPORT_TIMEZONES: Record<string, string> = {
	'JFK': 'America/New_York',
	'LAX': 'America/Los_Angeles',
	'SFO': 'America/Los_Angeles',
	'ORD': 'America/Chicago',
	'DFW': 'America/Chicago',
	'DEN': 'America/Denver',
	'SEA': 'America/Los_Angeles',
	'MIA': 'America/New_York',
	'BOS': 'America/New_York',
	'ATL': 'America/New_York',
	'LHR': 'Europe/London',
	'CDG': 'Europe/Paris',
	'FRA': 'Europe/Berlin',
	'AMS': 'Europe/Amsterdam',
	'NRT': 'Asia/Tokyo',
	'HND': 'Asia/Tokyo',
	'SYD': 'Australia/Sydney',
	'SIN': 'Asia/Singapore',
	'HKG': 'Asia/Hong_Kong',
	'DXB': 'Asia/Dubai'
};

function airportToLocation(airport: AdsbdbAirport): Location {
	return {
		name: `${airport.name} (${airport.iata_code})`,
		address: {
			street: '',
			city: airport.municipality,
			country: airport.country_name,
			formatted: `${airport.iata_code}, ${airport.municipality}, ${airport.country_name}`
		},
		geo: {
			latitude: airport.latitude,
			longitude: airport.longitude
		},
		timezone: AIRPORT_TIMEZONES[airport.iata_code]
	};
}

/**
 * Search for flights using adsbdb (free API).
 * Note: adsbdb provides route information but not schedules/times.
 */
async function searchFlightAdsbdb(
	airlineCode: string,
	flightNumber: string,
	date: string
): Promise<FlightSearchResult | null> {
	const callsign = `${airlineCode}${flightNumber}`.toUpperCase().replace(/\s+/g, '');
	const cacheKey = flightCacheKey(callsign);

	// Check cache
	const cached = cache.get<FlightSearchResult>(cacheKey);
	if (cached) {
		// Update the date for the cached result
		return { ...cached, departureDate: date };
	}

	try {
		const response = await fetch(`${ADSBDB_API_BASE}/callsign/${callsign}`);
		const data: AdsbdbCallsignResponse = await response.json();

		if (typeof data.response === 'string') {
			// Error response ("unknown callsign")
			return null;
		}

		const route = data.response.flightroute;
		const result: FlightSearchResult = {
			airline: route.airline.name,
			airlineCode: route.airline.iata || route.airline.icao,
			flightNumber: flightNumber,
			origin: airportToLocation(route.origin),
			destination: airportToLocation(route.destination),
			departureDate: date
			// Note: adsbdb doesn't provide times - user will enter manually
		};

		// Cache the route (without date)
		cache.set(cacheKey, result, 'FLIGHT_ROUTE');

		return result;
	} catch (error) {
		console.error('Flight search error:', error);
		return null;
	}
}

/**
 * Search for airlines by code.
 */
async function searchAirlinesAdsbdb(query: string): Promise<Airline[]> {
	const normalized = query.toUpperCase().trim();
	if (normalized.length < 2) return [];

	const cacheKey = airlineCacheKey(normalized);

	// Check cache
	const cached = cache.get<Airline[]>(cacheKey);
	if (cached) return cached;

	try {
		const response = await fetch(`${ADSBDB_API_BASE}/airline/${normalized}`);
		const data: AdsbdbAirlineResponse = await response.json();

		if (typeof data.response === 'string') {
			cache.set(cacheKey, [], 'AIRLINE_SEARCH');
			return [];
		}

		const airlines = Array.isArray(data.response) ? data.response : [data.response];
		const results: Airline[] = airlines.map(a => ({
			name: a.name,
			code: a.iata || a.icao,
			icaoCode: a.icao,
			country: a.country
		}));

		cache.set(cacheKey, results, 'AIRLINE_SEARCH');
		return results;
	} catch (error) {
		console.error('Airline search error:', error);
		return [];
	}
}

// =============================================================================
// Keyed API placeholder (for future use with Amadeus, AeroDataBox, etc.)
// =============================================================================

/**
 * Check if a keyed flight API is configured.
 */
export function hasKeyedApi(): boolean {
	return !!env.FLIGHT_API_KEY;
}

/**
 * Search for flights using a keyed API.
 * TODO: Implement when you choose an API provider.
 */
async function searchFlightKeyed(
	_airlineCode: string,
	_flightNumber: string,
	_date: string
): Promise<FlightSearchResult | null> {
	// Placeholder for keyed API implementation
	// Example providers:
	// - Amadeus: https://developers.amadeus.com/
	// - AeroDataBox: https://www.aerodatabox.com/
	// - FlightAware: https://flightaware.com/aeroapi/
	
	console.warn('Keyed flight API not yet implemented, falling back to adsbdb');
	return null;
}

/**
 * Search for airlines using a keyed API.
 */
async function searchAirlinesKeyed(_query: string): Promise<Airline[]> {
	// Placeholder for keyed API implementation
	console.warn('Keyed airline API not yet implemented, falling back to adsbdb');
	return [];
}

// =============================================================================
// Exported adapter (uses keyed API if available, falls back to adsbdb)
// =============================================================================

/**
 * Search for a flight by airline code, flight number, and date.
 */
export async function searchFlight(
	airlineCode: string,
	flightNumber: string,
	date: string
): Promise<FlightSearchResult | null> {
	// Try keyed API first if available
	if (hasKeyedApi()) {
		const result = await searchFlightKeyed(airlineCode, flightNumber, date);
		if (result) return result;
	}

	// Fall back to adsbdb
	return searchFlightAdsbdb(airlineCode, flightNumber, date);
}

/**
 * Search for airlines by name or code.
 */
export async function searchAirlines(query: string): Promise<Airline[]> {
	// Try keyed API first if available
	if (hasKeyedApi()) {
		const results = await searchAirlinesKeyed(query);
		if (results.length > 0) return results;
	}

	// Fall back to adsbdb
	return searchAirlinesAdsbdb(query);
}

export const flightAdapter = {
	searchFlight,
	searchAirlines,
	hasKeyedApi
};
