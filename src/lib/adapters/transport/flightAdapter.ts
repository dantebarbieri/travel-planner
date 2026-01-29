/**
 * Flight adapter exports
 * Uses adsbdb.com for real flight route lookups
 */

import type { FlightAdapter, FlightSearchResult, Airline, Location } from '$lib/types/travel';

// Export adsbdb adapter as the main flight adapter
export { adsbdbFlightAdapter as flightAdapter } from './adsbdbAdapter';

// ============ Fake Flight Adapter (for offline development and testing) ============

// Mock airline data
const airlines: Airline[] = [
	{ name: 'United Airlines', code: 'UA' },
	{ name: 'American Airlines', code: 'AA' },
	{ name: 'Delta Air Lines', code: 'DL' },
	{ name: 'Southwest Airlines', code: 'WN' },
	{ name: 'JetBlue Airways', code: 'B6' },
	{ name: 'Alaska Airlines', code: 'AS' },
	{ name: 'Spirit Airlines', code: 'NK' },
	{ name: 'Frontier Airlines', code: 'F9' },
	{ name: 'Hawaiian Airlines', code: 'HA' },
	{ name: 'Air France', code: 'AF' },
	{ name: 'British Airways', code: 'BA' },
	{ name: 'Lufthansa', code: 'LH' },
	{ name: 'KLM Royal Dutch Airlines', code: 'KL' },
	{ name: 'Japan Airlines', code: 'JL' },
	{ name: 'All Nippon Airways', code: 'NH' },
	{ name: 'Qantas', code: 'QF' },
	{ name: 'Singapore Airlines', code: 'SQ' },
	{ name: 'Emirates', code: 'EK' },
	{ name: 'Cathay Pacific', code: 'CX' },
	{ name: 'Air Canada', code: 'AC' }
];

// Mock airport data by city name
const airports: Record<string, Location> = {
	'San Francisco': {
		name: 'San Francisco International Airport (SFO)',
		address: { street: '', city: 'San Francisco', state: 'CA', country: 'USA', formatted: 'SFO, San Francisco, CA' },
		geo: { latitude: 37.6213, longitude: -122.379 },
		timezone: 'America/Los_Angeles'
	},
	'Los Angeles': {
		name: 'Los Angeles International Airport (LAX)',
		address: { street: '', city: 'Los Angeles', state: 'CA', country: 'USA', formatted: 'LAX, Los Angeles, CA' },
		geo: { latitude: 33.9425, longitude: -118.408 },
		timezone: 'America/Los_Angeles'
	},
	'New York': {
		name: 'John F. Kennedy International Airport (JFK)',
		address: { street: '', city: 'New York', state: 'NY', country: 'USA', formatted: 'JFK, New York, NY' },
		geo: { latitude: 40.6413, longitude: -73.7781 },
		timezone: 'America/New_York'
	},
	Chicago: {
		name: "O'Hare International Airport (ORD)",
		address: { street: '', city: 'Chicago', state: 'IL', country: 'USA', formatted: 'ORD, Chicago, IL' },
		geo: { latitude: 41.9742, longitude: -87.9073 },
		timezone: 'America/Chicago'
	},
	Seattle: {
		name: 'Seattle-Tacoma International Airport (SEA)',
		address: { street: '', city: 'Seattle', state: 'WA', country: 'USA', formatted: 'SEA, Seattle, WA' },
		geo: { latitude: 47.4502, longitude: -122.3088 },
		timezone: 'America/Los_Angeles'
	},
	Miami: {
		name: 'Miami International Airport (MIA)',
		address: { street: '', city: 'Miami', state: 'FL', country: 'USA', formatted: 'MIA, Miami, FL' },
		geo: { latitude: 25.7959, longitude: -80.287 },
		timezone: 'America/New_York'
	},
	Paris: {
		name: 'Charles de Gaulle Airport (CDG)',
		address: { street: '', city: 'Paris', country: 'France', formatted: 'CDG, Paris, France' },
		geo: { latitude: 49.0097, longitude: 2.5479 },
		timezone: 'Europe/Paris'
	},
	London: {
		name: 'Heathrow Airport (LHR)',
		address: { street: '', city: 'London', country: 'UK', formatted: 'LHR, London, UK' },
		geo: { latitude: 51.47, longitude: -0.4543 },
		timezone: 'Europe/London'
	},
	Tokyo: {
		name: 'Narita International Airport (NRT)',
		address: { street: '', city: 'Tokyo', country: 'Japan', formatted: 'NRT, Tokyo, Japan' },
		geo: { latitude: 35.7647, longitude: 140.3864 },
		timezone: 'Asia/Tokyo'
	},
	Sydney: {
		name: 'Sydney Kingsford Smith Airport (SYD)',
		address: { street: '', city: 'Sydney', country: 'Australia', formatted: 'SYD, Sydney, Australia' },
		geo: { latitude: -33.9399, longitude: 151.1753 },
		timezone: 'Australia/Sydney'
	}
};

