import type { TrainBusAdapter, TrainBusSearchParams, TrainBusSearchResult, Location } from '$lib/types/travel';

// Mock station data by city name
const trainStations: Record<string, Location> = {
	'San Francisco': {
		name: 'San Francisco Caltrain Station',
		address: { street: '700 4th St', city: 'San Francisco', state: 'CA', country: 'USA', formatted: '700 4th St, San Francisco, CA' },
		geo: { latitude: 37.7765, longitude: -122.3942 },
		timezone: 'America/Los_Angeles'
	},
	'San Jose': {
		name: 'San Jose Diridon Station',
		address: { street: '65 Cahill St', city: 'San Jose', state: 'CA', country: 'USA', formatted: '65 Cahill St, San Jose, CA' },
		geo: { latitude: 37.3297, longitude: -121.9023 },
		timezone: 'America/Los_Angeles'
	},
	'Los Angeles': {
		name: 'Los Angeles Union Station',
		address: { street: '800 N Alameda St', city: 'Los Angeles', state: 'CA', country: 'USA', formatted: '800 N Alameda St, Los Angeles, CA' },
		geo: { latitude: 34.0561, longitude: -118.2365 },
		timezone: 'America/Los_Angeles'
	},
	'San Diego': {
		name: 'San Diego Santa Fe Depot',
		address: { street: '1050 Kettner Blvd', city: 'San Diego', state: 'CA', country: 'USA', formatted: '1050 Kettner Blvd, San Diego, CA' },
		geo: { latitude: 32.7198, longitude: -117.1687 },
		timezone: 'America/Los_Angeles'
	},
	'Seattle': {
		name: 'King Street Station',
		address: { street: '303 S Jackson St', city: 'Seattle', state: 'WA', country: 'USA', formatted: '303 S Jackson St, Seattle, WA' },
		geo: { latitude: 47.5987, longitude: -122.3305 },
		timezone: 'America/Los_Angeles'
	},
	'Portland': {
		name: 'Portland Union Station',
		address: { street: '800 NW 6th Ave', city: 'Portland', state: 'OR', country: 'USA', formatted: '800 NW 6th Ave, Portland, OR' },
		geo: { latitude: 45.5289, longitude: -122.6766 },
		timezone: 'America/Los_Angeles'
	},
	'New York': {
		name: 'Penn Station',
		address: { street: '8th Ave & 31st St', city: 'New York', state: 'NY', country: 'USA', formatted: 'Penn Station, New York, NY' },
		geo: { latitude: 40.7506, longitude: -73.9935 },
		timezone: 'America/New_York'
	},
	'Washington DC': {
		name: 'Union Station',
		address: { street: '50 Massachusetts Ave NE', city: 'Washington', state: 'DC', country: 'USA', formatted: 'Union Station, Washington, DC' },
		geo: { latitude: 38.8973, longitude: -77.0063 },
		timezone: 'America/New_York'
	},
	'Boston': {
		name: 'South Station',
		address: { street: '700 Atlantic Ave', city: 'Boston', state: 'MA', country: 'USA', formatted: 'South Station, Boston, MA' },
		geo: { latitude: 42.3519, longitude: -71.0552 },
		timezone: 'America/New_York'
	},
	'Chicago': {
		name: 'Chicago Union Station',
		address: { street: '225 S Canal St', city: 'Chicago', state: 'IL', country: 'USA', formatted: 'Union Station, Chicago, IL' },
		geo: { latitude: 41.8788, longitude: -87.6402 },
		timezone: 'America/Chicago'
	},
	'Paris': {
		name: 'Gare du Nord',
		address: { street: '18 Rue de Dunkerque', city: 'Paris', country: 'France', formatted: 'Gare du Nord, Paris, France' },
		geo: { latitude: 48.8809, longitude: 2.3553 },
		timezone: 'Europe/Paris'
	},
	'London': {
		name: 'St Pancras International',
		address: { street: 'Euston Rd', city: 'London', country: 'UK', formatted: "St Pancras Int'l, London, UK" },
		geo: { latitude: 51.5322, longitude: -0.1269 },
		timezone: 'Europe/London'
	}
};

