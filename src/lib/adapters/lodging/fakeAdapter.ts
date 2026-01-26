import type { LodgingAdapter, LodgingSearchParams, Stay, HotelStay, AirbnbStay, VrboStay, HostelStay } from '$lib/types/travel';

// ============ SAN FRANCISCO (Primary Test City) ============
const sfHotels: HotelStay[] = [
	{
		id: 'hotel-sf-001',
		type: 'hotel',
		name: 'Hotel Vitale',
		location: {
			name: 'Hotel Vitale',
			address: {
				street: '8 Mission Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '8 Mission Street, San Francisco, CA 94105, USA'
			},
			geo: { latitude: 37.7932, longitude: -122.3932 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 299,
		currency: 'USD',
		starRating: 4,
		roomType: 'Embarcadero View King',
		amenities: ['wifi', 'spa', 'fitness-center', 'room-service', 'waterfront-views'],
		website: 'https://www.hotelvitale.com',
		phone: '+1 415-278-3700'
	},
	{
		id: 'hotel-sf-002',
		type: 'hotel',
		name: 'The Fairmont San Francisco',
		location: {
			name: 'The Fairmont San Francisco',
			address: {
				street: '950 Mason Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '950 Mason Street, San Francisco, CA 94108, USA'
			},
			geo: { latitude: 37.7924, longitude: -122.4103 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 389,
		currency: 'USD',
		starRating: 5,
		roomType: 'Fairmont King',
		amenities: ['wifi', 'spa', 'fitness-center', 'concierge', 'restaurant', 'bar', 'room-service'],
		website: 'https://www.fairmont.com/san-francisco',
		phone: '+1 415-772-5000'
	},
	{
		id: 'hotel-sf-003',
		type: 'hotel',
		name: 'Hotel Zeppelin',
		location: {
			name: 'Hotel Zeppelin',
			address: {
				street: '545 Post Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '545 Post Street, San Francisco, CA 94102, USA'
			},
			geo: { latitude: 37.7880, longitude: -122.4106 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 189,
		currency: 'USD',
		starRating: 4,
		roomType: 'Hip Double Queen',
		amenities: ['wifi', 'fitness-center', 'game-room', 'bar'],
		website: 'https://www.viceroyhotelsandresorts.com/zeppelin'
	},
	{
		id: 'hotel-sf-004',
		type: 'hotel',
		name: 'Handlery Union Square Hotel',
		location: {
			name: 'Handlery Union Square Hotel',
			address: {
				street: '351 Geary Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '351 Geary Street, San Francisco, CA 94102, USA'
			},
			geo: { latitude: 37.7869, longitude: -122.4098 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 159,
		currency: 'USD',
		starRating: 3,
		roomType: 'Standard Queen',
		amenities: ['wifi', 'pool', 'fitness-center', 'restaurant'],
		website: 'https://www.handlery.com'
	}
];

const sfAirbnbs: AirbnbStay[] = [
	{
		id: 'airbnb-sf-001',
		type: 'airbnb',
		name: 'Victorian Flat in the Mission',
		location: {
			name: 'Victorian Flat in the Mission',
			address: {
				street: '24th Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '24th Street, San Francisco, CA 94110, USA'
			},
			geo: { latitude: 37.7527, longitude: -122.4184 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 175,
		currency: 'USD',
		hostName: 'Sarah',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/sf-001',
		amenities: ['wifi', 'kitchen', 'washer', 'backyard', 'parking']
	},
	{
		id: 'airbnb-sf-002',
		type: 'airbnb',
		name: 'Modern Loft near Golden Gate Park',
		location: {
			name: 'Modern Loft near Golden Gate Park',
			address: {
				street: 'Irving Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Irving Street, San Francisco, CA 94122, USA'
			},
			geo: { latitude: 37.7639, longitude: -122.4624 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 225,
		currency: 'USD',
		hostName: 'Michael',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/sf-002',
		amenities: ['wifi', 'kitchen', 'workspace', 'city-views']
	},
	{
		id: 'airbnb-sf-003',
		type: 'airbnb',
		name: 'Cozy Room in Noe Valley',
		location: {
			name: 'Cozy Room in Noe Valley',
			address: {
				street: '24th Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '24th Street, Noe Valley, San Francisco, CA 94114, USA'
			},
			geo: { latitude: 37.7512, longitude: -122.4335 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 95,
		currency: 'USD',
		hostName: 'Jessica',
		propertyType: 'private_room',
		listingUrl: 'https://airbnb.com/rooms/sf-003',
		amenities: ['wifi', 'shared-kitchen', 'garden']
	}
];

const sfVrbos: VrboStay[] = [
	{
		id: 'vrbo-sf-001',
		type: 'vrbo',
		name: 'Fisherman\'s Wharf Family Condo',
		location: {
			name: 'Fisherman\'s Wharf Family Condo',
			address: {
				street: 'Beach Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Beach Street, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8076, longitude: -122.4137 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 350,
		currency: 'USD',
		propertyType: 'Condo',
		listingUrl: 'https://vrbo.com/sf-001',
		amenities: ['wifi', 'full-kitchen', 'washer-dryer', 'parking', 'family-friendly']
	},
	{
		id: 'vrbo-sf-002',
		type: 'vrbo',
		name: 'Pacific Heights Luxury Home',
		location: {
			name: 'Pacific Heights Luxury Home',
			address: {
				street: 'Broadway',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Broadway, Pacific Heights, San Francisco, CA 94115, USA'
			},
			geo: { latitude: 37.7935, longitude: -122.4330 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 550,
		currency: 'USD',
		propertyType: 'House',
		listingUrl: 'https://vrbo.com/sf-002',
		amenities: ['wifi', 'gourmet-kitchen', 'bay-views', 'hot-tub', 'garage']
	}
];

const sfHostels: HostelStay[] = [
	{
		id: 'hostel-sf-001',
		type: 'hostel',
		name: 'HI San Francisco Fisherman\'s Wharf',
		location: {
			name: 'HI San Francisco Fisherman\'s Wharf',
			address: {
				street: 'Fort Mason',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Fort Mason, San Francisco, CA 94123, USA'
			},
			geo: { latitude: 37.8054, longitude: -122.4311 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 45,
		currency: 'USD',
		roomType: 'dorm',
		bedsInRoom: 6,
		amenities: ['wifi', 'breakfast', 'communal-kitchen', 'lounge', 'bay-views']
	},
	{
		id: 'hostel-sf-002',
		type: 'hostel',
		name: 'USA Hostels San Francisco',
		location: {
			name: 'USA Hostels San Francisco',
			address: {
				street: '711 Post Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '711 Post Street, San Francisco, CA 94109, USA'
			},
			geo: { latitude: 37.7878, longitude: -122.4123 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 55,
		currency: 'USD',
		roomType: 'dorm',
		bedsInRoom: 4,
		amenities: ['wifi', 'breakfast', 'tours', 'social-events', 'lockers']
	},
	{
		id: 'hostel-sf-003',
		type: 'hostel',
		name: 'Green Tortoise Hostel',
		location: {
			name: 'Green Tortoise Hostel',
			address: {
				street: '494 Broadway',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '494 Broadway, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.7982, longitude: -122.4069 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 48,
		currency: 'USD',
		roomType: 'dorm',
		bedsInRoom: 8,
		amenities: ['wifi', 'free-dinner', 'sauna', 'rooftop', 'north-beach-location']
	}
];

// ============ MONTEREY ============
const montereyHotels: HotelStay[] = [
	{
		id: 'hotel-monterey-001',
		type: 'hotel',
		name: 'Monterey Plaza Hotel & Spa',
		location: {
			name: 'Monterey Plaza Hotel & Spa',
			address: {
				street: '400 Cannery Row',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '400 Cannery Row, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6158, longitude: -121.8972 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 389,
		currency: 'USD',
		starRating: 4,
		roomType: 'Ocean View King',
		amenities: ['wifi', 'spa', 'oceanfront', 'restaurant', 'fitness-center'],
		website: 'https://www.montereyplazahotel.com'
	},
	{
		id: 'hotel-monterey-002',
		type: 'hotel',
		name: 'InterContinental The Clement Monterey',
		location: {
			name: 'InterContinental The Clement Monterey',
			address: {
				street: '750 Cannery Row',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '750 Cannery Row, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6175, longitude: -121.8995 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 449,
		currency: 'USD',
		starRating: 5,
		roomType: 'Bay View Room',
		amenities: ['wifi', 'spa', 'pool', 'restaurant', 'room-service', 'fireplace'],
		website: 'https://www.ictheclementmonterey.com'
	}
];

const montereyAirbnbs: AirbnbStay[] = [
	{
		id: 'airbnb-monterey-001',
		type: 'airbnb',
		name: 'Charming Cottage near Aquarium',
		location: {
			name: 'Charming Cottage near Aquarium',
			address: {
				street: 'David Avenue',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: 'David Avenue, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6150, longitude: -121.8920 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 185,
		currency: 'USD',
		hostName: 'Linda',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/monterey-001',
		amenities: ['wifi', 'kitchen', 'garden', 'walking-distance-aquarium']
	}
];

const montereyHostels: HostelStay[] = [
	{
		id: 'hostel-monterey-001',
		type: 'hostel',
		name: 'HI Monterey Hostel',
		location: {
			name: 'HI Monterey Hostel',
			address: {
				street: '778 Hawthorne Street',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '778 Hawthorne Street, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6020, longitude: -121.8925 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 38,
		currency: 'USD',
		roomType: 'dorm',
		bedsInRoom: 4,
		amenities: ['wifi', 'breakfast', 'communal-kitchen', 'garden']
	}
];

// ============ SAN DIEGO ============
const sanDiegoHotels: HotelStay[] = [
	{
		id: 'hotel-sandiego-001',
		type: 'hotel',
		name: 'Hotel del Coronado',
		location: {
			name: 'Hotel del Coronado',
			address: {
				street: '1500 Orange Avenue',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '1500 Orange Avenue, Coronado, CA 92118, USA'
			},
			geo: { latitude: 32.6811, longitude: -117.1785 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 429,
		currency: 'USD',
		starRating: 5,
		roomType: 'Ocean View Room',
		amenities: ['wifi', 'beach', 'pool', 'spa', 'restaurants', 'historic'],
		website: 'https://www.hoteldel.com'
	},
	{
		id: 'hotel-sandiego-002',
		type: 'hotel',
		name: 'Pendry San Diego',
		location: {
			name: 'Pendry San Diego',
			address: {
				street: '550 J Street',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '550 J Street, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7109, longitude: -117.1581 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 349,
		currency: 'USD',
		starRating: 5,
		roomType: 'Deluxe King',
		amenities: ['wifi', 'rooftop-pool', 'spa', 'restaurant', 'nightclub'],
		website: 'https://www.pendry.com/san-diego'
	}
];

const sanDiegoAirbnbs: AirbnbStay[] = [
	{
		id: 'airbnb-sandiego-001',
		type: 'airbnb',
		name: 'Beach House in Pacific Beach',
		location: {
			name: 'Beach House in Pacific Beach',
			address: {
				street: 'Mission Blvd',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: 'Mission Blvd, Pacific Beach, San Diego, CA 92109, USA'
			},
			geo: { latitude: 32.7912, longitude: -117.2559 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 265,
		currency: 'USD',
		hostName: 'Dave',
		propertyType: 'entire_place',
		listingUrl: 'https://airbnb.com/rooms/sd-001',
		amenities: ['wifi', 'beach-access', 'surfboard-storage', 'patio']
	}
];

const sanDiegoHostels: HostelStay[] = [
	{
		id: 'hostel-sandiego-001',
		type: 'hostel',
		name: 'ITH Zoo Hostel San Diego',
		location: {
			name: 'ITH Zoo Hostel San Diego',
			address: {
				street: '521 Market Street',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '521 Market Street, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7154, longitude: -117.1628 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 42,
		currency: 'USD',
		roomType: 'dorm',
		bedsInRoom: 6,
		amenities: ['wifi', 'breakfast', 'tours', 'rooftop', 'gaslamp-location']
	}
];

// ============ PARIS ============
const parisHotels: HotelStay[] = [
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
	}
];

const parisAirbnbs: AirbnbStay[] = [
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
	}
];

const parisHostels: HostelStay[] = [
	{
		id: 'hostel-paris-001',
		type: 'hostel',
		name: 'Generator Paris',
		location: {
			name: 'Generator Paris',
			address: {
				street: '9-11 Place du Colonel Fabien',
				city: 'Paris',
				country: 'France',
				formatted: '9-11 Place du Colonel Fabien, 75010 Paris, France'
			},
			geo: { latitude: 48.8769, longitude: 2.3698 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 28,
		currency: 'EUR',
		roomType: 'dorm',
		bedsInRoom: 6,
		amenities: ['wifi', 'bar', 'cafe', 'terrace', 'games-room']
	},
	{
		id: 'hostel-paris-002',
		type: 'hostel',
		name: 'St Christopher\'s Inn Paris',
		location: {
			name: 'St Christopher\'s Inn Paris',
			address: {
				street: '159 Rue de Crimée',
				city: 'Paris',
				country: 'France',
				formatted: '159 Rue de Crimée, 75019 Paris, France'
			},
			geo: { latitude: 48.8894, longitude: 2.3760 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 25,
		currency: 'EUR',
		roomType: 'dorm',
		bedsInRoom: 8,
		amenities: ['wifi', 'breakfast', 'bar', 'canal-views']
	}
];

// ============ TOKYO ============
const tokyoHotels: HotelStay[] = [
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
		id: 'hotel-tokyo-002',
		type: 'hotel',
		name: 'Park Hyatt Tokyo',
		location: {
			name: 'Park Hyatt Tokyo',
			address: {
				street: '3-7-1-2 Nishi-Shinjuku',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '3-7-1-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo 163-1055, Japan'
			},
			geo: { latitude: 35.6867, longitude: 139.6917 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 550,
		currency: 'JPY',
		starRating: 5,
		roomType: 'Park Deluxe King',
		amenities: ['wifi', 'spa', 'pool', 'gym', 'restaurant', 'bar', 'city-views'],
		website: 'https://www.hyatt.com/park-hyatt-tokyo'
	}
];

const tokyoAirbnbs: AirbnbStay[] = [
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
	}
];

const tokyoHostels: HostelStay[] = [
	{
		id: 'hostel-tokyo-001',
		type: 'hostel',
		name: 'Nui. Hostel & Bar Lounge',
		location: {
			name: 'Nui. Hostel & Bar Lounge',
			address: {
				street: '2-14-13 Kuramae',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '2-14-13 Kuramae, Taito-ku, Tokyo 111-0051, Japan'
			},
			geo: { latitude: 35.7017, longitude: 139.7890 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 35,
		currency: 'JPY',
		roomType: 'dorm',
		bedsInRoom: 6,
		amenities: ['wifi', 'bar', 'cafe', 'stylish-design']
	},
	{
		id: 'hostel-tokyo-002',
		type: 'hostel',
		name: 'Khaosan Tokyo Origami',
		location: {
			name: 'Khaosan Tokyo Origami',
			address: {
				street: '2-4-12 Asakusa',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '2-4-12 Asakusa, Taito-ku, Tokyo 111-0032, Japan'
			},
			geo: { latitude: 35.7123, longitude: 139.7947 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 28,
		currency: 'JPY',
		roomType: 'dorm',
		bedsInRoom: 8,
		amenities: ['wifi', 'communal-kitchen', 'near-senso-ji']
	}
];

// ============ SYDNEY ============
const sydneyHotels: HotelStay[] = [
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
	},
	{
		id: 'hotel-sydney-002',
		type: 'hotel',
		name: 'QT Sydney',
		location: {
			name: 'QT Sydney',
			address: {
				street: '49 Market Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '49 Market Street, Sydney NSW 2000, Australia'
			},
			geo: { latitude: -33.8694, longitude: 151.2070 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 275,
		currency: 'AUD',
		starRating: 4,
		roomType: 'QT King',
		amenities: ['wifi', 'spa', 'restaurant', 'bar', 'boutique-design'],
		website: 'https://www.qthotels.com/sydney'
	}
];

const sydneyAirbnbs: AirbnbStay[] = [
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

const sydneyHostels: HostelStay[] = [
	{
		id: 'hostel-sydney-001',
		type: 'hostel',
		name: 'Wake Up! Sydney Central',
		location: {
			name: 'Wake Up! Sydney Central',
			address: {
				street: '509 Pitt Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '509 Pitt Street, Sydney NSW 2000, Australia'
			},
			geo: { latitude: -33.8808, longitude: 151.2069 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 32,
		currency: 'AUD',
		roomType: 'dorm',
		bedsInRoom: 6,
		amenities: ['wifi', 'bar', 'cafe', 'tours', 'central-location']
	},
	{
		id: 'hostel-sydney-002',
		type: 'hostel',
		name: 'Sydney Harbour YHA',
		location: {
			name: 'Sydney Harbour YHA',
			address: {
				street: '110 Cumberland Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '110 Cumberland Street, The Rocks NSW 2000, Australia'
			},
			geo: { latitude: -33.8530, longitude: 151.2075 }
		},
		checkIn: '',
		checkOut: '',
		pricePerNight: 45,
		currency: 'AUD',
		roomType: 'dorm',
		bedsInRoom: 4,
		amenities: ['wifi', 'rooftop-terrace', 'harbour-views', 'kitchen']
	}
];

// Combine all stays
const fakeHotels: HotelStay[] = [
	...sfHotels,
	...montereyHotels,
	...sanDiegoHotels,
	...parisHotels,
	...tokyoHotels,
	...sydneyHotels
];

const fakeAirbnbs: AirbnbStay[] = [
	...sfAirbnbs,
	...montereyAirbnbs,
	...sanDiegoAirbnbs,
	...parisAirbnbs,
	...tokyoAirbnbs,
	...sydneyAirbnbs
];

const fakeVrbos: VrboStay[] = [
	...sfVrbos
];

const fakeHostels: HostelStay[] = [
	...sfHostels,
	...montereyHostels,
	...sanDiegoHostels,
	...parisHostels,
	...tokyoHostels,
	...sydneyHostels
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

		const allStays: Stay[] = [...fakeHotels, ...fakeAirbnbs, ...fakeVrbos, ...fakeHostels];

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
		const allStays: Stay[] = [...fakeHotels, ...fakeAirbnbs, ...fakeVrbos, ...fakeHostels];
		return allStays.find((s) => s.id === id) || null;
	},

	async getDetails(stay: Stay): Promise<Stay> {
		await delay(150);
		return stay;
	}
};
