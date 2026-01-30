/**
 * AeroDataBox API adapter for flight and airport data.
 * Uses RapidAPI as the gateway.
 * 
 * API Documentation: https://doc.aerodatabox.com/
 * Free tier: 600 units/month, 2400 requests/month
 * 
 * This is a server-only module ($lib/server/).
 */

import type { Location, Airline, FlightSearchResult } from '$lib/types/travel';
import { cache, flightStatusCacheKey, airlineCacheKey, airportCacheKey } from '$lib/server/db/cache';
import { env } from '$env/dynamic/private';

// =============================================================================
// AeroDataBox API Response Types
// =============================================================================

interface AeroDataBoxAirport {
	icao: string;
	iata?: string;
	name: string;
	shortName?: string;
	municipalityName?: string;
	location?: {
		lat: number;
		lon: number;
	};
	countryCode?: string;
	timeZone?: string;
}

interface AeroDataBoxAirportFull {
	icao: string;
	iata?: string;
	name: string;
	fullName?: string;
	shortName?: string;
	municipalityName?: string;
	location?: {
		lat: number;
		lon: number;
	};
	country?: {
		code: string;
		name: string;
	};
	continent?: {
		code: string;
		name: string;
	};
	timeZone?: string;
	urls?: {
		webSite?: string;
		wikipedia?: string;
		flightRadar?: string;
	};
}

interface AeroDataBoxTimeInfo {
	utc?: string;
	local?: string;
}

interface AeroDataBoxFlightTime {
	scheduledTime?: AeroDataBoxTimeInfo;
	revisedTime?: AeroDataBoxTimeInfo;
	runwayTime?: AeroDataBoxTimeInfo;
	terminal?: string;
	gate?: string;
	baggageBelt?: string;
	quality?: string[];
}

interface AeroDataBoxFlightAirline {
	name: string;
	iata?: string;
	icao?: string;
}

interface AeroDataBoxFlight {
	greatCircleDistance?: {
		meter: number;
		km: number;
		mile: number;
	};
	departure: AeroDataBoxFlightTime & {
		airport: AeroDataBoxAirport;
	};
	arrival: AeroDataBoxFlightTime & {
		airport: AeroDataBoxAirport;
	};
	lastUpdatedUtc?: string;
	number: string;
	callSign?: string;
	status?: string;
	codeshareStatus?: string;
	isCargo?: boolean;
	aircraft?: {
		reg?: string;
		modeS?: string;
		model?: string;
	};
	airline?: AeroDataBoxFlightAirline;
}

// Airline search response (from airport FIDS which includes airline info)
interface AeroDataBoxAirlineInfo {
	name: string;
	iata?: string;
	icao?: string;
}

// =============================================================================
// Constants & Configuration
// =============================================================================

const API_BASE = 'https://aerodatabox.p.rapidapi.com';

function getHeaders(): HeadersInit {
	const apiKey = env.AERODATABOX_API_KEY;
	const host = env.AERODATABOX_HOST || 'aerodatabox.p.rapidapi.com';
	
	if (!apiKey) {
		throw new Error('AERODATABOX_API_KEY environment variable is not set');
	}
	
	return {
		'X-RapidAPI-Key': apiKey,
		'X-RapidAPI-Host': host,
		'Accept': 'application/json'
	};
}

/**
 * Check if AeroDataBox API is configured.
 */
