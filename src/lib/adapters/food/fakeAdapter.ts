import type { FoodAdapter, FoodSearchParams, FoodVenue } from '$lib/types/travel';

const fakeFoodVenues: FoodVenue[] = [
	{
		id: 'food-paris-001',
		name: 'Le Petit Cler',
		venueType: 'restaurant',
		cuisineTypes: ['French', 'Bistro'],
		location: {
			name: 'Le Petit Cler',
			address: {
				street: '29 Rue Cler',
				city: 'Paris',
				country: 'France',
				formatted: '29 Rue Cler, 75007 Paris, France'
			},
			geo: { latitude: 48.8571, longitude: 2.3060 }
		},
		priceLevel: 2,
		estimatedCost: 35,
		currency: 'EUR',
		menuUrl: 'https://example.com/lepetitcler/menu',
		website: 'https://example.com/lepetitcler',
		phone: '+33 1 45 51 78 00',
		openingHours: {
			monday: { open: '12:00', close: '22:00' },
			tuesday: { open: '12:00', close: '22:00' },
			wednesday: { open: '12:00', close: '22:00' },
			thursday: { open: '12:00', close: '22:00' },
			friday: { open: '12:00', close: '23:00' },
			saturday: { open: '12:00', close: '23:00' },
			sunday: { open: '12:00', close: '21:00' }
		},
		rating: 4.5,
		reviewCount: 892
	},
	{
		id: 'food-paris-002',
		name: 'Café de Flore',
		venueType: 'cafe',
		cuisineTypes: ['French', 'Cafe'],
		location: {
			name: 'Café de Flore',
			address: {
				street: '172 Boulevard Saint-Germain',
				city: 'Paris',
				country: 'France',
				formatted: '172 Boulevard Saint-Germain, 75006 Paris, France'
			},
			geo: { latitude: 48.8540, longitude: 2.3325 }
		},
		priceLevel: 3,
		estimatedCost: 25,
		currency: 'EUR',
		menuUrl: 'https://example.com/cafedeflore/menu',
		website: 'https://example.com/cafedeflore',
		openingHours: {
			monday: { open: '07:30', close: '01:30' },
			tuesday: { open: '07:30', close: '01:30' },
			wednesday: { open: '07:30', close: '01:30' },
			thursday: { open: '07:30', close: '01:30' },
			friday: { open: '07:30', close: '01:30' },
			saturday: { open: '07:30', close: '01:30' },
			sunday: { open: '07:30', close: '01:30' }
		},
		rating: 4.2,
		reviewCount: 15420
	},
	{
		id: 'food-paris-003',
		name: 'Pink Mamma',
		venueType: 'restaurant',
		cuisineTypes: ['Italian', 'Pizza'],
		location: {
			name: 'Pink Mamma',
			address: {
				street: '20 Rue de Douai',
				city: 'Paris',
				country: 'France',
				formatted: '20 Rue de Douai, 75009 Paris, France'
			},
			geo: { latitude: 48.8819, longitude: 2.3322 }
		},
		priceLevel: 2,
		estimatedCost: 30,
		currency: 'EUR',
		menuUrl: 'https://example.com/pinkmamma/menu',
		reservationRequired: true,
		reservationUrl: 'https://example.com/pinkmamma/reserve',
		rating: 4.6,
		reviewCount: 8750
	},
	{
		id: 'food-tokyo-001',
		name: 'Sukiyabashi Jiro',
		venueType: 'fine_dining',
		cuisineTypes: ['Japanese', 'Sushi'],
		location: {
			name: 'Sukiyabashi Jiro',
			address: {
				street: 'Tsukamoto Sogyo Building B1F, 4-2-15 Ginza',
				city: 'Tokyo',
				country: 'Japan',
				formatted: 'Tsukamoto Sogyo Building B1F, 4-2-15 Ginza, Chuo-ku, Tokyo, Japan'
			},
			geo: { latitude: 35.6721, longitude: 139.7636 }
		},
		priceLevel: 4,
		estimatedCost: 300,
		currency: 'JPY',
		reservationRequired: true,
		rating: 4.9,
		reviewCount: 2340
	},
	{
		id: 'food-tokyo-002',
		name: 'Ichiran Shibuya',
		venueType: 'restaurant',
		cuisineTypes: ['Japanese', 'Ramen'],
		location: {
			name: 'Ichiran Shibuya',
			address: {
				street: '1-22-7 Jinnan',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '1-22-7 Jinnan, Shibuya-ku, Tokyo, Japan'
			},
			geo: { latitude: 35.6614, longitude: 139.6993 }
		},
		priceLevel: 1,
		estimatedCost: 15,
		currency: 'JPY',
		openingHours: {
			monday: { open: '10:00', close: '04:00' },
			tuesday: { open: '10:00', close: '04:00' },
			wednesday: { open: '10:00', close: '04:00' },
			thursday: { open: '10:00', close: '04:00' },
			friday: { open: '10:00', close: '04:00' },
			saturday: { open: '10:00', close: '04:00' },
			sunday: { open: '10:00', close: '04:00' }
		},
		rating: 4.4,
		reviewCount: 12500
	},
	{
		id: 'food-sydney-001',
		name: 'Quay Restaurant',
		venueType: 'fine_dining',
		cuisineTypes: ['Australian', 'Modern'],
		location: {
			name: 'Quay Restaurant',
			address: {
				street: 'Upper Level, Overseas Passenger Terminal',
				city: 'Sydney',
				country: 'Australia',
				formatted: 'Upper Level, Overseas Passenger Terminal, The Rocks NSW 2000, Australia'
			},
			geo: { latitude: -33.8568, longitude: 151.2100 }
		},
		priceLevel: 4,
		estimatedCost: 250,
		currency: 'AUD',
		reservationRequired: true,
		reservationUrl: 'https://example.com/quay/reserve',
		website: 'https://example.com/quay',
		rating: 4.8,
		reviewCount: 3200
	},
	{
		id: 'food-sydney-002',
		name: 'Bourke Street Bakery',
		venueType: 'bakery',
		cuisineTypes: ['Australian', 'Bakery', 'Cafe'],
		location: {
			name: 'Bourke Street Bakery',
			address: {
				street: '633 Bourke Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '633 Bourke Street, Surry Hills NSW 2010, Australia'
			},
			geo: { latitude: -33.8833, longitude: 151.2107 }
		},
		priceLevel: 1,
		estimatedCost: 15,
		currency: 'AUD',
		openingHours: {
			monday: { open: '07:00', close: '17:00' },
			tuesday: { open: '07:00', close: '17:00' },
			wednesday: { open: '07:00', close: '17:00' },
			thursday: { open: '07:00', close: '17:00' },
			friday: { open: '07:00', close: '17:00' },
			saturday: { open: '07:00', close: '16:00' },
			sunday: { open: '08:00', close: '16:00' }
		},
		rating: 4.5,
		reviewCount: 5600
	}
];

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesQuery(venue: FoodVenue, query?: string): boolean {
	if (!query) return true;
	const lowerQuery = query.toLowerCase();
	return (
		venue.name.toLowerCase().includes(lowerQuery) ||
		venue.location.address.city.toLowerCase().includes(lowerQuery) ||
		(venue.cuisineTypes?.some((c) => c.toLowerCase().includes(lowerQuery)) ?? false)
	);
}

export const fakeFoodAdapter: FoodAdapter = {
	async search(params: FoodSearchParams): Promise<FoodVenue[]> {
		await delay(200 + Math.random() * 200);

		return fakeFoodVenues
			.filter((venue) => matchesQuery(venue, params.query))
			.filter((venue) => {
				if (!params.cuisineTypes?.length) return true;
				return venue.cuisineTypes?.some((c) =>
					params.cuisineTypes!.some((pc) => c.toLowerCase().includes(pc.toLowerCase()))
				);
			})
			.filter((venue) => {
				if (!params.priceLevel?.length) return true;
				return venue.priceLevel && params.priceLevel.includes(venue.priceLevel);
			})
			.slice(0, params.limit || 20);
	},

	async getById(id: string): Promise<FoodVenue | null> {
		await delay(100);
		return fakeFoodVenues.find((v) => v.id === id) || null;
	},

	async getDetails(venue: FoodVenue): Promise<FoodVenue> {
		await delay(150);
		return venue;
	}
};
