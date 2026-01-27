import type { FlightAdapter, FlightSearchParams, FlightSearchResult, Airline, Location } from '$lib/types/travel';

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
	'Chicago': {
		name: "O'Hare International Airport (ORD)",
		address: { street: '', city: 'Chicago', state: 'IL', country: 'USA', formatted: 'ORD, Chicago, IL' },
		geo: { latitude: 41.9742, longitude: -87.9073 },
		timezone: 'America/Chicago'
	},
	'Seattle': {
		name: 'Seattle-Tacoma International Airport (SEA)',
		address: { street: '', city: 'Seattle', state: 'WA', country: 'USA', formatted: 'SEA, Seattle, WA' },
		geo: { latitude: 47.4502, longitude: -122.3088 },
		timezone: 'America/Los_Angeles'
	},
	'Miami': {
		name: 'Miami International Airport (MIA)',
		address: { street: '', city: 'Miami', state: 'FL', country: 'USA', formatted: 'MIA, Miami, FL' },
		geo: { latitude: 25.7959, longitude: -80.287 },
		timezone: 'America/New_York'
	},
	'Paris': {
		name: 'Charles de Gaulle Airport (CDG)',
		address: { street: '', city: 'Paris', country: 'France', formatted: 'CDG, Paris, France' },
		geo: { latitude: 49.0097, longitude: 2.5479 },
		timezone: 'Europe/Paris'
	},
	'London': {
		name: 'Heathrow Airport (LHR)',
		address: { street: '', city: 'London', country: 'UK', formatted: 'LHR, London, UK' },
		geo: { latitude: 51.47, longitude: -0.4543 },
		timezone: 'Europe/London'
	},
	'Tokyo': {
		name: 'Narita International Airport (NRT)',
		address: { street: '', city: 'Tokyo', country: 'Japan', formatted: 'NRT, Tokyo, Japan' },
		geo: { latitude: 35.7647, longitude: 140.3864 },
		timezone: 'Asia/Tokyo'
	},
	'Sydney': {
		name: 'Sydney Kingsford Smith Airport (SYD)',
		address: { street: '', city: 'Sydney', country: 'Australia', formatted: 'SYD, Sydney, Australia' },
		geo: { latitude: -33.9399, longitude: 151.1753 },
		timezone: 'Australia/Sydney'
	},
	'San Diego': {
		name: 'San Diego International Airport (SAN)',
		address: { street: '', city: 'San Diego', state: 'CA', country: 'USA', formatted: 'SAN, San Diego, CA' },
		geo: { latitude: 32.7338, longitude: -117.1933 },
		timezone: 'America/Los_Angeles'
	},
	'Monterey': {
		name: 'Monterey Regional Airport (MRY)',
		address: { street: '', city: 'Monterey', state: 'CA', country: 'USA', formatted: 'MRY, Monterey, CA' },
		geo: { latitude: 36.587, longitude: -121.843 },
		timezone: 'America/Los_Angeles'
	},
	'Denver': {
		name: 'Denver International Airport (DEN)',
		address: { street: '', city: 'Denver', state: 'CO', country: 'USA', formatted: 'DEN, Denver, CO' },
		geo: { latitude: 39.8561, longitude: -104.6737 },
		timezone: 'America/Denver'
	},
	'Boston': {
		name: 'Logan International Airport (BOS)',
		address: { street: '', city: 'Boston', state: 'MA', country: 'USA', formatted: 'BOS, Boston, MA' },
		geo: { latitude: 42.3656, longitude: -71.0096 },
		timezone: 'America/New_York'
	},
	'Atlanta': {
		name: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
		address: { street: '', city: 'Atlanta', state: 'GA', country: 'USA', formatted: 'ATL, Atlanta, GA' },
		geo: { latitude: 33.6407, longitude: -84.4277 },
		timezone: 'America/New_York'
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
	duration: number; // minutes
	daysOffset: number; // 0 = same day, 1 = next day arrival
	price: number;
}