const busStations: Record<string, Location> = {
	'San Francisco': {
		name: 'San Francisco Greyhound Station',
		address: { street: '200 Folsom St', city: 'San Francisco', state: 'CA', country: 'USA', formatted: '200 Folsom St, San Francisco, CA' },
		geo: { latitude: 37.7898, longitude: -122.3925 },
		timezone: 'America/Los_Angeles'
	},
	'Los Angeles': {
		name: 'Los Angeles Greyhound Station',
		address: { street: '1716 E 7th St', city: 'Los Angeles', state: 'CA', country: 'USA', formatted: '1716 E 7th St, Los Angeles, CA' },
		geo: { latitude: 34.0318, longitude: -118.2352 },
		timezone: 'America/Los_Angeles'
	},
	'San Diego': {
		name: 'San Diego Greyhound Station',
		address: { street: '1313 National City Blvd', city: 'San Diego', state: 'CA', country: 'USA', formatted: '1313 National City Blvd, San Diego, CA' },
		geo: { latitude: 32.6697, longitude: -117.0997 },
		timezone: 'America/Los_Angeles'
	},
	'New York': {
		name: 'Port Authority Bus Terminal',
		address: { street: '625 8th Ave', city: 'New York', state: 'NY', country: 'USA', formatted: 'Port Authority, New York, NY' },
		geo: { latitude: 40.7571, longitude: -73.9901 },
		timezone: 'America/New_York'
	},
	'Washington DC': {
		name: 'Washington Union Station Bus',
		address: { street: '50 Massachusetts Ave NE', city: 'Washington', state: 'DC', country: 'USA', formatted: 'Union Station Bus, Washington, DC' },
		geo: { latitude: 38.8973, longitude: -77.0063 },
		timezone: 'America/New_York'
	},
	'Boston': {
		name: 'South Station Bus Terminal',
		address: { street: '700 Atlantic Ave', city: 'Boston', state: 'MA', country: 'USA', formatted: 'South Station Bus, Boston, MA' },
		geo: { latitude: 42.3519, longitude: -71.0552 },
		timezone: 'America/New_York'
	}
};

// Mock routes
interface MockTrainBusRoute {
	carrier: string;
	routeNumber?: string;
	routeName?: string;
	origin: string;
	destination: string;
	departureTime: string;
	arrivalTime: string;
	duration: number; // minutes
	daysOffset: number;
	mode: 'train' | 'bus';
	price: number;
}

const mockRoutes: MockTrainBusRoute[] = [
	// Amtrak routes
	{ carrier: 'Amtrak', routeNumber: '11', routeName: 'Coast Starlight', origin: 'Seattle', destination: 'Los Angeles', departureTime: '09:45', arrivalTime: '21:00', duration: 2115, daysOffset: 1, mode: 'train', price: 149 },
	{ carrier: 'Amtrak', routeNumber: '14', routeName: 'Coast Starlight', origin: 'Los Angeles', destination: 'Seattle', departureTime: '10:10', arrivalTime: '08:25', duration: 2115, daysOffset: 1, mode: 'train', price: 149 },
	{ carrier: 'Amtrak', routeNumber: '768', routeName: 'Pacific Surfliner', origin: 'San Diego', destination: 'Los Angeles', departureTime: '06:00', arrivalTime: '08:45', duration: 165, daysOffset: 0, mode: 'train', price: 37 },
	{ carrier: 'Amtrak', routeNumber: '763', routeName: 'Pacific Surfliner', origin: 'Los Angeles', destination: 'San Diego', departureTime: '17:35', arrivalTime: '20:25', duration: 170, daysOffset: 0, mode: 'train', price: 37 },
	{ carrier: 'Amtrak', routeNumber: '2150', routeName: 'Acela', origin: 'New York', destination: 'Washington DC', departureTime: '07:00', arrivalTime: '09:52', duration: 172, daysOffset: 0, mode: 'train', price: 89 },
	{ carrier: 'Amtrak', routeNumber: '2151', routeName: 'Acela', origin: 'Washington DC', destination: 'New York', departureTime: '06:00', arrivalTime: '08:52', duration: 172, daysOffset: 0, mode: 'train', price: 89 },
	{ carrier: 'Amtrak', routeNumber: '2158', routeName: 'Acela', origin: 'New York', destination: 'Boston', departureTime: '08:00', arrivalTime: '11:30', duration: 210, daysOffset: 0, mode: 'train', price: 79 },
	{ carrier: 'Amtrak', routeNumber: '2163', routeName: 'Acela', origin: 'Boston', destination: 'New York', departureTime: '07:05', arrivalTime: '10:35', duration: 210, daysOffset: 0, mode: 'train', price: 79 },

	// Caltrain routes
	{ carrier: 'Caltrain', routeNumber: '101', routeName: 'Local', origin: 'San Francisco', destination: 'San Jose', departureTime: '06:30', arrivalTime: '07:55', duration: 85, daysOffset: 0, mode: 'train', price: 10 },
	{ carrier: 'Caltrain', routeNumber: '102', routeName: 'Local', origin: 'San Jose', destination: 'San Francisco', departureTime: '07:00', arrivalTime: '08:25', duration: 85, daysOffset: 0, mode: 'train', price: 10 },
	{ carrier: 'Caltrain', routeNumber: '207', routeName: 'Baby Bullet', origin: 'San Francisco', destination: 'San Jose', departureTime: '08:00', arrivalTime: '08:57', duration: 57, daysOffset: 0, mode: 'train', price: 10 },

	// Eurostar routes
	{ carrier: 'Eurostar', routeNumber: '9014', routeName: 'London-Paris', origin: 'London', destination: 'Paris', departureTime: '07:01', arrivalTime: '10:17', duration: 136, daysOffset: 0, mode: 'train', price: 69 },
	{ carrier: 'Eurostar', routeNumber: '9015', routeName: 'Paris-London', origin: 'Paris', destination: 'London', departureTime: '08:13', arrivalTime: '09:30', duration: 137, daysOffset: 0, mode: 'train', price: 69 },

	// Greyhound routes
	{ carrier: 'Greyhound', routeNumber: '', routeName: 'SF to LA', origin: 'San Francisco', destination: 'Los Angeles', departureTime: '07:00', arrivalTime: '14:30', duration: 450, daysOffset: 0, mode: 'bus', price: 35 },
	{ carrier: 'Greyhound', routeNumber: '', routeName: 'LA to SF', origin: 'Los Angeles', destination: 'San Francisco', departureTime: '08:00', arrivalTime: '15:30', duration: 450, daysOffset: 0, mode: 'bus', price: 35 },
	{ carrier: 'Greyhound', routeNumber: '', routeName: 'LA to San Diego', origin: 'Los Angeles', destination: 'San Diego', departureTime: '09:00', arrivalTime: '11:30', duration: 150, daysOffset: 0, mode: 'bus', price: 19 },

	// FlixBus routes
	{ carrier: 'FlixBus', routeNumber: '', routeName: 'NY to DC', origin: 'New York', destination: 'Washington DC', departureTime: '06:30', arrivalTime: '11:00', duration: 270, daysOffset: 0, mode: 'bus', price: 25 },
	{ carrier: 'FlixBus', routeNumber: '', routeName: 'DC to NY', origin: 'Washington DC', destination: 'New York', departureTime: '07:00', arrivalTime: '11:30', duration: 270, daysOffset: 0, mode: 'bus', price: 25 },
	{ carrier: 'FlixBus', routeNumber: '', routeName: 'NY to Boston', origin: 'New York', destination: 'Boston', departureTime: '08:00', arrivalTime: '12:30', duration: 270, daysOffset: 0, mode: 'bus', price: 29 },

	// Megabus routes
	{ carrier: 'Megabus', routeNumber: '', routeName: 'NY to DC Express', origin: 'New York', destination: 'Washington DC', departureTime: '07:00', arrivalTime: '11:15', duration: 255, daysOffset: 0, mode: 'bus', price: 20 },
	{ carrier: 'Megabus', routeNumber: '', routeName: 'Boston to NY', origin: 'Boston', destination: 'New York', departureTime: '06:00', arrivalTime: '10:15', duration: 255, daysOffset: 0, mode: 'bus', price: 22 }
];

