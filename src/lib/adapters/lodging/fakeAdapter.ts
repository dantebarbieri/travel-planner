import type { LodgingAdapter, LodgingSearchParams, Stay, HotelStay, AirbnbStay } from '$lib/types/travel';

const fakeHotels: HotelStay[] = [
	{
		id: 'hotel-paris-001',
		type: 'hotel',
		name: 'Grand Plaza Hotel Paris',
		location: {
			name: 'Grand Plaza Hotel Paris',
			address: {
				street: '123 Avenue des Champs-Élysées',
				city: 'Paris',
				country: 'France',
				formatted: '123 Avenue des Champs-Élysées, Paris, France'
			},
			geo: { latitude: 48.8698, longitude: 2.3078 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 250,
		currency: 'EUR',
		starRating: 4,
		roomType: 'Deluxe King',
		amenities: ['wifi', 'breakfast', 'gym', 'spa', 'room-service'],
		website: 'https://example.com/grandplaza',
		phone: '+33 1 23 45 67 89'
	},
	{
		id: 'hotel-paris-002',
		type: 'hotel',
		name: 'Le Marais Boutique Hotel',
		location: {
			name: 'Le Marais Boutique Hotel',
			address: {
				street: '45 Rue de Rivoli',
				city: 'Paris',
				country: 'France',
				formatted: '45 Rue de Rivoli, Paris, France'
			},
			geo: { latitude: 48.8566, longitude: 2.3522 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 180,
		currency: 'EUR',
		starRating: 3,
		roomType: 'Standard Double',
		amenities: ['wifi', 'breakfast'],
		website: 'https://example.com/lemarais'
	},
	{
		id: 'hotel-tokyo-001',
		type: 'hotel',
		name: 'Shinjuku Grand Hotel',
		location: {
			name: 'Shinjuku Grand Hotel',
			address: {
				street: '2-1-1 Nishi-Shinjuku',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '2-1-1 Nishi-Shinjuku, Shinjuku-ku, Tokyo, Japan'
			},
			geo: { latitude: 35.6896, longitude: 139.6917 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 200,
		currency: 'JPY',
		starRating: 4,
		roomType: 'Superior Twin',
		amenities: ['wifi', 'breakfast', 'onsen', 'gym'],
		website: 'https://example.com/shinjukugrand'
	},
	{
		id: 'hotel-sydney-001',
		type: 'hotel',
		name: 'Sydney Harbour View Hotel',
		location: {
			name: 'Sydney Harbour View Hotel',
			address: {
				street: '100 George Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '100 George Street, Sydney NSW 2000, Australia'
			},
			geo: { latitude: -33.8568, longitude: 151.2153 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 320,
		currency: 'AUD',
		starRating: 5,
		roomType: 'Harbour View Suite',
		amenities: ['wifi', 'breakfast', 'pool', 'gym', 'spa', 'concierge'],
		website: 'https://example.com/sydneyharbour'
	}
];

const fakeAirbnbs: AirbnbStay[] = [
	{
		id: 'airbnb-paris-001',
		type: 'airbnb',
		name: 'Charming Studio near Eiffel Tower',
		location: {
			name: 'Charming Studio near Eiffel Tower',
			address: {
				street: '78 Avenue de la Bourdonnais',
				city: 'Paris',
				country: 'France',
				formatted: '78 Avenue de la Bourdonnais, Paris, France'
			},
			geo: { latitude: 48.8584, longitude: 2.2945 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 120,
		currency: 'EUR',
		hostName: 'Marie',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/fake-001',
		amenities: ['wifi', 'kitchen', 'washer', 'air-conditioning']
	},
	{
		id: 'airbnb-paris-002',
		type: 'airbnb',
		name: 'Cozy Montmartre Apartment',
		location: {
			name: 'Cozy Montmartre Apartment',
			address: {
				street: '15 Rue Lepic',
				city: 'Paris',
				country: 'France',
				formatted: '15 Rue Lepic, Montmartre, Paris, France'
			},
			geo: { latitude: 48.8847, longitude: 2.3365 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 95,
		currency: 'EUR',
		hostName: 'Jean-Pierre',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/fake-002',
		amenities: ['wifi', 'kitchen', 'balcony']
	},
	{
		id: 'airbnb-tokyo-001',
		type: 'airbnb',
		name: 'Traditional Shibuya Apartment',
		location: {
			name: 'Traditional Shibuya Apartment',
			address: {
				street: '1-2-3 Shibuya',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '1-2-3 Shibuya, Shibuya-ku, Tokyo, Japan'
			},
			geo: { latitude: 35.6595, longitude: 139.7004 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 150,
		currency: 'JPY',
		hostName: 'Yuki',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/fake-003',
		amenities: ['wifi', 'kitchen', 'washer', 'tatami-room']
	},
	{
		id: 'airbnb-sydney-001',
		type: 'airbnb',
		name: 'Bondi Beach House',
		location: {
			name: 'Bondi Beach House',
			address: {
				street: '50 Campbell Parade',
				city: 'Sydney',
				country: 'Australia',
				formatted: '50 Campbell Parade, Bondi Beach NSW 2026, Australia'
			},
			geo: { latitude: -33.8908, longitude: 151.2743 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 280,
		currency: 'AUD',
		hostName: 'Sarah',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/fake-004',
		amenities: ['wifi', 'kitchen', 'pool', 'bbq', 'beach-access']
	}
];

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesQuery(stay: Stay, query?: string): boolean {
	if (!query) return true;
	const lowerQuery = query.toLowerCase();
	return (
		stay.name.toLowerCase().includes(lowerQuery) ||
		stay.location.address.city.toLowerCase().includes(lowerQuery) ||
		stay.location.address.country.toLowerCase().includes(lowerQuery)
	);
}

export const fakeLodgingAdapter: LodgingAdapter = {
	async search(params: LodgingSearchParams): Promise<Stay[]> {
		await delay(200 + Math.random() * 200);

		const allStays: Stay[] = [...fakeHotels, ...fakeAirbnbs];

		return allStays
			.filter((stay) => matchesQuery(stay, params.query))
			.filter((stay) => {
				if (!params.maxPrice) return true;
				return (stay.pricePerNight || 0) <= params.maxPrice;
			})
			.filter((stay) => {
				if (!params.minPrice) return true;
				return (stay.pricePerNight || 0) >= params.minPrice;
			})
			.slice(0, params.limit || 20)
			.map((stay) => ({
				...stay,
				checkIn: params.checkIn || '',
				checkOut: params.checkOut || ''
			}));
	},

	async getById(id: string): Promise<Stay | null> {
		await delay(100);
		const allStays: Stay[] = [...fakeHotels, ...fakeAirbnbs];
		return allStays.find((s) => s.id === id) || null;
	},

	async getDetails(stay: Stay): Promise<Stay> {
		await delay(150);
		return stay;
	}
};
