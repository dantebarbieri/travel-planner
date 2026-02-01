import type { FoodAdapter, FoodSearchParams, FoodVenue } from '$lib/types/travel';
import { searchFoodVenues as searchFoodVenuesApi } from '$lib/api/placesApi';

// Fallback fake food venues for when API is unavailable or for demo/testing
const fakeFoodVenues: FoodVenue[] = [
	// ============ SAN FRANCISCO (Primary Test City) ============
	{
		id: 'food-sf-001',
		name: 'State Bird Provisions',
		venueType: 'restaurant',
		cuisineTypes: ['American', 'New American', 'Small Plates'],
		location: {
			name: 'State Bird Provisions',
			address: {
				street: '1529 Fillmore Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1529 Fillmore Street, San Francisco, CA 94115, USA'
			},
			geo: { latitude: 37.7836, longitude: -122.4332 }
		},
		priceLevel: 3,
		estimatedCost: 85,
		currency: 'USD',
		reservationRequired: true,
		reservationUrl: 'https://www.exploretock.com/statebird',
		website: 'https://statebirdsf.com',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { closed: true, open: '', close: '' },
			wednesday: { open: '17:30', close: '22:00' },
			thursday: { open: '17:30', close: '22:00' },
			friday: { open: '17:30', close: '22:00' },
			saturday: { open: '17:30', close: '22:00' },
			sunday: { open: '17:30', close: '21:00' }
		},
		rating: 4.7,
		reviewCount: 4200
	},
	{
		id: 'food-sf-002',
		name: 'Tartine Bakery',
		venueType: 'bakery',
		cuisineTypes: ['Bakery', 'Cafe', 'American'],
		location: {
			name: 'Tartine Bakery',
			address: {
				street: '600 Guerrero Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '600 Guerrero Street, San Francisco, CA 94110, USA'
			},
			geo: { latitude: 37.7614, longitude: -122.4241 }
		},
		priceLevel: 2,
		estimatedCost: 18,
		currency: 'USD',
		website: 'https://www.tartinebakery.com',
		openingHours: {
			monday: { open: '08:00', close: '17:00' },
			tuesday: { open: '08:00', close: '17:00' },
			wednesday: { open: '08:00', close: '17:00' },
			thursday: { open: '08:00', close: '17:00' },
			friday: { open: '08:00', close: '17:00' },
			saturday: { open: '08:00', close: '17:00' },
			sunday: { open: '08:00', close: '17:00' }
		},
		rating: 4.6,
		reviewCount: 8900
	},
	{
		id: 'food-sf-003',
		name: 'Swan Oyster Depot',
		venueType: 'restaurant',
		cuisineTypes: ['Seafood', 'Oyster Bar'],
		location: {
			name: 'Swan Oyster Depot',
			address: {
				street: '1517 Polk Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1517 Polk Street, San Francisco, CA 94109, USA'
			},
			geo: { latitude: 37.7906, longitude: -122.4206 }
		},
		priceLevel: 3,
		estimatedCost: 50,
		currency: 'USD',
		phone: '+1 415-673-1101',
		openingHours: {
			monday: { open: '10:30', close: '17:30' },
			tuesday: { open: '10:30', close: '17:30' },
			wednesday: { open: '10:30', close: '17:30' },
			thursday: { open: '10:30', close: '17:30' },
			friday: { open: '10:30', close: '17:30' },
			saturday: { open: '10:30', close: '17:30' },
			sunday: { closed: true, open: '', close: '' }
		},
		rating: 4.7,
		reviewCount: 5600
	},
	{
		id: 'food-sf-004',
		name: 'In-N-Out Burger',
		venueType: 'fast_food',
		cuisineTypes: ['Fast Food', 'Burgers', 'American'],
		location: {
			name: 'In-N-Out Burger',
			address: {
				street: '333 Jefferson Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '333 Jefferson Street, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8079, longitude: -122.4153 }
		},
		priceLevel: 1,
		estimatedCost: 12,
		currency: 'USD',
		website: 'https://www.in-n-out.com',
		openingHours: {
			monday: { open: '10:30', close: '01:00' },
			tuesday: { open: '10:30', close: '01:00' },
			wednesday: { open: '10:30', close: '01:00' },
			thursday: { open: '10:30', close: '01:00' },
			friday: { open: '10:30', close: '01:30' },
			saturday: { open: '10:30', close: '01:30' },
			sunday: { open: '10:30', close: '01:00' }
		},
		rating: 4.5,
		reviewCount: 12000
	},
	{
		id: 'food-sf-005',
		name: 'Zuni Café',
		venueType: 'restaurant',
		cuisineTypes: ['Mediterranean', 'American', 'California'],
		location: {
			name: 'Zuni Café',
			address: {
				street: '1658 Market Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1658 Market Street, San Francisco, CA 94102, USA'
			},
			geo: { latitude: 37.7736, longitude: -122.4211 }
		},
		priceLevel: 3,
		estimatedCost: 75,
		currency: 'USD',
		reservationRequired: true,
		reservationUrl: 'https://www.opentable.com/zunicafe',
		website: 'https://zunicafe.com',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { open: '11:30', close: '22:00' },
			wednesday: { open: '11:30', close: '22:00' },
			thursday: { open: '11:30', close: '22:00' },
			friday: { open: '11:30', close: '23:00' },
			saturday: { open: '11:30', close: '23:00' },
			sunday: { open: '11:00', close: '21:00' }
		},
		rating: 4.5,
		reviewCount: 3800
	},
	{
		id: 'food-sf-006',
		name: 'Hog Island Oyster Co.',
		venueType: 'restaurant',
		cuisineTypes: ['Seafood', 'Oysters', 'American'],
		location: {
			name: 'Hog Island Oyster Co.',
			address: {
				street: '1 Ferry Building',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1 Ferry Building, San Francisco, CA 94111, USA'
			},
			geo: { latitude: 37.7955, longitude: -122.3934 }
		},
		priceLevel: 2,
		estimatedCost: 40,
		currency: 'USD',
		website: 'https://hogislandoysters.com',
		openingHours: {
			monday: { open: '11:00', close: '21:00' },
			tuesday: { open: '11:00', close: '21:00' },
			wednesday: { open: '11:00', close: '21:00' },
			thursday: { open: '11:00', close: '21:00' },
			friday: { open: '11:00', close: '21:00' },
			saturday: { open: '11:00', close: '21:00' },
			sunday: { open: '11:00', close: '20:00' }
		},
		rating: 4.5,
		reviewCount: 6200
	},
	{
		id: 'food-sf-007',
		name: 'Golden Boy Pizza',
		venueType: 'fast_food',
		cuisineTypes: ['Italian', 'Pizza'],
		location: {
			name: 'Golden Boy Pizza',
			address: {
				street: '542 Green Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '542 Green Street, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.7998, longitude: -122.4082 }
		},
		priceLevel: 1,
		estimatedCost: 8,
		currency: 'USD',
		openingHours: {
			monday: { open: '11:30', close: '23:30' },
			tuesday: { open: '11:30', close: '23:30' },
			wednesday: { open: '11:30', close: '23:30' },
			thursday: { open: '11:30', close: '23:30' },
			friday: { open: '11:30', close: '02:00' },
			saturday: { open: '11:30', close: '02:00' },
			sunday: { open: '11:30', close: '23:30' }
		},
		rating: 4.6,
		reviewCount: 4100
	},
	{
		id: 'food-sf-008',
		name: 'Philz Coffee',
		venueType: 'cafe',
		cuisineTypes: ['Coffee', 'Cafe'],
		location: {
			name: 'Philz Coffee',
			address: {
				street: '3101 24th Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '3101 24th Street, San Francisco, CA 94110, USA'
			},
			geo: { latitude: 37.7525, longitude: -122.4153 }
		},
		priceLevel: 1,
		estimatedCost: 7,
		currency: 'USD',
		website: 'https://www.philzcoffee.com',
		openingHours: {
			monday: { open: '06:00', close: '20:00' },
			tuesday: { open: '06:00', close: '20:00' },
			wednesday: { open: '06:00', close: '20:00' },
			thursday: { open: '06:00', close: '20:00' },
			friday: { open: '06:00', close: '20:00' },
			saturday: { open: '06:30', close: '20:00' },
			sunday: { open: '06:30', close: '20:00' }
		},
		rating: 4.5,
		reviewCount: 3200
	},
	{
		id: 'food-sf-009',
		name: 'House of Prime Rib',
		venueType: 'fine_dining',
		cuisineTypes: ['Steakhouse', 'American'],
		location: {
			name: 'House of Prime Rib',
			address: {
				street: '1906 Van Ness Avenue',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1906 Van Ness Avenue, San Francisco, CA 94109, USA'
			},
			geo: { latitude: 37.7922, longitude: -122.4225 }
		},
		priceLevel: 3,
		estimatedCost: 65,
		currency: 'USD',
		reservationRequired: true,
		reservationUrl: 'https://www.opentable.com/houseofprimerib',
		website: 'https://houseofprimerib.net',
		phone: '+1 415-885-4605',
		openingHours: {
			monday: { open: '17:00', close: '22:00' },
			tuesday: { open: '17:00', close: '22:00' },
			wednesday: { open: '17:00', close: '22:00' },
			thursday: { open: '17:00', close: '22:00' },
			friday: { open: '16:00', close: '22:00' },
			saturday: { open: '16:00', close: '22:00' },
			sunday: { open: '16:00', close: '21:00' }
		},
		rating: 4.6,
		reviewCount: 7500
	},
	{
		id: 'food-sf-010',
		name: 'Chinatown Dim Sum - Good Mong Kok Bakery',
		venueType: 'bakery',
		cuisineTypes: ['Chinese', 'Dim Sum', 'Bakery'],
		location: {
			name: 'Good Mong Kok Bakery',
			address: {
				street: '1039 Stockton Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1039 Stockton Street, San Francisco, CA 94108, USA'
			},
			geo: { latitude: 37.7963, longitude: -122.4075 }
		},
		priceLevel: 1,
		estimatedCost: 10,
		currency: 'USD',
		openingHours: {
			monday: { open: '07:00', close: '18:00' },
			tuesday: { open: '07:00', close: '18:00' },
			wednesday: { open: '07:00', close: '18:00' },
			thursday: { open: '07:00', close: '18:00' },
			friday: { open: '07:00', close: '18:00' },
			saturday: { open: '07:00', close: '18:00' },
			sunday: { open: '07:00', close: '18:00' }
		},
		rating: 4.4,
		reviewCount: 2800
	},
	{
		id: 'food-sf-011',
		name: 'La Taqueria',
		venueType: 'restaurant',
		cuisineTypes: ['Mexican', 'Tacos', 'Burritos'],
		location: {
			name: 'La Taqueria',
			address: {
				street: '2889 Mission Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '2889 Mission Street, San Francisco, CA 94110, USA'
			},
			geo: { latitude: 37.7512, longitude: -122.4182 }
		},
		priceLevel: 1,
		estimatedCost: 14,
		currency: 'USD',
		openingHours: {
			monday: { open: '11:00', close: '21:00' },
			tuesday: { open: '11:00', close: '21:00' },
			wednesday: { open: '11:00', close: '21:00' },
			thursday: { open: '11:00', close: '21:00' },
			friday: { open: '11:00', close: '21:00' },
			saturday: { open: '11:00', close: '21:00' },
			sunday: { open: '11:00', close: '20:00' }
		},
		rating: 4.5,
		reviewCount: 5400
	},
	{
		id: 'food-sf-012',
		name: 'Benu',
		venueType: 'fine_dining',
		cuisineTypes: ['Asian Fusion', 'Contemporary', 'Tasting Menu'],
		location: {
			name: 'Benu',
			address: {
				street: '22 Hawthorne Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '22 Hawthorne Street, San Francisco, CA 94105, USA'
			},
			geo: { latitude: 37.7863, longitude: -122.3995 }
		},
		priceLevel: 4,
		estimatedCost: 350,
		currency: 'USD',
		reservationRequired: true,
		reservationUrl: 'https://www.exploretock.com/benu',
		website: 'https://benusf.com',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { open: '17:30', close: '21:30' },
			wednesday: { open: '17:30', close: '21:30' },
			thursday: { open: '17:30', close: '21:30' },
			friday: { open: '17:30', close: '21:30' },
			saturday: { open: '17:30', close: '21:30' },
			sunday: { closed: true, open: '', close: '' }
		},
		rating: 4.8,
		reviewCount: 1200
	},
	{
		id: 'food-sf-013',
		name: 'Super Duper Burgers',
		venueType: 'fast_food',
		cuisineTypes: ['Burgers', 'American', 'Fast Casual'],
		location: {
			name: 'Super Duper Burgers',
			address: {
				street: '721 Market Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '721 Market Street, San Francisco, CA 94103, USA'
			},
			geo: { latitude: 37.7867, longitude: -122.4039 }
		},
		priceLevel: 1,
		estimatedCost: 15,
		currency: 'USD',
		website: 'https://superduperburgers.com',
		openingHours: {
			monday: { open: '11:00', close: '21:00' },
			tuesday: { open: '11:00', close: '21:00' },
			wednesday: { open: '11:00', close: '21:00' },
			thursday: { open: '11:00', close: '21:00' },
			friday: { open: '11:00', close: '22:00' },
			saturday: { open: '11:00', close: '22:00' },
			sunday: { open: '11:00', close: '21:00' }
		},
		rating: 4.4,
		reviewCount: 3100
	},
	{
		id: 'food-sf-014',
		name: 'Sotto Mare',
		venueType: 'restaurant',
		cuisineTypes: ['Italian', 'Seafood'],
		location: {
			name: 'Sotto Mare',
			address: {
				street: '552 Green Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '552 Green Street, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.7998, longitude: -122.4084 }
		},
		priceLevel: 2,
		estimatedCost: 45,
		currency: 'USD',
		phone: '+1 415-398-3181',
		openingHours: {
			monday: { open: '11:30', close: '21:30' },
			tuesday: { open: '11:30', close: '21:30' },
			wednesday: { open: '11:30', close: '21:30' },
			thursday: { open: '11:30', close: '21:30' },
			friday: { open: '11:30', close: '22:00' },
			saturday: { open: '11:30', close: '22:00' },
			sunday: { open: '11:30', close: '21:30' }
		},
		rating: 4.6,
		reviewCount: 4800
	},
	{
		id: 'food-sf-015',
		name: 'Sightglass Coffee',
		venueType: 'cafe',
		cuisineTypes: ['Coffee', 'Cafe'],
		location: {
			name: 'Sightglass Coffee',
			address: {
				street: '270 7th Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '270 7th Street, San Francisco, CA 94103, USA'
			},
			geo: { latitude: 37.7768, longitude: -122.4073 }
		},
		priceLevel: 2,
		estimatedCost: 8,
		currency: 'USD',
		website: 'https://sightglasscoffee.com',
		openingHours: {
			monday: { open: '07:00', close: '18:00' },
			tuesday: { open: '07:00', close: '18:00' },
			wednesday: { open: '07:00', close: '18:00' },
			thursday: { open: '07:00', close: '18:00' },
			friday: { open: '07:00', close: '18:00' },
			saturday: { open: '08:00', close: '18:00' },
			sunday: { open: '08:00', close: '18:00' }
		},
		rating: 4.5,
		reviewCount: 2600
	},

	// ============ MONTEREY ============
	{
		id: 'food-monterey-001',
		name: 'The Sardine Factory',
		venueType: 'fine_dining',
		cuisineTypes: ['Seafood', 'American', 'California'],
		location: {
			name: 'The Sardine Factory',
			address: {
				street: '701 Wave Street',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '701 Wave Street, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6176, longitude: -121.8982 }
		},
		priceLevel: 4,
		estimatedCost: 80,
		currency: 'USD',
		reservationRequired: true,
		reservationUrl: 'https://www.opentable.com/sardinefactory',
		website: 'https://sardinefactory.com',
		openingHours: {
			monday: { open: '17:00', close: '21:00' },
			tuesday: { open: '17:00', close: '21:00' },
			wednesday: { open: '17:00', close: '21:00' },
			thursday: { open: '17:00', close: '21:00' },
			friday: { open: '17:00', close: '22:00' },
			saturday: { open: '17:00', close: '22:00' },
			sunday: { open: '17:00', close: '21:00' }
		},
		rating: 4.5,
		reviewCount: 2400
	},
	{
		id: 'food-monterey-002',
		name: 'Phil\'s Fish Market',
		venueType: 'restaurant',
		cuisineTypes: ['Seafood', 'American'],
		location: {
			name: 'Phil\'s Fish Market',
			address: {
				street: '7600 Sandholdt Road',
				city: 'Moss Landing',
				state: 'CA',
				country: 'USA',
				formatted: '7600 Sandholdt Road, Moss Landing, CA 95039, USA'
			},
			geo: { latitude: 36.8069, longitude: -121.7858 }
		},
		priceLevel: 2,
		estimatedCost: 30,
		currency: 'USD',
		website: 'https://philsfishmarket.com',
		openingHours: {
			monday: { open: '10:00', close: '20:00' },
			tuesday: { open: '10:00', close: '20:00' },
			wednesday: { open: '10:00', close: '20:00' },
			thursday: { open: '10:00', close: '20:00' },
			friday: { open: '10:00', close: '21:00' },
			saturday: { open: '10:00', close: '21:00' },
			sunday: { open: '10:00', close: '20:00' }
		},
		rating: 4.6,
		reviewCount: 5200
	},
	{
		id: 'food-monterey-003',
		name: 'First Awakenings',
		venueType: 'restaurant',
		cuisineTypes: ['American', 'Breakfast', 'Brunch'],
		location: {
			name: 'First Awakenings',
			address: {
				street: '125 Ocean View Blvd',
				city: 'Pacific Grove',
				state: 'CA',
				country: 'USA',
				formatted: '125 Ocean View Blvd, Pacific Grove, CA 93950, USA'
			},
			geo: { latitude: 36.6185, longitude: -121.9165 }
		},
		priceLevel: 2,
		estimatedCost: 18,
		currency: 'USD',
		openingHours: {
			monday: { open: '07:00', close: '14:00' },
			tuesday: { open: '07:00', close: '14:00' },
			wednesday: { open: '07:00', close: '14:00' },
			thursday: { open: '07:00', close: '14:00' },
			friday: { open: '07:00', close: '14:00' },
			saturday: { open: '07:00', close: '14:00' },
			sunday: { open: '07:00', close: '14:00' }
		},
		rating: 4.5,
		reviewCount: 1800
	},
	{
		id: 'food-monterey-004',
		name: 'Monterey Fish House',
		venueType: 'restaurant',
		cuisineTypes: ['Seafood', 'American'],
		location: {
			name: 'Monterey Fish House',
			address: {
				street: '2114 Del Monte Avenue',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '2114 Del Monte Avenue, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.5979, longitude: -121.8711 }
		},
		priceLevel: 2,
		estimatedCost: 35,
		currency: 'USD',
		openingHours: {
			monday: { open: '11:30', close: '14:30' },
			tuesday: { open: '11:30', close: '14:30' },
			wednesday: { open: '11:30', close: '14:30' },
			thursday: { open: '11:30', close: '14:30' },
			friday: { open: '11:30', close: '21:00' },
			saturday: { open: '17:00', close: '21:00' },
			sunday: { closed: true, open: '', close: '' }
		},
		rating: 4.6,
		reviewCount: 2100
	},

	// ============ SAN DIEGO ============
	{
		id: 'food-sandiego-001',
		name: 'Juniper & Ivy',
		venueType: 'fine_dining',
		cuisineTypes: ['American', 'California', 'Contemporary'],
		location: {
			name: 'Juniper & Ivy',
			address: {
				street: '2228 Kettner Blvd',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '2228 Kettner Blvd, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7352, longitude: -117.1704 }
		},
		priceLevel: 3,
		estimatedCost: 70,
		currency: 'USD',
		reservationRequired: true,
		website: 'https://juniperandivy.com',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { open: '17:00', close: '21:00' },
			wednesday: { open: '17:00', close: '21:00' },
			thursday: { open: '17:00', close: '21:00' },
			friday: { open: '17:00', close: '22:00' },
			saturday: { open: '17:00', close: '22:00' },
			sunday: { open: '10:00', close: '14:00' }
		},
		rating: 4.6,
		reviewCount: 3200
	},
	{
		id: 'food-sandiego-002',
		name: 'Hodad\'s',
		venueType: 'fast_food',
		cuisineTypes: ['Burgers', 'American'],
		location: {
			name: 'Hodad\'s',
			address: {
				street: '5010 Newport Avenue',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '5010 Newport Avenue, San Diego, CA 92107, USA'
			},
			geo: { latitude: 32.7494, longitude: -117.2509 }
		},
		priceLevel: 1,
		estimatedCost: 15,
		currency: 'USD',
		website: 'https://hodadies.com',
		openingHours: {
			monday: { open: '11:00', close: '21:00' },
			tuesday: { open: '11:00', close: '21:00' },
			wednesday: { open: '11:00', close: '21:00' },
			thursday: { open: '11:00', close: '21:00' },
			friday: { open: '11:00', close: '22:00' },
			saturday: { open: '11:00', close: '22:00' },
			sunday: { open: '11:00', close: '21:00' }
		},
		rating: 4.5,
		reviewCount: 8900
	},
	{
		id: 'food-sandiego-003',
		name: 'Lucha Libre Taco Shop',
		venueType: 'fast_food',
		cuisineTypes: ['Mexican', 'Tacos'],
		location: {
			name: 'Lucha Libre Taco Shop',
			address: {
				street: '1810 W Washington Street',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '1810 W Washington Street, San Diego, CA 92103, USA'
			},
			geo: { latitude: 32.7466, longitude: -117.1747 }
		},
		priceLevel: 1,
		estimatedCost: 12,
		currency: 'USD',
		openingHours: {
			monday: { open: '09:00', close: '21:00' },
			tuesday: { open: '09:00', close: '21:00' },
			wednesday: { open: '09:00', close: '21:00' },
			thursday: { open: '09:00', close: '21:00' },
			friday: { open: '09:00', close: '22:00' },
			saturday: { open: '09:00', close: '22:00' },
			sunday: { open: '09:00', close: '21:00' }
		},
		rating: 4.4,
		reviewCount: 4600
	},
	{
		id: 'food-sandiego-004',
		name: 'The Fish Market',
		venueType: 'restaurant',
		cuisineTypes: ['Seafood', 'American'],
		location: {
			name: 'The Fish Market',
			address: {
				street: '750 N Harbor Drive',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '750 N Harbor Drive, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7181, longitude: -117.1725 }
		},
		priceLevel: 3,
		estimatedCost: 50,
		currency: 'USD',
		reservationUrl: 'https://www.opentable.com/thefishmarket',
		website: 'https://thefishmarket.com',
		openingHours: {
			monday: { open: '11:00', close: '21:00' },
			tuesday: { open: '11:00', close: '21:00' },
			wednesday: { open: '11:00', close: '21:00' },
			thursday: { open: '11:00', close: '21:00' },
			friday: { open: '11:00', close: '22:00' },
			saturday: { open: '11:00', close: '22:00' },
			sunday: { open: '11:00', close: '21:00' }
		},
		rating: 4.4,
		reviewCount: 5100
	},
	{
		id: 'food-sandiego-005',
		name: 'Crack Shack',
		venueType: 'fast_food',
		cuisineTypes: ['American', 'Chicken', 'Fast Casual'],
		location: {
			name: 'Crack Shack',
			address: {
				street: '2266 Kettner Blvd',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '2266 Kettner Blvd, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7355, longitude: -117.1703 }
		},
		priceLevel: 2,
		estimatedCost: 18,
		currency: 'USD',
		website: 'https://crackshack.com',
		openingHours: {
			monday: { open: '11:00', close: '21:00' },
			tuesday: { open: '11:00', close: '21:00' },
			wednesday: { open: '11:00', close: '21:00' },
			thursday: { open: '11:00', close: '21:00' },
			friday: { open: '11:00', close: '22:00' },
			saturday: { open: '10:00', close: '22:00' },
			sunday: { open: '10:00', close: '21:00' }
		},
		rating: 4.5,
		reviewCount: 3800
	},

	// ============ PARIS ============
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
		id: 'food-paris-004',
		name: 'L\'As du Fallafel',
		venueType: 'fast_food',
		cuisineTypes: ['Middle Eastern', 'Israeli', 'Falafel'],
		location: {
			name: 'L\'As du Fallafel',
			address: {
				street: '34 Rue des Rosiers',
				city: 'Paris',
				country: 'France',
				formatted: '34 Rue des Rosiers, 75004 Paris, France'
			},
			geo: { latitude: 48.8567, longitude: 2.3581 }
		},
		priceLevel: 1,
		estimatedCost: 10,
		currency: 'EUR',
		openingHours: {
			monday: { open: '11:00', close: '23:00' },
			tuesday: { open: '11:00', close: '23:00' },
			wednesday: { open: '11:00', close: '23:00' },
			thursday: { open: '11:00', close: '23:00' },
			friday: { open: '11:00', close: '16:00' },
			saturday: { closed: true, open: '', close: '' },
			sunday: { open: '12:00', close: '23:00' }
		},
		rating: 4.4,
		reviewCount: 6200
	},
	{
		id: 'food-paris-005',
		name: 'Du Pain et des Idées',
		venueType: 'bakery',
		cuisineTypes: ['Bakery', 'French', 'Pastries'],
		location: {
			name: 'Du Pain et des Idées',
			address: {
				street: '34 Rue Yves Toudic',
				city: 'Paris',
				country: 'France',
				formatted: '34 Rue Yves Toudic, 75010 Paris, France'
			},
			geo: { latitude: 48.8711, longitude: 2.3614 }
		},
		priceLevel: 2,
		estimatedCost: 8,
		currency: 'EUR',
		openingHours: {
			monday: { open: '06:45', close: '20:00' },
			tuesday: { open: '06:45', close: '20:00' },
			wednesday: { open: '06:45', close: '20:00' },
			thursday: { open: '06:45', close: '20:00' },
			friday: { open: '06:45', close: '20:00' },
			saturday: { closed: true, open: '', close: '' },
			sunday: { closed: true, open: '', close: '' }
		},
		rating: 4.7,
		reviewCount: 4100
	},

	// ============ TOKYO ============
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
		id: 'food-tokyo-003',
		name: 'Tsukiji Outer Market',
		venueType: 'food_market',
		cuisineTypes: ['Japanese', 'Seafood', 'Street Food'],
		location: {
			name: 'Tsukiji Outer Market',
			address: {
				street: '4-16-2 Tsukiji',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '4-16-2 Tsukiji, Chuo City, Tokyo 104-0045, Japan'
			},
			geo: { latitude: 35.6654, longitude: 139.7707 }
		},
		priceLevel: 2,
		estimatedCost: 25,
		currency: 'JPY',
		openingHours: {
			monday: { open: '05:00', close: '14:00' },
			tuesday: { open: '05:00', close: '14:00' },
			wednesday: { open: '05:00', close: '14:00' },
			thursday: { open: '05:00', close: '14:00' },
			friday: { open: '05:00', close: '14:00' },
			saturday: { open: '05:00', close: '14:00' },
			sunday: { open: '05:00', close: '14:00' }
		},
		rating: 4.5,
		reviewCount: 9800
	},
	{
		id: 'food-tokyo-004',
		name: 'Afuri Ramen',
		venueType: 'fast_food',
		cuisineTypes: ['Japanese', 'Ramen'],
		location: {
			name: 'Afuri Ramen',
			address: {
				street: '1-1-7 Ebisu',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '1-1-7 Ebisu, Shibuya City, Tokyo 150-0013, Japan'
			},
			geo: { latitude: 35.6467, longitude: 139.7101 }
		},
		priceLevel: 1,
		estimatedCost: 12,
		currency: 'JPY',
		openingHours: {
			monday: { open: '11:00', close: '23:00' },
			tuesday: { open: '11:00', close: '23:00' },
			wednesday: { open: '11:00', close: '23:00' },
			thursday: { open: '11:00', close: '23:00' },
			friday: { open: '11:00', close: '05:00' },
			saturday: { open: '11:00', close: '05:00' },
			sunday: { open: '11:00', close: '23:00' }
		},
		rating: 4.4,
		reviewCount: 5600
	},
	{
		id: 'food-tokyo-005',
		name: 'Gonpachi Nishi-Azabu',
		venueType: 'restaurant',
		cuisineTypes: ['Japanese', 'Izakaya'],
		location: {
			name: 'Gonpachi Nishi-Azabu',
			address: {
				street: '1-13-11 Nishi-Azabu',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '1-13-11 Nishi-Azabu, Minato City, Tokyo 106-0031, Japan'
			},
			geo: { latitude: 35.6586, longitude: 139.7265 }
		},
		priceLevel: 2,
		estimatedCost: 45,
		currency: 'JPY',
		website: 'https://gonpachi.jp',
		openingHours: {
			monday: { open: '11:30', close: '03:30' },
			tuesday: { open: '11:30', close: '03:30' },
			wednesday: { open: '11:30', close: '03:30' },
			thursday: { open: '11:30', close: '03:30' },
			friday: { open: '11:30', close: '05:00' },
			saturday: { open: '11:30', close: '05:00' },
			sunday: { open: '11:30', close: '23:00' }
		},
		rating: 4.3,
		reviewCount: 4200
	},

	// ============ SYDNEY ============
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
	},
	{
		id: 'food-sydney-003',
		name: 'Sydney Fish Market',
		venueType: 'food_market',
		cuisineTypes: ['Seafood', 'Australian'],
		location: {
			name: 'Sydney Fish Market',
			address: {
				street: 'Bank Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: 'Bank Street, Pyrmont NSW 2009, Australia'
			},
			geo: { latitude: -33.8700, longitude: 151.1922 }
		},
		priceLevel: 2,
		estimatedCost: 30,
		currency: 'AUD',
		website: 'https://www.sydneyfishmarket.com.au',
		openingHours: {
			monday: { open: '07:00', close: '16:00' },
			tuesday: { open: '07:00', close: '16:00' },
			wednesday: { open: '07:00', close: '16:00' },
			thursday: { open: '07:00', close: '16:00' },
			friday: { open: '07:00', close: '16:00' },
			saturday: { open: '07:00', close: '16:00' },
			sunday: { open: '07:00', close: '16:00' }
		},
		rating: 4.3,
		reviewCount: 12000
	},
	{
		id: 'food-sydney-004',
		name: 'Gelato Messina',
		venueType: 'other',
		cuisineTypes: ['Dessert', 'Gelato', 'Italian'],
		location: {
			name: 'Gelato Messina',
			address: {
				street: '389 Crown Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '389 Crown Street, Surry Hills NSW 2010, Australia'
			},
			geo: { latitude: -33.8826, longitude: 151.2137 }
		},
		priceLevel: 1,
		estimatedCost: 10,
		currency: 'AUD',
		website: 'https://www.gelatomessina.com',
		openingHours: {
			monday: { open: '12:00', close: '22:30' },
			tuesday: { open: '12:00', close: '22:30' },
			wednesday: { open: '12:00', close: '22:30' },
			thursday: { open: '12:00', close: '22:30' },
			friday: { open: '12:00', close: '23:00' },
			saturday: { open: '12:00', close: '23:00' },
			sunday: { open: '12:00', close: '22:30' }
		},
		rating: 4.6,
		reviewCount: 8400
	},
	{
		id: 'food-sydney-005',
		name: 'Chat Thai',
		venueType: 'restaurant',
		cuisineTypes: ['Thai', 'Asian'],
		location: {
			name: 'Chat Thai',
			address: {
				street: '20 Campbell Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '20 Campbell Street, Sydney NSW 2000, Australia'
			},
			geo: { latitude: -33.8785, longitude: 151.2052 }
		},
		priceLevel: 2,
		estimatedCost: 25,
		currency: 'AUD',
		website: 'https://www.chatthai.com.au',
		openingHours: {
			monday: { open: '11:00', close: '22:00' },
			tuesday: { open: '11:00', close: '22:00' },
			wednesday: { open: '11:00', close: '22:00' },
			thursday: { open: '11:00', close: '22:00' },
			friday: { open: '11:00', close: '23:00' },
			saturday: { open: '11:00', close: '23:00' },
			sunday: { open: '11:00', close: '22:00' }
		},
		rating: 4.4,
		reviewCount: 6800
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

/**
 * Search fake food venues data (used as fallback).
 */
function searchFakeFoodVenues(params: FoodSearchParams): FoodVenue[] {
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
}

/**
 * Food adapter that uses real Foursquare API with fallback to fake data.
 *
 * The adapter first tries the real API. If the API call fails (network error,
 * rate limit, API key not configured), it falls back to the fake data.
 */
export const foodAdapter: FoodAdapter = {
	async search(params: FoodSearchParams): Promise<FoodVenue[]> {
		// If no location provided, fall back to fake data
		if (!params.location) {
			console.log('[FoodAdapter] No location provided, using fake data');
			return searchFakeFoodVenues(params);
		}

		try {
			// Try real API first
			const apiResults = await searchFoodVenuesApi(params.location, {
				query: params.query,
				limit: params.limit,
				priceLevel: params.priceLevel
			});

			if (apiResults.length > 0) {
				return apiResults;
			}

			// If API returns no results, fall back to fake data
			const fakeResults = searchFakeFoodVenues(params);
			if (fakeResults.length > 0) {
				console.log(`[FoodAdapter] API returned no results, using fake data`);
				return fakeResults;
			}

			return [];
		} catch (error) {
			// Log the error and fall back to fake data
			console.warn(`[FoodAdapter] API error, falling back to fake data:`, error);
			return searchFakeFoodVenues(params);
		}
	},

	async getById(id: string): Promise<FoodVenue | null> {
		// Check fake venues first (for backward compatibility with existing IDs)
		const fakeVenue = fakeFoodVenues.find((v) => v.id === id);
		if (fakeVenue) {
			return fakeVenue;
		}
		// For Foursquare IDs (format: "fsq-..."), we could fetch details
		// but for now just return null
		return null;
	},

	async getDetails(venue: FoodVenue): Promise<FoodVenue> {
		return venue; // Already have full details from search
	}
};
