/**
 * adsbdb.com API adapter for flight route lookups
 * Free, public, keyless API for flight tracking data
 * https://www.adsbdb.com/
 */

import type { Location, Airline, FlightSearchResult, FlightAdapter } from '$lib/types/travel';
import { getAirportByCode } from '$lib/adapters/airports/airportAdapter';

// === adsbdb API Response Types ===

interface AdsbdbAirport {
	name: string;
	iata_code: string;
	icao_code: string;
	latitude: number;
	longitude: number;
	municipality: string;
	country_name: string;
	country_iso_name: string;
	elevation: number;
}

interface AdsbdbAirline {
	name: string;
	icao: string;
	iata: string | null;
	country: string;
	country_iso: string;
	callsign: string;
}

interface AdsbdbFlightRoute {
	callsign: string;
	callsign_icao: string;
	callsign_iata: string;
	airline: AdsbdbAirline;
	origin: AdsbdbAirport;
	destination: AdsbdbAirport;
}

interface AdsbdbCallsignResponse {
	response:
		| {
				flightroute: AdsbdbFlightRoute;
		  }
		| string;
}

interface AdsbdbAirlineResponse {
	response: AdsbdbAirline[] | string;
}

// === Constants ===

const API_BASE = 'https://api.adsbdb.com/v0';

// Simple in-memory cache to avoid repeated API calls
const routeCache = new Map<string, AdsbdbFlightRoute | null>();
const airlineCache = new Map<string, AdsbdbAirline[]>();

// === Helper Functions ===

/**
 * Convert adsbdb airport to our Location type
 * Enriches with timezone data from local airports dataset
 */
function airportToLocation(airport: AdsbdbAirport): Location {
	// Try to get full airport data with timezone from local dataset
	// Try IATA first, fallback to ICAO if not found
	const airportData = getAirportByCode(airport.iata_code) || getAirportByCode(airport.icao_code);
	
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
		timezone: airportData?.location.timezone
	};
}

// === API Functions ===

/**
 * Fetch flight route by callsign (e.g., "UA123")
 * Returns origin/destination airports with coordinates
 */
async function getFlightRoute(callsign: string): Promise<AdsbdbFlightRoute | null> {
	const normalized = callsign.toUpperCase().replace(/\s+/g, '');

	if (routeCache.has(normalized)) {
		return routeCache.get(normalized)!;
	}

	try {
		const response = await fetch(`${API_BASE}/callsign/${normalized}`);
		const data: AdsbdbCallsignResponse = await response.json();

		if (typeof data.response === 'string') {
			// Error response ("unknown callsign")
			routeCache.set(normalized, null);
			return null;
		}

		routeCache.set(normalized, data.response.flightroute);
		return data.response.flightroute;
	} catch {
		return null;
	}
}

/**
 * Search airlines by IATA (2-char) or ICAO (3-char) code
 * Note: Does not support name search (e.g., "United" won't work, use "UA")
 */
async function fetchAirlines(code: string): Promise<AdsbdbAirline[]> {
	const normalized = code.toUpperCase().trim();

	if (normalized.length < 2) {
		return []; // API requires min 2 chars
	}

	if (airlineCache.has(normalized)) {
		return airlineCache.get(normalized)!;
	}

	try {
		const response = await fetch(`${API_BASE}/airline/${normalized}`);
		const data: AdsbdbAirlineResponse = await response.json();

		if (typeof data.response === 'string') {
			airlineCache.set(normalized, []);
			return [];
		}

		// Response is always an array
		const airlines = Array.isArray(data.response) ? data.response : [data.response];
		airlineCache.set(normalized, airlines);
		return airlines;
	} catch {
		return [];
	}
}

// === FlightAdapter Implementation ===

export const adsbdbFlightAdapter: FlightAdapter = {
	async searchAirlines(query: string): Promise<Airline[]> {
		const results = await fetchAirlines(query);
		return results.map((a) => ({
			name: a.name,
			code: a.iata || a.icao,
			icaoCode: a.icao,
			country: a.country
		}));
	},

	async getFlightDetails(
		airlineCode: string,
		flightNumber: string,
		date: string
	): Promise<FlightSearchResult | null> {
		const callsign = `${airlineCode}${flightNumber}`;
		const route = await getFlightRoute(callsign);

		if (!route) return null;

		return {
			airline: route.airline.name,
			airlineCode: route.airline.iata || route.airline.icao,
			flightNumber: flightNumber,
			origin: airportToLocation(route.origin),
			destination: airportToLocation(route.destination),
			departureDate: date
			// Note: adsbdb doesn't provide times - user will enter manually
		};
	}
};