// Mock flight routes with typical schedules
interface MockRoute {
	airlineCode: string;
	flightNumber: string;
	origin: string;
	destination: string;
	departureTime: string;
	arrivalTime: string;
	duration: number;
	daysOffset: number;
	price: number;
}

const mockRoutes: MockRoute[] = [
	{ airlineCode: 'UA', flightNumber: '123', origin: 'San Francisco', destination: 'Los Angeles', departureTime: '08:00', arrivalTime: '09:30', duration: 90, daysOffset: 0, price: 149 },
	{ airlineCode: 'UA', flightNumber: '456', origin: 'San Francisco', destination: 'New York', departureTime: '07:00', arrivalTime: '15:30', duration: 330, daysOffset: 0, price: 399 },
	{ airlineCode: 'AA', flightNumber: '789', origin: 'San Francisco', destination: 'Chicago', departureTime: '09:00', arrivalTime: '15:00', duration: 240, daysOffset: 0, price: 299 },
	{ airlineCode: 'DL', flightNumber: '234', origin: 'San Francisco', destination: 'Seattle', departureTime: '10:00', arrivalTime: '12:00', duration: 120, daysOffset: 0, price: 179 },
	{ airlineCode: 'BA', flightNumber: '178', origin: 'New York', destination: 'London', departureTime: '20:00', arrivalTime: '08:00', duration: 420, daysOffset: 1, price: 599 },
	{ airlineCode: 'AF', flightNumber: '022', origin: 'New York', destination: 'Paris', departureTime: '19:00', arrivalTime: '08:30', duration: 450, daysOffset: 1, price: 649 }
];

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function addDays(dateStr: string, days: number): string {
	const date = new Date(dateStr);
	date.setDate(date.getDate() + days);
	return date.toISOString().split('T')[0];
}

export const fakeFlightAdapter: FlightAdapter = {
	async searchAirlines(query: string): Promise<Airline[]> {
		await delay(100 + Math.random() * 100);
		const lowerQuery = query.toLowerCase();
		return airlines.filter(
			(a) => a.name.toLowerCase().includes(lowerQuery) || a.code.toLowerCase().includes(lowerQuery)
		);
	},

	async getFlightDetails(
		airlineCode: string,
		flightNumber: string,
		date: string
	): Promise<FlightSearchResult | null> {
		await delay(150 + Math.random() * 100);

		const route = mockRoutes.find(
			(r) => r.airlineCode === airlineCode && r.flightNumber === flightNumber
		);

		if (!route) {
			return null;
		}

		const airline = airlines.find((a) => a.code === route.airlineCode);
		const originAirport = airports[route.origin];
		const destAirport = airports[route.destination];

		return {
			airline: airline?.name || route.airlineCode,
			airlineCode: route.airlineCode,
			flightNumber: route.flightNumber,
			origin: originAirport || {
				name: route.origin,
				address: { street: '', city: route.origin, country: '', formatted: route.origin },
				geo: { latitude: 0, longitude: 0 }
			},
			destination: destAirport || {
				name: route.destination,
				address: { street: '', city: route.destination, country: '', formatted: route.destination },
				geo: { latitude: 0, longitude: 0 }
			},
			departureDate: date,
			departureTime: route.departureTime,
			arrivalDate: addDays(date, route.daysOffset),
			arrivalTime: route.arrivalTime,
			duration: route.duration,
			price: route.price,
			currency: 'USD'
		};
	}
};
