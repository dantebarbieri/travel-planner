import type { GeoLocation } from '$lib/types/travel';

export interface CitySearchResult {
	id: string;
	name: string;
	country: string;
	location: GeoLocation;
	timezone: string;
	population?: number;
}

const fakeCities: CitySearchResult[] = [
	// Europe
	{ id: 'city-paris', name: 'Paris', country: 'France', location: { latitude: 48.8566, longitude: 2.3522 }, timezone: 'Europe/Paris', population: 2161000 },
	{ id: 'city-london', name: 'London', country: 'United Kingdom', location: { latitude: 51.5074, longitude: -0.1278 }, timezone: 'Europe/London', population: 8982000 },
	{ id: 'city-rome', name: 'Rome', country: 'Italy', location: { latitude: 41.9028, longitude: 12.4964 }, timezone: 'Europe/Rome', population: 2873000 },
	{ id: 'city-barcelona', name: 'Barcelona', country: 'Spain', location: { latitude: 41.3874, longitude: 2.1686 }, timezone: 'Europe/Madrid', population: 1620000 },
	{ id: 'city-amsterdam', name: 'Amsterdam', country: 'Netherlands', location: { latitude: 52.3676, longitude: 4.9041 }, timezone: 'Europe/Amsterdam', population: 873000 },
	{ id: 'city-berlin', name: 'Berlin', country: 'Germany', location: { latitude: 52.5200, longitude: 13.4050 }, timezone: 'Europe/Berlin', population: 3645000 },
	{ id: 'city-vienna', name: 'Vienna', country: 'Austria', location: { latitude: 48.2082, longitude: 16.3738 }, timezone: 'Europe/Vienna', population: 1897000 },
	{ id: 'city-prague', name: 'Prague', country: 'Czech Republic', location: { latitude: 50.0755, longitude: 14.4378 }, timezone: 'Europe/Prague', population: 1309000 },
	{ id: 'city-lisbon', name: 'Lisbon', country: 'Portugal', location: { latitude: 38.7223, longitude: -9.1393 }, timezone: 'Europe/Lisbon', population: 505000 },
	{ id: 'city-athens', name: 'Athens', country: 'Greece', location: { latitude: 37.9838, longitude: 23.7275 }, timezone: 'Europe/Athens', population: 664000 },
	{ id: 'city-dublin', name: 'Dublin', country: 'Ireland', location: { latitude: 53.3498, longitude: -6.2603 }, timezone: 'Europe/Dublin', population: 544000 },
	{ id: 'city-zurich', name: 'Zurich', country: 'Switzerland', location: { latitude: 47.3769, longitude: 8.5417 }, timezone: 'Europe/Zurich', population: 402000 },
	{ id: 'city-copenhagen', name: 'Copenhagen', country: 'Denmark', location: { latitude: 55.6761, longitude: 12.5683 }, timezone: 'Europe/Copenhagen', population: 602000 },
	{ id: 'city-stockholm', name: 'Stockholm', country: 'Sweden', location: { latitude: 59.3293, longitude: 18.0686 }, timezone: 'Europe/Stockholm', population: 975000 },
	{ id: 'city-oslo', name: 'Oslo', country: 'Norway', location: { latitude: 59.9139, longitude: 10.7522 }, timezone: 'Europe/Oslo', population: 681000 },
	{ id: 'city-helsinki', name: 'Helsinki', country: 'Finland', location: { latitude: 60.1699, longitude: 24.9384 }, timezone: 'Europe/Helsinki', population: 653000 },
	{ id: 'city-florence', name: 'Florence', country: 'Italy', location: { latitude: 43.7696, longitude: 11.2558 }, timezone: 'Europe/Rome', population: 383000 },
	{ id: 'city-venice', name: 'Venice', country: 'Italy', location: { latitude: 45.4408, longitude: 12.3155 }, timezone: 'Europe/Rome', population: 261000 },
	{ id: 'city-milan', name: 'Milan', country: 'Italy', location: { latitude: 45.4642, longitude: 9.1900 }, timezone: 'Europe/Rome', population: 1352000 },
	{ id: 'city-munich', name: 'Munich', country: 'Germany', location: { latitude: 48.1351, longitude: 11.5820 }, timezone: 'Europe/Berlin', population: 1472000 },
	{ id: 'city-brussels', name: 'Brussels', country: 'Belgium', location: { latitude: 50.8503, longitude: 4.3517 }, timezone: 'Europe/Brussels', population: 185000 },
	{ id: 'city-edinburgh', name: 'Edinburgh', country: 'United Kingdom', location: { latitude: 55.9533, longitude: -3.1883 }, timezone: 'Europe/London', population: 527000 },

	// Asia
	{ id: 'city-tokyo', name: 'Tokyo', country: 'Japan', location: { latitude: 35.6762, longitude: 139.6503 }, timezone: 'Asia/Tokyo', population: 13960000 },
	{ id: 'city-kyoto', name: 'Kyoto', country: 'Japan', location: { latitude: 35.0116, longitude: 135.7681 }, timezone: 'Asia/Tokyo', population: 1475000 },
	{ id: 'city-osaka', name: 'Osaka', country: 'Japan', location: { latitude: 34.6937, longitude: 135.5023 }, timezone: 'Asia/Tokyo', population: 2750000 },
	{ id: 'city-seoul', name: 'Seoul', country: 'South Korea', location: { latitude: 37.5665, longitude: 126.9780 }, timezone: 'Asia/Seoul', population: 9776000 },
	{ id: 'city-singapore', name: 'Singapore', country: 'Singapore', location: { latitude: 1.3521, longitude: 103.8198 }, timezone: 'Asia/Singapore', population: 5686000 },
	{ id: 'city-bangkok', name: 'Bangkok', country: 'Thailand', location: { latitude: 13.7563, longitude: 100.5018 }, timezone: 'Asia/Bangkok', population: 10539000 },
	{ id: 'city-hong-kong', name: 'Hong Kong', country: 'Hong Kong', location: { latitude: 22.3193, longitude: 114.1694 }, timezone: 'Asia/Hong_Kong', population: 7482000 },
	{ id: 'city-taipei', name: 'Taipei', country: 'Taiwan', location: { latitude: 25.0330, longitude: 121.5654 }, timezone: 'Asia/Taipei', population: 2646000 },
	{ id: 'city-beijing', name: 'Beijing', country: 'China', location: { latitude: 39.9042, longitude: 116.4074 }, timezone: 'Asia/Shanghai', population: 21540000 },
	{ id: 'city-shanghai', name: 'Shanghai', country: 'China', location: { latitude: 31.2304, longitude: 121.4737 }, timezone: 'Asia/Shanghai', population: 24280000 },
	{ id: 'city-bali', name: 'Bali', country: 'Indonesia', location: { latitude: -8.4095, longitude: 115.1889 }, timezone: 'Asia/Makassar', population: 4230000 },
	{ id: 'city-hanoi', name: 'Hanoi', country: 'Vietnam', location: { latitude: 21.0278, longitude: 105.8342 }, timezone: 'Asia/Ho_Chi_Minh', population: 8054000 },
	{ id: 'city-ho-chi-minh', name: 'Ho Chi Minh City', country: 'Vietnam', location: { latitude: 10.8231, longitude: 106.6297 }, timezone: 'Asia/Ho_Chi_Minh', population: 8993000 },
	{ id: 'city-mumbai', name: 'Mumbai', country: 'India', location: { latitude: 19.0760, longitude: 72.8777 }, timezone: 'Asia/Kolkata', population: 12442000 },
	{ id: 'city-delhi', name: 'New Delhi', country: 'India', location: { latitude: 28.6139, longitude: 77.2090 }, timezone: 'Asia/Kolkata', population: 16787000 },
	{ id: 'city-dubai', name: 'Dubai', country: 'UAE', location: { latitude: 25.2048, longitude: 55.2708 }, timezone: 'Asia/Dubai', population: 3331000 },

	// North America
	{ id: 'city-new-york', name: 'New York', country: 'USA', location: { latitude: 40.7128, longitude: -74.0060 }, timezone: 'America/New_York', population: 8336817 },
	{ id: 'city-los-angeles', name: 'Los Angeles', country: 'USA', location: { latitude: 34.0522, longitude: -118.2437 }, timezone: 'America/Los_Angeles', population: 3979576 },
	{ id: 'city-san-francisco', name: 'San Francisco', country: 'USA', location: { latitude: 37.7749, longitude: -122.4194 }, timezone: 'America/Los_Angeles', population: 873965 },
	{ id: 'city-chicago', name: 'Chicago', country: 'USA', location: { latitude: 41.8781, longitude: -87.6298 }, timezone: 'America/Chicago', population: 2693976 },
	{ id: 'city-miami', name: 'Miami', country: 'USA', location: { latitude: 25.7617, longitude: -80.1918 }, timezone: 'America/New_York', population: 467963 },
	{ id: 'city-las-vegas', name: 'Las Vegas', country: 'USA', location: { latitude: 36.1699, longitude: -115.1398 }, timezone: 'America/Los_Angeles', population: 651319 },
	{ id: 'city-seattle', name: 'Seattle', country: 'USA', location: { latitude: 47.6062, longitude: -122.3321 }, timezone: 'America/Los_Angeles', population: 737015 },
	{ id: 'city-boston', name: 'Boston', country: 'USA', location: { latitude: 42.3601, longitude: -71.0589 }, timezone: 'America/New_York', population: 692600 },
	{ id: 'city-washington-dc', name: 'Washington D.C.', country: 'USA', location: { latitude: 38.9072, longitude: -77.0369 }, timezone: 'America/New_York', population: 689545 },
	{ id: 'city-toronto', name: 'Toronto', country: 'Canada', location: { latitude: 43.6532, longitude: -79.3832 }, timezone: 'America/Toronto', population: 2930000 },
	{ id: 'city-vancouver', name: 'Vancouver', country: 'Canada', location: { latitude: 49.2827, longitude: -123.1207 }, timezone: 'America/Vancouver', population: 631000 },
	{ id: 'city-montreal', name: 'Montreal', country: 'Canada', location: { latitude: 45.5017, longitude: -73.5673 }, timezone: 'America/Toronto', population: 1780000 },
	{ id: 'city-mexico-city', name: 'Mexico City', country: 'Mexico', location: { latitude: 19.4326, longitude: -99.1332 }, timezone: 'America/Mexico_City', population: 21671908 },
	{ id: 'city-cancun', name: 'Cancun', country: 'Mexico', location: { latitude: 21.1619, longitude: -86.8515 }, timezone: 'America/Cancun', population: 888797 },

	// South America
	{ id: 'city-rio', name: 'Rio de Janeiro', country: 'Brazil', location: { latitude: -22.9068, longitude: -43.1729 }, timezone: 'America/Sao_Paulo', population: 6748000 },
	{ id: 'city-sao-paulo', name: 'São Paulo', country: 'Brazil', location: { latitude: -23.5505, longitude: -46.6333 }, timezone: 'America/Sao_Paulo', population: 12325232 },
	{ id: 'city-buenos-aires', name: 'Buenos Aires', country: 'Argentina', location: { latitude: -34.6037, longitude: -58.3816 }, timezone: 'America/Argentina/Buenos_Aires', population: 2891000 },
	{ id: 'city-lima', name: 'Lima', country: 'Peru', location: { latitude: -12.0464, longitude: -77.0428 }, timezone: 'America/Lima', population: 9751717 },
	{ id: 'city-bogota', name: 'Bogotá', country: 'Colombia', location: { latitude: 4.7110, longitude: -74.0721 }, timezone: 'America/Bogota', population: 7181469 },

	// Oceania
	{ id: 'city-sydney', name: 'Sydney', country: 'Australia', location: { latitude: -33.8688, longitude: 151.2093 }, timezone: 'Australia/Sydney', population: 5312000 },
	{ id: 'city-melbourne', name: 'Melbourne', country: 'Australia', location: { latitude: -37.8136, longitude: 144.9631 }, timezone: 'Australia/Melbourne', population: 5078193 },
	{ id: 'city-auckland', name: 'Auckland', country: 'New Zealand', location: { latitude: -36.8509, longitude: 174.7645 }, timezone: 'Pacific/Auckland', population: 1657000 },
	{ id: 'city-queenstown', name: 'Queenstown', country: 'New Zealand', location: { latitude: -45.0312, longitude: 168.6626 }, timezone: 'Pacific/Auckland', population: 15850 },

	// Africa & Middle East
	{ id: 'city-cape-town', name: 'Cape Town', country: 'South Africa', location: { latitude: -33.9249, longitude: 18.4241 }, timezone: 'Africa/Johannesburg', population: 433688 },
	{ id: 'city-marrakech', name: 'Marrakech', country: 'Morocco', location: { latitude: 31.6295, longitude: -7.9811 }, timezone: 'Africa/Casablanca', population: 928850 },
	{ id: 'city-cairo', name: 'Cairo', country: 'Egypt', location: { latitude: 30.0444, longitude: 31.2357 }, timezone: 'Africa/Cairo', population: 9539673 },
	{ id: 'city-tel-aviv', name: 'Tel Aviv', country: 'Israel', location: { latitude: 32.0853, longitude: 34.7818 }, timezone: 'Asia/Jerusalem', population: 460613 },
	{ id: 'city-istanbul', name: 'Istanbul', country: 'Turkey', location: { latitude: 41.0082, longitude: 28.9784 }, timezone: 'Europe/Istanbul', population: 15462452 }
];

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesQuery(city: CitySearchResult, query: string): boolean {
	const lowerQuery = query.toLowerCase();
	return (
		city.name.toLowerCase().includes(lowerQuery) ||
		city.country.toLowerCase().includes(lowerQuery)
	);
}

export interface CitySearchAdapter {
	search(query: string, limit?: number): Promise<CitySearchResult[]>;
	getById(id: string): Promise<CitySearchResult | null>;
}

export const fakeCityAdapter: CitySearchAdapter = {
	async search(query: string, limit = 10): Promise<CitySearchResult[]> {
		await delay(150 + Math.random() * 100);

		if (!query || query.length < 2) {
			return [];
		}

		return fakeCities
			.filter((city) => matchesQuery(city, query))
			.sort((a, b) => {
				// Prioritize exact name matches
				const aStartsWith = a.name.toLowerCase().startsWith(query.toLowerCase());
				const bStartsWith = b.name.toLowerCase().startsWith(query.toLowerCase());
				if (aStartsWith && !bStartsWith) return -1;
				if (!aStartsWith && bStartsWith) return 1;
				// Then by population
				return (b.population ?? 0) - (a.population ?? 0);
			})
			.slice(0, limit);
	},

	async getById(id: string): Promise<CitySearchResult | null> {
		await delay(50);
		return fakeCities.find((c) => c.id === id) || null;
	}
};