const trainCarriers = ['Amtrak', 'Caltrain', 'BART', 'Metrolink', 'Eurostar', 'Deutsche Bahn', 'SNCF', 'Trenitalia'];
const busCarriers = ['Greyhound', 'FlixBus', 'Megabus', 'BoltBus', 'OurBus'];

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function addDays(dateStr: string, days: number): string {
	const date = new Date(dateStr);
	date.setDate(date.getDate() + days);
	return date.toISOString().split('T')[0];
}

function getStation(city: string, mode: 'train' | 'bus'): Location {
	const stations = mode === 'train' ? trainStations : busStations;
	return (
		stations[city] || {
			name: `${city} ${mode === 'train' ? 'Train' : 'Bus'} Station`,
			address: { street: '', city, country: '', formatted: city },
			geo: { latitude: 0, longitude: 0 }
		}
	);
}

export const fakeTrainBusAdapter: TrainBusAdapter = {
	async searchRoutes(params: TrainBusSearchParams): Promise<TrainBusSearchResult[]> {
		await delay(200 + Math.random() * 150);

		let results = mockRoutes.filter((r) => r.mode === params.mode);

		// Filter by query (matches carrier, route name, origin, or destination)
		if (params.query) {
			const lowerQuery = params.query.toLowerCase();
			results = results.filter(
				(r) =>
					r.carrier.toLowerCase().includes(lowerQuery) ||
					r.routeName?.toLowerCase().includes(lowerQuery) ||
					r.origin.toLowerCase().includes(lowerQuery) ||
					r.destination.toLowerCase().includes(lowerQuery)
			);
		}

		// Map to TrainBusSearchResult
		return results.map((route) => ({
			carrier: route.carrier,
			routeNumber: route.routeNumber || undefined,
			routeName: route.routeName,
			origin: getStation(route.origin, route.mode),
			destination: getStation(route.destination, route.mode),
			departureDate: params.departureDate,
			departureTime: route.departureTime,
			arrivalDate: addDays(params.departureDate, route.daysOffset),
			arrivalTime: route.arrivalTime,
			duration: route.duration,
			mode: route.mode,
			price: route.price,
			currency: 'USD'
		}));
	},

	async getCarriers(cityLocation: Location, mode: 'train' | 'bus'): Promise<string[]> {
		await delay(100);
		// In a real implementation, this would filter based on city location
		return mode === 'train' ? trainCarriers : busCarriers;
	}
};