export function isConfigured(): boolean {
	return !!env.AERODATABOX_API_KEY;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert AeroDataBox airport to our Location type.
 */
function airportToLocation(airport: AeroDataBoxAirport): Location {
	const code = airport.iata || airport.icao;
	return {
		name: `${airport.name} (${code})`,
		address: {
			street: '',
			city: airport.municipalityName || '',
			country: airport.countryCode || '',
			formatted: `${code}, ${airport.municipalityName || airport.name}`
		},
		geo: airport.location ? {
			latitude: airport.location.lat,
			longitude: airport.location.lon
		} : { latitude: 0, longitude: 0 },
		timezone: airport.timeZone
	};
}

/**
 * Parse local time string from AeroDataBox 
 * Format: "2026-01-29 18:25-05:00" or "2026-01-30 06:20+00:00"
 * Returns { date: "2026-01-29", time: "18:25" }
 */
function parseLocalTime(timeStr: string | undefined): { date?: string; time?: string } {
	if (!timeStr) return {};
	
	// Format: "YYYY-MM-DD HH:MM+/-HH:MM" or "YYYY-MM-DD HH:MMZ"
	// Remove timezone offset if present
	const withoutTz = timeStr.replace(/[+-]\d{2}:\d{2}$/, '').replace(/Z$/, '');
	const match = withoutTz.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
	
	if (match) {
		return { date: match[1], time: match[2] };
	}
	
	// Also try ISO format with T separator
	const isoMatch = withoutTz.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
	if (isoMatch) {
		return { date: isoMatch[1], time: isoMatch[2] };
	}
	
	return {};
}

/**
 * Calculate flight duration in minutes from departure and arrival times.
 */
function calculateDuration(
	depUtc: string | undefined, 
	arrUtc: string | undefined
): number | undefined {
	if (!depUtc || !arrUtc) return undefined;
	
	try {
		const dep = new Date(depUtc);
		const arr = new Date(arrUtc);
		const diffMs = arr.getTime() - dep.getTime();
		return Math.round(diffMs / (1000 * 60));
	} catch {
		return undefined;
	}
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get flight details by flight number and date.
 * 
 * @param flightNumber - IATA flight number (e.g., "AA100", "UA123")
 * @param date - Departure date in YYYY-MM-DD format
 */
export async function getFlightByNumber(
	flightNumber: string,
	date: string
): Promise<FlightSearchResult | null> {
	const normalizedFlight = flightNumber.toUpperCase().replace(/\s+/g, '');
	const cacheKey = flightStatusCacheKey(normalizedFlight, date);
	
	// Check cache first
	const cached = cache.get<FlightSearchResult>(cacheKey);
	if (cached) {
		return cached;
	}
	
	try {
		const url = `${API_BASE}/flights/number/${normalizedFlight}/${date}`;
		const response = await fetch(url, { headers: getHeaders() });
		
		if (!response.ok) {
			if (response.status === 404) {
				// Flight not found - this is expected for invalid flights
				return null;
			}
			console.error(`AeroDataBox API error: ${response.status} ${response.statusText}`);
			return null;
		}
		
		const flights: AeroDataBoxFlight[] = await response.json();
		
		if (!Array.isArray(flights) || flights.length === 0) {
			return null;
		}
		
		// Parse all flights
		const results = parseFlightsToResults(flights, date);
		
		if (results.length === 0) {
			return null;
		}
		
		// Cache the first result
		const daysAhead = Math.ceil(
			(new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		const cacheType = daysAhead <= 7 ? 'FLIGHT_STATUS' : 'FLIGHT_ROUTE';
		cache.set(cacheKey, results[0], cacheType);
		
		// Return the first result for backwards compatibility
		return results[0];
	} catch (error) {
		console.error('AeroDataBox flight search error:', error);
		return null;
	}
}

/**
 * Extract numeric flight number from full flight number string.
 * Uses airline code from API response when available for accurate extraction.
 * Handles various formats: "UA 100", "5J123", "UA100", etc.
 */
function extractFlightNumber(fullNumber: string, airlineCode: string | undefined): string {
	if (airlineCode) {
		// Use the known airline code to strip it from the flight number
		const escapedCode = airlineCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const codePattern = new RegExp(`^${escapedCode}\\s*`, 'i');
		return fullNumber.replace(codePattern, '');
	}
	// Fallback: strip alphanumeric airline code (1-3 chars) followed by optional space
	// Handles: "UA100", "5J 123", "9C1234", etc.
	return fullNumber.replace(/^[A-Z0-9]{1,3}\s*/i, '');
}

/**
 * Helper to parse API flights to our result format
 */
function parseFlightsToResults(flights: AeroDataBoxFlight[], date: string): FlightSearchResult[] {
	return flights.map(flight => {
		const depTime = parseLocalTime(flight.departure.scheduledTime?.local);
		const arrTime = parseLocalTime(flight.arrival.scheduledTime?.local);
		const airlineCode = flight.airline?.iata || flight.airline?.icao || '';
		
		return {
			airline: flight.airline?.name || '',
			airlineCode,
			flightNumber: extractFlightNumber(flight.number, airlineCode || undefined),
			origin: airportToLocation(flight.departure.airport),
			destination: airportToLocation(flight.arrival.airport),
			departureDate: depTime.date || date,
			departureTime: depTime.time,
			arrivalDate: arrTime.date,
			arrivalTime: arrTime.time,
			duration: calculateDuration(
				flight.departure.scheduledTime?.utc,
				flight.arrival.scheduledTime?.utc
			),
			aircraft: flight.aircraft?.model
		};
	});
}

/**
 * Get ALL flight details by flight number and date (returns all matching flights).
 * 
 * @param flightNumber - IATA flight number (e.g., "AA100", "UA123")
 * @param date - Departure date in YYYY-MM-DD format
 */
export async function getAllFlightsByNumber(
	flightNumber: string,
	date: string
): Promise<FlightSearchResult[]> {
	const normalizedFlight = flightNumber.toUpperCase().replace(/\s+/g, '');
	
	try {
		const url = `${API_BASE}/flights/number/${normalizedFlight}/${date}`;
		const response = await fetch(url, { headers: getHeaders() });
		
		if (!response.ok) {
			if (response.status === 404) {
				return [];
			}
			console.error(`AeroDataBox API error: ${response.status} ${response.statusText}`);
			return [];
		}
		
		const flights: AeroDataBoxFlight[] = await response.json();
		
		if (!Array.isArray(flights) || flights.length === 0) {
			return [];
		}
		
		return parseFlightsToResults(flights, date);
	} catch (error) {
		console.error('AeroDataBox flight search error:', error);
		return [];
	}
}

/**
 * Get airport information by IATA or ICAO code.
 */
export async function getAirport(code: string): Promise<AeroDataBoxAirportFull | null> {
	const normalizedCode = code.toUpperCase().trim();
	const cacheKey = airportCacheKey(normalizedCode);
	
	// Check cache first
	const cached = cache.get<AeroDataBoxAirportFull>(cacheKey);
	if (cached) {
		return cached;
	}
	
	try {
		const url = `${API_BASE}/airports/iata/${normalizedCode}`;
		const response = await fetch(url, { headers: getHeaders() });
		
		if (!response.ok) {
			if (response.status === 404) {
				// Try ICAO if IATA fails
				const icaoUrl = `${API_BASE}/airports/icao/${normalizedCode}`;
				const icaoResponse = await fetch(icaoUrl, { headers: getHeaders() });
				
				if (!icaoResponse.ok) {
					return null;
				}
				
				const airport: AeroDataBoxAirportFull = await icaoResponse.json();
				cache.set(cacheKey, airport, 'AIRPORT_DATA');
				return airport;
			}
			console.error(`AeroDataBox airport API error: ${response.status}`);
			return null;
		}
		
		const airport: AeroDataBoxAirportFull = await response.json();
		cache.set(cacheKey, airport, 'AIRPORT_DATA');
		return airport;
	} catch (error) {
		console.error('AeroDataBox airport fetch error:', error);
		return null;
	}
}

/**
 * Convert AeroDataBox airport data to Location type.
 */
export async function getAirportLocation(code: string): Promise<Location | null> {
	const airport = await getAirport(code);
	if (!airport) return null;
	
	const airportCode = airport.iata || airport.icao;
	return {
		name: `${airport.name} (${airportCode})`,
		address: {
			street: '',
			city: airport.municipalityName || '',
			country: airport.country?.name || airport.country?.code || '',
			formatted: `${airportCode}, ${airport.municipalityName || airport.name}`
		},
		geo: airport.location ? {
			latitude: airport.location.lat,
			longitude: airport.location.lon
		} : { latitude: 0, longitude: 0 },
		timezone: airport.timeZone
	};
}

// =============================================================================
// Lazy-loaded Airline Data
// Major airlines for autocomplete (AeroDataBox doesn't have airline search)
// Data is loaded only when searchAirlines is first called
// =============================================================================

let airlinesData: Airline[] | null = null;

/**
 * Lazily load airlines data from JSON file.
 * Only loads once and caches in memory.
 */
async function getAirlinesData(): Promise<Airline[]> {
	if (airlinesData) return airlinesData;
	
	// Dynamic import to avoid loading at module initialization
	const data = await import('../data/airlines.json');
	airlinesData = data.default as Airline[];
	return airlinesData;
}

/**
 * Search airlines by name or code.
 * Note: AeroDataBox doesn't have a dedicated airline search endpoint,
 * so we maintain a static list of major airlines for autocomplete.
 */
export async function searchAirlines(query: string): Promise<Airline[]> {
	const normalizedQuery = query.toLowerCase().trim();
	if (normalizedQuery.length < 2) return [];
	
	const cacheKey = airlineCacheKey(normalizedQuery);
	
	// Check cache first
	const cached = cache.get<Airline[]>(cacheKey);
	if (cached) {
		return cached;
	}
	
	// Load airlines data lazily
	const airlines = await getAirlinesData();
	
	const results = airlines.filter(
		a => a.name.toLowerCase().includes(normalizedQuery) ||
		     a.code.toLowerCase().includes(normalizedQuery) ||
		     (a.icaoCode && a.icaoCode.toLowerCase().includes(normalizedQuery))
	);
	
	// Cache for a long time since this is static data
	cache.set(cacheKey, results, 'AIRLINE_SEARCH');
	
	return results;
}

// =============================================================================
// Exports
// =============================================================================

export const aerodataboxAdapter = {
	isConfigured,
	getFlightByNumber,
	getAirport,
	getAirportLocation,
	searchAirlines
};
