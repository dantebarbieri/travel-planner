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
		
		// Take the first flight result (usually there's only one for a specific date)
		const flight = flights[0];
		
		// Extract scheduled times from nested structure
		const depTime = parseLocalTime(flight.departure.scheduledTime?.local);
		const arrTime = parseLocalTime(flight.arrival.scheduledTime?.local);
		
		const result: FlightSearchResult = {
			airline: flight.airline?.name || '',
			airlineCode: flight.airline?.iata || flight.airline?.icao || '',
			flightNumber: flight.number,
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
		
		// Cache the result
		// Use FLIGHT_STATUS for near-term flights, FLIGHT_ROUTE for far-future
		const daysAhead = Math.ceil(
			(new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		const cacheType = daysAhead <= 7 ? 'FLIGHT_STATUS' : 'FLIGHT_ROUTE';
		cache.set(cacheKey, result, cacheType);
		
		return result;
	} catch (error) {
		console.error('AeroDataBox flight search error:', error);
		return null;
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
	
	// Since AeroDataBox doesn't have a dedicated airline search,
	// we use a comprehensive static list of major airlines
	const results = MAJOR_AIRLINES.filter(
		a => a.name.toLowerCase().includes(normalizedQuery) ||
		     a.code.toLowerCase().includes(normalizedQuery) ||
		     (a.icaoCode && a.icaoCode.toLowerCase().includes(normalizedQuery))
	);
	
	// Cache for a long time since this is static data
	cache.set(cacheKey, results, 'AIRLINE_SEARCH');
	
	return results;
}

// =============================================================================
// Static Airline Data
// Major airlines for autocomplete (AeroDataBox doesn't have airline search)
// =============================================================================

const MAJOR_AIRLINES: Airline[] = [
	// US Carriers
	{ name: 'American Airlines', code: 'AA', icaoCode: 'AAL', country: 'United States' },
	{ name: 'Delta Air Lines', code: 'DL', icaoCode: 'DAL', country: 'United States' },
	{ name: 'United Airlines', code: 'UA', icaoCode: 'UAL', country: 'United States' },
	{ name: 'Southwest Airlines', code: 'WN', icaoCode: 'SWA', country: 'United States' },
	{ name: 'JetBlue Airways', code: 'B6', icaoCode: 'JBU', country: 'United States' },
	{ name: 'Alaska Airlines', code: 'AS', icaoCode: 'ASA', country: 'United States' },
	{ name: 'Spirit Airlines', code: 'NK', icaoCode: 'NKS', country: 'United States' },
	{ name: 'Frontier Airlines', code: 'F9', icaoCode: 'FFT', country: 'United States' },
	{ name: 'Hawaiian Airlines', code: 'HA', icaoCode: 'HAL', country: 'United States' },
	{ name: 'Allegiant Air', code: 'G4', icaoCode: 'AAY', country: 'United States' },
	
	// European Carriers
	{ name: 'British Airways', code: 'BA', icaoCode: 'BAW', country: 'United Kingdom' },
	{ name: 'Lufthansa', code: 'LH', icaoCode: 'DLH', country: 'Germany' },
	{ name: 'Air France', code: 'AF', icaoCode: 'AFR', country: 'France' },
	{ name: 'KLM Royal Dutch Airlines', code: 'KL', icaoCode: 'KLM', country: 'Netherlands' },
	{ name: 'Iberia', code: 'IB', icaoCode: 'IBE', country: 'Spain' },
	{ name: 'Swiss International Air Lines', code: 'LX', icaoCode: 'SWR', country: 'Switzerland' },
	{ name: 'Austrian Airlines', code: 'OS', icaoCode: 'AUA', country: 'Austria' },
	{ name: 'Brussels Airlines', code: 'SN', icaoCode: 'BEL', country: 'Belgium' },
	{ name: 'SAS Scandinavian Airlines', code: 'SK', icaoCode: 'SAS', country: 'Sweden' },
	{ name: 'Finnair', code: 'AY', icaoCode: 'FIN', country: 'Finland' },
	{ name: 'TAP Air Portugal', code: 'TP', icaoCode: 'TAP', country: 'Portugal' },
	{ name: 'Aer Lingus', code: 'EI', icaoCode: 'EIN', country: 'Ireland' },
	{ name: 'Norwegian Air Shuttle', code: 'DY', icaoCode: 'NAX', country: 'Norway' },
	{ name: 'Vueling Airlines', code: 'VY', icaoCode: 'VLG', country: 'Spain' },
	{ name: 'easyJet', code: 'U2', icaoCode: 'EZY', country: 'United Kingdom' },
	{ name: 'Ryanair', code: 'FR', icaoCode: 'RYR', country: 'Ireland' },
	{ name: 'Wizz Air', code: 'W6', icaoCode: 'WZZ', country: 'Hungary' },
	{ name: 'LOT Polish Airlines', code: 'LO', icaoCode: 'LOT', country: 'Poland' },
	{ name: 'Turkish Airlines', code: 'TK', icaoCode: 'THY', country: 'Turkey' },
	{ name: 'ITA Airways', code: 'AZ', icaoCode: 'ITY', country: 'Italy' },
	{ name: 'Icelandair', code: 'FI', icaoCode: 'ICE', country: 'Iceland' },
	
	// Middle East & Africa
	{ name: 'Emirates', code: 'EK', icaoCode: 'UAE', country: 'United Arab Emirates' },
	{ name: 'Qatar Airways', code: 'QR', icaoCode: 'QTR', country: 'Qatar' },
	{ name: 'Etihad Airways', code: 'EY', icaoCode: 'ETD', country: 'United Arab Emirates' },
	{ name: 'El Al Israel Airlines', code: 'LY', icaoCode: 'ELY', country: 'Israel' },
	{ name: 'Royal Jordanian', code: 'RJ', icaoCode: 'RJA', country: 'Jordan' },
	{ name: 'Saudia', code: 'SV', icaoCode: 'SVA', country: 'Saudi Arabia' },
	{ name: 'South African Airways', code: 'SA', icaoCode: 'SAA', country: 'South Africa' },
	{ name: 'Ethiopian Airlines', code: 'ET', icaoCode: 'ETH', country: 'Ethiopia' },
	{ name: 'EgyptAir', code: 'MS', icaoCode: 'MSR', country: 'Egypt' },
	{ name: 'Royal Air Maroc', code: 'AT', icaoCode: 'RAM', country: 'Morocco' },
	
	// Asia Pacific
	{ name: 'Singapore Airlines', code: 'SQ', icaoCode: 'SIA', country: 'Singapore' },
	{ name: 'Cathay Pacific', code: 'CX', icaoCode: 'CPA', country: 'Hong Kong' },
	{ name: 'Japan Airlines', code: 'JL', icaoCode: 'JAL', country: 'Japan' },
	{ name: 'All Nippon Airways', code: 'NH', icaoCode: 'ANA', country: 'Japan' },
	{ name: 'Korean Air', code: 'KE', icaoCode: 'KAL', country: 'South Korea' },
	{ name: 'Asiana Airlines', code: 'OZ', icaoCode: 'AAR', country: 'South Korea' },
	{ name: 'Thai Airways', code: 'TG', icaoCode: 'THA', country: 'Thailand' },
	{ name: 'Vietnam Airlines', code: 'VN', icaoCode: 'HVN', country: 'Vietnam' },
	{ name: 'Philippine Airlines', code: 'PR', icaoCode: 'PAL', country: 'Philippines' },
	{ name: 'Malaysia Airlines', code: 'MH', icaoCode: 'MAS', country: 'Malaysia' },
	{ name: 'Garuda Indonesia', code: 'GA', icaoCode: 'GIA', country: 'Indonesia' },
	{ name: 'Air India', code: 'AI', icaoCode: 'AIC', country: 'India' },
	{ name: 'Air China', code: 'CA', icaoCode: 'CCA', country: 'China' },
	{ name: 'China Eastern Airlines', code: 'MU', icaoCode: 'CES', country: 'China' },
	{ name: 'China Southern Airlines', code: 'CZ', icaoCode: 'CSN', country: 'China' },
	{ name: 'Hainan Airlines', code: 'HU', icaoCode: 'CHH', country: 'China' },
	{ name: 'EVA Air', code: 'BR', icaoCode: 'EVA', country: 'Taiwan' },
	{ name: 'China Airlines', code: 'CI', icaoCode: 'CAL', country: 'Taiwan' },
	
	// Oceania
	{ name: 'Qantas', code: 'QF', icaoCode: 'QFA', country: 'Australia' },
	{ name: 'Virgin Australia', code: 'VA', icaoCode: 'VOZ', country: 'Australia' },
	{ name: 'Jetstar Airways', code: 'JQ', icaoCode: 'JST', country: 'Australia' },
	{ name: 'Air New Zealand', code: 'NZ', icaoCode: 'ANZ', country: 'New Zealand' },
	{ name: 'Fiji Airways', code: 'FJ', icaoCode: 'FJI', country: 'Fiji' },
	
	// Americas (non-US)
	{ name: 'Air Canada', code: 'AC', icaoCode: 'ACA', country: 'Canada' },
	{ name: 'WestJet', code: 'WS', icaoCode: 'WJA', country: 'Canada' },
	{ name: 'Aeromexico', code: 'AM', icaoCode: 'AMX', country: 'Mexico' },
	{ name: 'Volaris', code: 'Y4', icaoCode: 'VOI', country: 'Mexico' },
	{ name: 'LATAM Airlines', code: 'LA', icaoCode: 'LAN', country: 'Chile' },
	{ name: 'Avianca', code: 'AV', icaoCode: 'AVA', country: 'Colombia' },
	{ name: 'Copa Airlines', code: 'CM', icaoCode: 'CMP', country: 'Panama' },
	{ name: 'Gol Transportes Aéreos', code: 'G3', icaoCode: 'GLO', country: 'Brazil' },
	{ name: 'Azul Brazilian Airlines', code: 'AD', icaoCode: 'AZU', country: 'Brazil' },
	
	// Low-cost carriers (additional)
	{ name: 'AirAsia', code: 'AK', icaoCode: 'AXM', country: 'Malaysia' },
	{ name: 'Scoot', code: 'TR', icaoCode: 'TGW', country: 'Singapore' },
	{ name: 'Cebu Pacific', code: '5J', icaoCode: 'CEB', country: 'Philippines' },
	{ name: 'IndiGo', code: '6E', icaoCode: 'IGO', country: 'India' },
	{ name: 'Peach Aviation', code: 'MM', icaoCode: 'APJ', country: 'Japan' },
	{ name: 'Spring Airlines', code: '9C', icaoCode: 'CQH', country: 'China' },
	{ name: 'Eurowings', code: 'EW', icaoCode: 'EWG', country: 'Germany' },
	{ name: 'Transavia', code: 'HV', icaoCode: 'TRA', country: 'Netherlands' },
];

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
