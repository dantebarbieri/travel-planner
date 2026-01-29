/**
 * Airport adapter for searching and looking up airports
 * Data sourced from mwgg/Airports (MIT licensed)
 */

import type { Location } from '$lib/types/travel';
import airportsData from '$lib/data/airports.json';

// Type for raw airport data from JSON
interface AirportData {
	iata: string;
	icao: string;
	name: string;
	city: string;
	country: string;
	lat: number;
	lon: number;
	tz: string;
}

// Type for airport search results
export interface AirportSearchResult {
	iata: string;
	icao: string;
	name: string;
	city: string;
	country: string;
	displayName: string;
	location: Location;
}

// Cast imported data to typed array
const airports: AirportData[] = airportsData as AirportData[];

// Build index for fast lookups by IATA and ICAO
const byIata = new Map<string, AirportData>();
const byIcao = new Map<string, AirportData>();

for (const airport of airports) {
	if (airport.iata) {
		byIata.set(airport.iata.toUpperCase(), airport);
	}
	if (airport.icao) {
		byIcao.set(airport.icao.toUpperCase(), airport);
	}
}

/**
 * Convert airport data to Location type
 */
function airportToLocation(airport: AirportData): Location {
	return {
		name: `${airport.name} (${airport.iata})`,
		address: {
			street: '',
			city: airport.city,
			country: airport.country,
			formatted: `${airport.iata}, ${airport.city}, ${airport.country}`
		},
		geo: {
			latitude: airport.lat,
			longitude: airport.lon
		},
		timezone: airport.tz
	};
}

/**
 * Convert airport data to search result
 */
function toSearchResult(airport: AirportData): AirportSearchResult {
	return {
		iata: airport.iata,
		icao: airport.icao,
		name: airport.name,
		city: airport.city,
		country: airport.country,
		displayName: `${airport.city} - ${airport.name} (${airport.iata})`,
		location: airportToLocation(airport)
	};
}

/**
 * Search airports by query string
 * Matches against IATA code, ICAO code, airport name, and city name
 * Returns up to `limit` results (default 10)
 */
export function searchAirports(query: string, limit: number = 10): AirportSearchResult[] {
	if (!query || query.length < 2) {
		return [];
	}

	const normalizedQuery = query.toLowerCase().trim();
	const results: AirportSearchResult[] = [];

	// Exact IATA match gets priority
	const exactIata = byIata.get(normalizedQuery.toUpperCase());
	if (exactIata) {
		results.push(toSearchResult(exactIata));
	}

	// Exact ICAO match
	const exactIcao = byIcao.get(normalizedQuery.toUpperCase());
	if (exactIcao && exactIcao !== exactIata) {
		results.push(toSearchResult(exactIcao));
	}

	// Search through all airports for partial matches
	for (const airport of airports) {
		if (results.length >= limit) break;

		// Skip if already added as exact match
		if (airport === exactIata || airport === exactIcao) continue;

		const matchesIata = airport.iata.toLowerCase().includes(normalizedQuery);
		const matchesIcao = airport.icao.toLowerCase().includes(normalizedQuery);
		const matchesName = airport.name.toLowerCase().includes(normalizedQuery);
		const matchesCity = airport.city.toLowerCase().includes(normalizedQuery);

		if (matchesIata || matchesIcao || matchesName || matchesCity) {
			results.push(toSearchResult(airport));
		}
	}

	return results.slice(0, limit);
}

/**
 * Get airport by IATA or ICAO code
 */
export function getAirportByCode(code: string): AirportSearchResult | null {
	if (!code) return null;

	const normalized = code.toUpperCase().trim();

	// Try IATA first (3 letters)
	const byIataResult = byIata.get(normalized);
	if (byIataResult) {
		return toSearchResult(byIataResult);
	}

	// Try ICAO (4 letters)
	const byIcaoResult = byIcao.get(normalized);
	if (byIcaoResult) {
		return toSearchResult(byIcaoResult);
	}

	return null;
}

/**
 * Get Location object for an airport code
 * Convenience function that returns just the Location
 */
export function getAirportLocation(code: string): Location | null {
	const airport = getAirportByCode(code);
	return airport?.location ?? null;
}