const mockRoutes: MockRoute[] = [
	// SFO routes
	{ airlineCode: 'UA', flightNumber: '123', origin: 'San Francisco', destination: 'Los Angeles', departureTime: '08:00', arrivalTime: '09:30', duration: 90, daysOffset: 0, price: 149 },
	{ airlineCode: 'UA', flightNumber: '456', origin: 'San Francisco', destination: 'New York', departureTime: '07:00', arrivalTime: '15:30', duration: 330, daysOffset: 0, price: 399 },
	{ airlineCode: 'AA', flightNumber: '789', origin: 'San Francisco', destination: 'Chicago', departureTime: '09:00', arrivalTime: '15:00', duration: 240, daysOffset: 0, price: 299 },
	{ airlineCode: 'DL', flightNumber: '234', origin: 'San Francisco', destination: 'Seattle', departureTime: '10:00', arrivalTime: '12:00', duration: 120, daysOffset: 0, price: 179 },
	{ airlineCode: 'UA', flightNumber: '567', origin: 'San Francisco', destination: 'Tokyo', departureTime: '13:00', arrivalTime: '17:00', duration: 660, daysOffset: 1, price: 899 },
	{ airlineCode: 'AF', flightNumber: '083', origin: 'San Francisco', destination: 'Paris', departureTime: '18:00', arrivalTime: '14:00', duration: 660, daysOffset: 1, price: 749 },

	// LAX routes
	{ airlineCode: 'AA', flightNumber: '100', origin: 'Los Angeles', destination: 'San Francisco', departureTime: '07:00', arrivalTime: '08:30', duration: 90, daysOffset: 0, price: 149 },
	{ airlineCode: 'DL', flightNumber: '200', origin: 'Los Angeles', destination: 'New York', departureTime: '08:00', arrivalTime: '16:00', duration: 300, daysOffset: 0, price: 349 },
	{ airlineCode: 'UA', flightNumber: '300', origin: 'Los Angeles', destination: 'Miami', departureTime: '09:00', arrivalTime: '17:00', duration: 300, daysOffset: 0, price: 299 },
	{ airlineCode: 'QF', flightNumber: '012', origin: 'Los Angeles', destination: 'Sydney', departureTime: '22:00', arrivalTime: '08:00', duration: 840, daysOffset: 2, price: 1299 },

	// JFK routes
	{ airlineCode: 'BA', flightNumber: '178', origin: 'New York', destination: 'London', departureTime: '20:00', arrivalTime: '08:00', duration: 420, daysOffset: 1, price: 599 },
	{ airlineCode: 'AF', flightNumber: '022', origin: 'New York', destination: 'Paris', departureTime: '19:00', arrivalTime: '08:30', duration: 450, daysOffset: 1, price: 649 },
	{ airlineCode: 'DL', flightNumber: '400', origin: 'New York', destination: 'San Francisco', departureTime: '08:00', arrivalTime: '11:30', duration: 390, daysOffset: 0, price: 399 },

	// International routes
	{ airlineCode: 'JL', flightNumber: '001', origin: 'Tokyo', destination: 'San Francisco', departureTime: '17:00', arrivalTime: '10:00', duration: 540, daysOffset: 0, price: 899 },
	{ airlineCode: 'EK', flightNumber: '215', origin: 'London', destination: 'New York', departureTime: '09:00', arrivalTime: '12:00', duration: 480, daysOffset: 0, price: 699 },
	{ airlineCode: 'SQ', flightNumber: '025', origin: 'San Francisco', destination: 'Tokyo', departureTime: '01:00', arrivalTime: '05:00', duration: 660, daysOffset: 1, price: 999 }
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

	async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult[]> {
		await delay(200 + Math.random() * 150);

		let results = mockRoutes;

		// Filter by airline
		if (params.airlineCode) {
			results = results.filter((r) => r.airlineCode === params.airlineCode);
		}

		// Filter by flight number (partial match)
		if (params.flightNumber) {
			results = results.filter((r) => r.flightNumber.includes(params.flightNumber!));
		}

		// Map to FlightSearchResult
		return results.map((route) => {
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
				departureDate: params.departureDate,
				departureTime: route.departureTime,
				arrivalDate: addDays(params.departureDate, route.daysOffset),
				arrivalTime: route.arrivalTime,
				duration: route.duration,
				price: route.price,
				currency: 'USD'
			};
		});
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
