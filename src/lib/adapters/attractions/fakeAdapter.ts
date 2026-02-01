import type { AttractionAdapter, ActivitySearchParams, Activity } from '$lib/types/travel';
import { searchAttractions as searchAttractionsApi } from '$lib/api/placesApi';

// Fallback fake attractions for when API is unavailable or for demo/testing
const fakeAttractions: Activity[] = [
	// ============ SAN FRANCISCO (Primary Test City) ============
	{
		id: 'attraction-sf-001',
		name: 'Golden Gate Bridge',
		category: 'sightseeing',
		location: {
			name: 'Golden Gate Bridge',
			address: {
				street: 'Golden Gate Bridge',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Golden Gate Bridge, San Francisco, CA 94129, USA'
			},
			geo: { latitude: 37.8199, longitude: -122.4783 }
		},
		description: 'Iconic 1.7-mile suspension bridge with stunning views of the bay and city skyline.',
		duration: 90,
		price: 0,
		currency: 'USD',
		website: 'https://www.goldengate.org',
		openingHours: {
			monday: { open: '00:00', close: '23:59' },
			tuesday: { open: '00:00', close: '23:59' },
			wednesday: { open: '00:00', close: '23:59' },
			thursday: { open: '00:00', close: '23:59' },
			friday: { open: '00:00', close: '23:59' },
			saturday: { open: '00:00', close: '23:59' },
			sunday: { open: '00:00', close: '23:59' }
		},
		admissionInfo: 'Free to walk or bike across',
		tips: 'Best visited in the morning before fog rolls in. Dress in layers!',
		rating: 4.8,
		reviewCount: 156000
	},
	{
		id: 'attraction-sf-002',
		name: 'Alcatraz Island',
		category: 'tour',
		location: {
			name: 'Alcatraz Island',
			address: {
				street: 'Alcatraz Island',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Alcatraz Island, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8267, longitude: -122.4230 }
		},
		description: 'Historic federal penitentiary on an island in San Francisco Bay with audio-guided tours.',
		duration: 180,
		price: 41,
		currency: 'USD',
		bookingRequired: true,
		bookingUrl: 'https://www.alcatrazcitycruises.com',
		website: 'https://www.nps.gov/alca',
		openingHours: {
			monday: { open: '09:00', close: '18:30' },
			tuesday: { open: '09:00', close: '18:30' },
			wednesday: { open: '09:00', close: '18:30' },
			thursday: { open: '09:00', close: '18:30' },
			friday: { open: '09:00', close: '21:00' },
			saturday: { open: '09:00', close: '21:00' },
			sunday: { open: '09:00', close: '18:30' }
		},
		admissionInfo: 'Day tour: $41, Night tour: $47 (includes ferry)',
		tips: 'Book at least 2 weeks in advance, especially for night tours. Bring a jacket.',
		rating: 4.7,
		reviewCount: 89000
	},
	{
		id: 'attraction-sf-003',
		name: 'Fisherman\'s Wharf',
		category: 'sightseeing',
		location: {
			name: 'Fisherman\'s Wharf',
			address: {
				street: 'Jefferson Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Jefferson Street, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8080, longitude: -122.4177 }
		},
		description: 'Waterfront neighborhood famous for seafood, sea lions at Pier 39, and souvenir shops.',
		duration: 120,
		price: 0,
		currency: 'USD',
		website: 'https://www.fishermanswharf.org',
		admissionInfo: 'Free to explore',
		tips: 'Try the clam chowder in a sourdough bread bowl. Visit early to avoid crowds.',
		rating: 4.4,
		reviewCount: 125000
	},
	{
		id: 'attraction-sf-004',
		name: 'San Francisco Museum of Modern Art (SFMOMA)',
		category: 'museum',
		location: {
			name: 'SFMOMA',
			address: {
				street: '151 Third Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '151 Third Street, San Francisco, CA 94103, USA'
			},
			geo: { latitude: 37.7857, longitude: -122.4011 }
		},
		description: 'One of the largest modern and contemporary art museums in the United States.',
		duration: 180,
		price: 25,
		currency: 'USD',
		bookingUrl: 'https://www.sfmoma.org/visit/',
		website: 'https://www.sfmoma.org',
		openingHours: {
			monday: { open: '10:00', close: '17:00' },
			tuesday: { closed: true, open: '', close: '' },
			wednesday: { open: '10:00', close: '17:00' },
			thursday: { open: '10:00', close: '21:00' },
			friday: { open: '10:00', close: '17:00' },
			saturday: { open: '10:00', close: '17:00' },
			sunday: { open: '10:00', close: '17:00' }
		},
		admissionInfo: 'Adults: $25, Seniors: $22, Ages 19-24: $19, Under 19: Free',
		tips: 'Free first Thursdays of the month. Check out the living wall on the terrace.',
		rating: 4.6,
		reviewCount: 32000
	},
	{
		id: 'attraction-sf-005',
		name: 'Cable Car Ride',
		category: 'tour',
		location: {
			name: 'Powell Street Cable Car Turnaround',
			address: {
				street: 'Powell Street & Market Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Powell Street & Market Street, San Francisco, CA 94102, USA'
			},
			geo: { latitude: 37.7849, longitude: -122.4078 }
		},
		description: 'Ride the iconic San Francisco cable cars, the last manually operated system in the world.',
		duration: 45,
		price: 8,
		currency: 'USD',
		website: 'https://www.sfmta.com/getting-around/muni/cable-cars',
		admissionInfo: 'Single ride: $8, Day pass: $24',
		tips: 'Board at the ends of the line to guarantee a spot. Powell-Hyde line has best views.',
		rating: 4.5,
		reviewCount: 67000
	},
	{
		id: 'attraction-sf-006',
		name: 'Chinatown',
		category: 'sightseeing',
		location: {
			name: 'San Francisco Chinatown',
			address: {
				street: 'Grant Avenue',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Grant Avenue, San Francisco, CA 94108, USA'
			},
			geo: { latitude: 37.7941, longitude: -122.4078 }
		},
		description: 'The oldest and one of the largest Chinatowns in North America with authentic restaurants and shops.',
		duration: 90,
		price: 0,
		currency: 'USD',
		admissionInfo: 'Free to explore',
		tips: 'Enter through the Dragon Gate on Grant Avenue. Try the dim sum and fortune cookies.',
		rating: 4.4,
		reviewCount: 43000
	},
	{
		id: 'attraction-sf-007',
		name: 'Exploratorium',
		category: 'museum',
		location: {
			name: 'Exploratorium',
			address: {
				street: 'Pier 15',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Pier 15, San Francisco, CA 94111, USA'
			},
			geo: { latitude: 37.8017, longitude: -122.3975 }
		},
		description: 'Interactive science museum with hundreds of hands-on exhibits for all ages.',
		duration: 180,
		price: 30,
		currency: 'USD',
		bookingUrl: 'https://www.exploratorium.edu/visit',
		website: 'https://www.exploratorium.edu',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { open: '10:00', close: '17:00' },
			wednesday: { open: '10:00', close: '17:00' },
			thursday: { open: '10:00', close: '17:00' },
			friday: { open: '10:00', close: '17:00' },
			saturday: { open: '10:00', close: '17:00' },
			sunday: { open: '10:00', close: '17:00' }
		},
		admissionInfo: 'Adults: $30, Youth (4-17): $20, Seniors: $25',
		tips: 'Adults-only After Dark events on Thursday nights (18+).',
		rating: 4.6,
		reviewCount: 28000
	},
	{
		id: 'attraction-sf-008',
		name: 'Golden Gate Park',
		category: 'outdoor',
		location: {
			name: 'Golden Gate Park',
			address: {
				street: '501 Stanyan Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '501 Stanyan Street, San Francisco, CA 94117, USA'
			},
			geo: { latitude: 37.7694, longitude: -122.4862 }
		},
		description: 'Large urban park with gardens, museums, lakes, and the famous bison paddock.',
		duration: 180,
		price: 0,
		currency: 'USD',
		website: 'https://sfrecpark.org/destination/golden-gate-park/',
		admissionInfo: 'Free entry (individual attractions may have fees)',
		tips: 'Rent a bike to explore. Don\'t miss the Japanese Tea Garden and California Academy of Sciences.',
		rating: 4.8,
		reviewCount: 52000
	},
	{
		id: 'attraction-sf-009',
		name: 'California Academy of Sciences',
		category: 'museum',
		location: {
			name: 'California Academy of Sciences',
			address: {
				street: '55 Music Concourse Drive',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '55 Music Concourse Drive, San Francisco, CA 94118, USA'
			},
			geo: { latitude: 37.7699, longitude: -122.4661 }
		},
		description: 'Natural history museum with aquarium, planetarium, and living rainforest under one roof.',
		duration: 240,
		price: 36,
		currency: 'USD',
		bookingRequired: true,
		bookingUrl: 'https://www.calacademy.org/visit',
		website: 'https://www.calacademy.org',
		openingHours: {
			monday: { open: '09:30', close: '17:00' },
			tuesday: { open: '09:30', close: '17:00' },
			wednesday: { open: '09:30', close: '17:00' },
			thursday: { open: '09:30', close: '17:00' },
			friday: { open: '09:30', close: '17:00' },
			saturday: { open: '09:30', close: '17:00' },
			sunday: { open: '09:30', close: '17:00' }
		},
		admissionInfo: 'Adults: $36, Seniors (65+): $31, Youth (3-17): $26',
		tips: 'NightLife events every Thursday for adults 21+. Visit the penguins at feeding time.',
		rating: 4.7,
		reviewCount: 41000
	},
	{
		id: 'attraction-sf-010',
		name: 'Lombard Street',
		category: 'sightseeing',
		location: {
			name: 'Lombard Street',
			address: {
				street: 'Lombard Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Lombard Street, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8021, longitude: -122.4187 }
		},
		description: 'Famous crooked street with eight hairpin turns, beautifully landscaped with hydrangeas.',
		duration: 30,
		price: 0,
		currency: 'USD',
		admissionInfo: 'Free to visit',
		tips: 'Walk down the stairs on either side for better photos. Best in spring when flowers bloom.',
		rating: 4.3,
		reviewCount: 78000
	},
	{
		id: 'attraction-sf-011',
		name: 'Palace of Fine Arts',
		category: 'sightseeing',
		location: {
			name: 'Palace of Fine Arts',
			address: {
				street: '3601 Lyon Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '3601 Lyon Street, San Francisco, CA 94123, USA'
			},
			geo: { latitude: 37.8029, longitude: -122.4484 }
		},
		description: 'Stunning Greco-Roman rotunda originally built for the 1915 Panama-Pacific Exposition.',
		duration: 60,
		price: 0,
		currency: 'USD',
		website: 'https://palaceoffinearts.com',
		admissionInfo: 'Free to visit',
		tips: 'Perfect for photography, especially at sunset. Feed the swans and ducks in the lagoon.',
		rating: 4.7,
		reviewCount: 35000
	},
	{
		id: 'attraction-sf-012',
		name: 'Ferry Building Marketplace',
		category: 'shopping',
		location: {
			name: 'Ferry Building',
			address: {
				street: '1 Ferry Building',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1 Ferry Building, San Francisco, CA 94111, USA'
			},
			geo: { latitude: 37.7955, longitude: -122.3934 }
		},
		description: 'Historic ferry terminal turned gourmet marketplace with local artisan food vendors.',
		duration: 90,
		price: 0,
		currency: 'USD',
		website: 'https://www.ferrybuildingmarketplace.com',
		openingHours: {
			monday: { open: '10:00', close: '18:00' },
			tuesday: { open: '10:00', close: '18:00' },
			wednesday: { open: '10:00', close: '18:00' },
			thursday: { open: '10:00', close: '18:00' },
			friday: { open: '10:00', close: '18:00' },
			saturday: { open: '08:00', close: '18:00' },
			sunday: { open: '11:00', close: '17:00' }
		},
		admissionInfo: 'Free entry',
		tips: 'Visit on Saturday for the famous farmers market. Try Blue Bottle Coffee and Cowgirl Creamery.',
		rating: 4.5,
		reviewCount: 29000
	},
	{
		id: 'attraction-sf-013',
		name: 'Bay Cruise Adventure',
		category: 'tour',
		location: {
			name: 'Pier 39',
			address: {
				street: 'Pier 39',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Pier 39, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8087, longitude: -122.4098 }
		},
		description: 'Scenic boat tour under the Golden Gate Bridge and around Alcatraz Island.',
		duration: 60,
		price: 38,
		currency: 'USD',
		bookingUrl: 'https://www.blueandgoldfleet.com',
		website: 'https://www.blueandgoldfleet.com',
		admissionInfo: 'Adults: $38, Children (5-11): $26',
		tips: 'Sit on the right side going out for best Golden Gate views. Bring layers, it\'s windy!',
		rating: 4.5,
		reviewCount: 18000
	},
	{
		id: 'attraction-sf-014',
		name: 'Coit Tower',
		category: 'sightseeing',
		location: {
			name: 'Coit Tower',
			address: {
				street: '1 Telegraph Hill Blvd',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '1 Telegraph Hill Blvd, San Francisco, CA 94133, USA'
			},
			geo: { latitude: 37.8024, longitude: -122.4058 }
		},
		description: 'Art Deco tower with 360-degree views of San Francisco and Depression-era murals.',
		duration: 60,
		price: 9,
		currency: 'USD',
		website: 'https://sfrecpark.org/destination/telegraph-hill-pioneer-park/coit-tower/',
		openingHours: {
			monday: { open: '10:00', close: '17:00' },
			tuesday: { open: '10:00', close: '17:00' },
			wednesday: { open: '10:00', close: '17:00' },
			thursday: { open: '10:00', close: '17:00' },
			friday: { open: '10:00', close: '17:00' },
			saturday: { open: '10:00', close: '17:00' },
			sunday: { open: '10:00', close: '17:00' }
		},
		admissionInfo: 'Adults: $9, Seniors: $6, Youth (5-11): $6',
		tips: 'Take the Filbert Steps up for a scenic walk through gardens. Free to see murals on ground floor.',
		rating: 4.4,
		reviewCount: 22000
	},
	{
		id: 'attraction-sf-015',
		name: 'Haight-Ashbury',
		category: 'sightseeing',
		location: {
			name: 'Haight-Ashbury',
			address: {
				street: 'Haight Street & Ashbury Street',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: 'Haight Street & Ashbury Street, San Francisco, CA 94117, USA'
			},
			geo: { latitude: 37.7692, longitude: -122.4481 }
		},
		description: 'Historic neighborhood famous for 1960s counterculture, vintage shops, and Victorian homes.',
		duration: 90,
		price: 0,
		currency: 'USD',
		admissionInfo: 'Free to explore',
		tips: 'Look for the Grateful Dead house at 710 Ashbury. Great for vintage shopping and people-watching.',
		rating: 4.2,
		reviewCount: 19000
	},
	{
		id: 'attraction-sf-016',
		name: 'de Young Museum',
		category: 'museum',
		location: {
			name: 'de Young Museum',
			address: {
				street: '50 Hagiwara Tea Garden Drive',
				city: 'San Francisco',
				state: 'CA',
				country: 'USA',
				formatted: '50 Hagiwara Tea Garden Drive, San Francisco, CA 94118, USA'
			},
			geo: { latitude: 37.7716, longitude: -122.4686 }
		},
		description: 'Fine arts museum featuring American art from the 17th century to present, plus global textiles.',
		duration: 150,
		price: 15,
		currency: 'USD',
		bookingUrl: 'https://www.famsf.org/visit/de-young',
		website: 'https://www.famsf.org',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { open: '09:30', close: '17:15' },
			wednesday: { open: '09:30', close: '17:15' },
			thursday: { open: '09:30', close: '17:15' },
			friday: { open: '09:30', close: '20:45' },
			saturday: { open: '09:30', close: '17:15' },
			sunday: { open: '09:30', close: '17:15' }
		},
		admissionInfo: 'Adults: $15, Seniors: $12, Students: $6. Free first Tuesdays.',
		tips: 'The Hamon Tower observation deck is free and offers great views of Golden Gate Park.',
		rating: 4.5,
		reviewCount: 18000
	},

	// ============ MONTEREY ============
	{
		id: 'attraction-monterey-001',
		name: 'Monterey Bay Aquarium',
		category: 'museum',
		location: {
			name: 'Monterey Bay Aquarium',
			address: {
				street: '886 Cannery Row',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '886 Cannery Row, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6181, longitude: -121.9018 }
		},
		description: 'World-renowned aquarium showcasing the marine life of Monterey Bay with interactive exhibits.',
		duration: 240,
		price: 55,
		currency: 'USD',
		bookingRequired: true,
		bookingUrl: 'https://www.montereybayaquarium.org/visit/tickets',
		website: 'https://www.montereybayaquarium.org',
		openingHours: {
			monday: { open: '10:00', close: '17:00' },
			tuesday: { open: '10:00', close: '17:00' },
			wednesday: { open: '10:00', close: '17:00' },
			thursday: { open: '10:00', close: '17:00' },
			friday: { open: '10:00', close: '17:00' },
			saturday: { open: '10:00', close: '18:00' },
			sunday: { open: '10:00', close: '18:00' }
		},
		admissionInfo: 'Adults: $55, Students/Seniors: $45, Youth (3-12): $40',
		tips: 'Book timed tickets in advance. Don\'t miss the kelp forest and sea otter exhibits.',
		rating: 4.8,
		reviewCount: 67000
	},
	{
		id: 'attraction-monterey-002',
		name: '17-Mile Drive',
		category: 'outdoor',
		location: {
			name: '17-Mile Drive',
			address: {
				street: 'Pacific Grove Gate',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '17-Mile Drive, Pebble Beach, CA 93953, USA'
			},
			geo: { latitude: 36.5925, longitude: -121.9497 }
		},
		description: 'Scenic coastal drive through Pebble Beach with famous Lone Cypress and ocean views.',
		duration: 120,
		price: 12,
		currency: 'USD',
		website: 'https://www.pebblebeach.com/17-mile-drive/',
		admissionInfo: 'Entry fee: $12 per vehicle',
		tips: 'Best during golden hour. Stop at all the viewpoints and bring binoculars for wildlife.',
		rating: 4.6,
		reviewCount: 34000
	},
	{
		id: 'attraction-monterey-003',
		name: 'Cannery Row',
		category: 'sightseeing',
		location: {
			name: 'Cannery Row',
			address: {
				street: 'Cannery Row',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: 'Cannery Row, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6169, longitude: -121.8973 }
		},
		description: 'Historic waterfront street once home to sardine canneries, now filled with shops and restaurants.',
		duration: 90,
		price: 0,
		currency: 'USD',
		website: 'https://www.canneryrow.com',
		admissionInfo: 'Free to explore',
		tips: 'Read Steinbeck\'s novel before visiting. Great for seafood dining and souvenir shopping.',
		rating: 4.3,
		reviewCount: 28000
	},
	{
		id: 'attraction-monterey-004',
		name: 'Whale Watching Tour',
		category: 'tour',
		location: {
			name: 'Monterey Bay Whale Watch',
			address: {
				street: '84 Fisherman\'s Wharf',
				city: 'Monterey',
				state: 'CA',
				country: 'USA',
				formatted: '84 Fisherman\'s Wharf, Monterey, CA 93940, USA'
			},
			geo: { latitude: 36.6046, longitude: -121.8894 }
		},
		description: 'Boat tour to see humpback whales, blue whales, orcas, and dolphins in their natural habitat.',
		duration: 240,
		price: 65,
		currency: 'USD',
		bookingRequired: true,
		bookingUrl: 'https://www.montereybaywhalewatch.com',
		website: 'https://www.montereybaywhalewatch.com',
		admissionInfo: 'Adults: $65, Children (3-12): $45',
		tips: 'Bring motion sickness medication if prone. Best whale watching from April to November.',
		rating: 4.7,
		reviewCount: 12000
	},
	{
		id: 'attraction-monterey-005',
		name: 'Point Lobos State Natural Reserve',
		category: 'outdoor',
		location: {
			name: 'Point Lobos',
			address: {
				street: '62 CA-1',
				city: 'Carmel-by-the-Sea',
				state: 'CA',
				country: 'USA',
				formatted: '62 CA-1, Carmel-by-the-Sea, CA 93923, USA'
			},
			geo: { latitude: 36.5144, longitude: -121.9380 }
		},
		description: 'Stunning coastal reserve with hiking trails, tide pools, and abundant wildlife including sea lions.',
		duration: 180,
		price: 10,
		currency: 'USD',
		website: 'https://www.parks.ca.gov/?page_id=571',
		openingHours: {
			monday: { open: '08:00', close: '17:00' },
			tuesday: { open: '08:00', close: '17:00' },
			wednesday: { open: '08:00', close: '17:00' },
			thursday: { open: '08:00', close: '17:00' },
			friday: { open: '08:00', close: '17:00' },
			saturday: { open: '08:00', close: '17:00' },
			sunday: { open: '08:00', close: '17:00' }
		},
		admissionInfo: 'Parking: $10 per vehicle. Walk-in free.',
		tips: 'Arrive early on weekends as parking fills quickly. Bird Rockattracts thousands of seabirds.',
		rating: 4.9,
		reviewCount: 19000
	},

	// ============ SAN DIEGO ============
	{
		id: 'attraction-sandiego-001',
		name: 'San Diego Zoo',
		category: 'outdoor',
		location: {
			name: 'San Diego Zoo',
			address: {
				street: '2920 Zoo Drive',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '2920 Zoo Drive, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7353, longitude: -117.1490 }
		},
		description: 'World-famous zoo housing over 3,700 animals in naturalistic habitats.',
		duration: 300,
		price: 67,
		currency: 'USD',
		bookingUrl: 'https://zoo.sandiegozoo.org/tickets',
		website: 'https://zoo.sandiegozoo.org',
		openingHours: {
			monday: { open: '09:00', close: '18:00' },
			tuesday: { open: '09:00', close: '18:00' },
			wednesday: { open: '09:00', close: '18:00' },
			thursday: { open: '09:00', close: '18:00' },
			friday: { open: '09:00', close: '18:00' },
			saturday: { open: '09:00', close: '20:00' },
			sunday: { open: '09:00', close: '20:00' }
		},
		admissionInfo: 'Adults (12+): $67, Children (3-11): $57',
		tips: 'Use the Skyfari aerial tram for great views. Visit early morning when animals are most active.',
		rating: 4.7,
		reviewCount: 89000
	},
	{
		id: 'attraction-sandiego-002',
		name: 'Balboa Park',
		category: 'outdoor',
		location: {
			name: 'Balboa Park',
			address: {
				street: '1549 El Prado',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '1549 El Prado, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7341, longitude: -117.1441 }
		},
		description: '1,200-acre urban park with 17 museums, gardens, and stunning Spanish Colonial architecture.',
		duration: 180,
		price: 0,
		currency: 'USD',
		website: 'https://www.balboapark.org',
		admissionInfo: 'Park is free. Individual museum admission varies.',
		tips: 'Get the Explorer Pass for multiple museums. Free organ concerts on Sundays.',
		rating: 4.8,
		reviewCount: 56000
	},
	{
		id: 'attraction-sandiego-003',
		name: 'USS Midway Museum',
		category: 'museum',
		location: {
			name: 'USS Midway Museum',
			address: {
				street: '910 N Harbor Drive',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '910 N Harbor Drive, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7137, longitude: -117.1751 }
		},
		description: 'Historic aircraft carrier museum with restored aircraft and interactive exhibits.',
		duration: 180,
		price: 26,
		currency: 'USD',
		bookingUrl: 'https://www.midway.org/visit/buy-tickets/',
		website: 'https://www.midway.org',
		openingHours: {
			monday: { open: '10:00', close: '17:00' },
			tuesday: { open: '10:00', close: '17:00' },
			wednesday: { open: '10:00', close: '17:00' },
			thursday: { open: '10:00', close: '17:00' },
			friday: { open: '10:00', close: '17:00' },
			saturday: { open: '10:00', close: '17:00' },
			sunday: { open: '10:00', close: '17:00' }
		},
		admissionInfo: 'Adults: $26, Seniors (62+): $23, Youth (6-12): $18',
		tips: 'Use the audio tour narrated by Midway sailors. Climb into cockpits on the flight deck.',
		rating: 4.8,
		reviewCount: 42000
	},
	{
		id: 'attraction-sandiego-004',
		name: 'La Jolla Cove',
		category: 'outdoor',
		location: {
			name: 'La Jolla Cove',
			address: {
				street: '1100 Coast Blvd',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: '1100 Coast Blvd, La Jolla, CA 92037, USA'
			},
			geo: { latitude: 32.8505, longitude: -117.2728 }
		},
		description: 'Picturesque cove with crystal-clear water, sea lions, and excellent snorkeling.',
		duration: 120,
		price: 0,
		currency: 'USD',
		admissionInfo: 'Free',
		tips: 'Bring snorkeling gear to see the underwater marine reserve. Watch sea lions from the cliffs.',
		rating: 4.7,
		reviewCount: 38000
	},
	{
		id: 'attraction-sandiego-005',
		name: 'Gaslamp Quarter',
		category: 'entertainment',
		location: {
			name: 'Gaslamp Quarter',
			address: {
				street: 'Fifth Avenue',
				city: 'San Diego',
				state: 'CA',
				country: 'USA',
				formatted: 'Fifth Avenue, San Diego, CA 92101, USA'
			},
			geo: { latitude: 32.7108, longitude: -117.1601 }
		},
		description: 'Historic 16-block district with Victorian architecture, restaurants, bars, and nightlife.',
		duration: 180,
		price: 0,
		currency: 'USD',
		website: 'https://www.gaslamp.org',
		admissionInfo: 'Free to explore',
		tips: 'Best experienced in the evening. Great for dining, bar hopping, and people watching.',
		rating: 4.4,
		reviewCount: 31000
	},

	// ============ PARIS ============
	{
		id: 'attraction-paris-001',
		name: 'Eiffel Tower',
		category: 'sightseeing',
		location: {
			name: 'Eiffel Tower',
			address: {
				street: 'Champ de Mars, 5 Avenue Anatole France',
				city: 'Paris',
				country: 'France',
				formatted: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France'
			},
			geo: { latitude: 48.8584, longitude: 2.2945 }
		},
		description: 'Iconic iron lattice tower on the Champ de Mars, symbol of Paris.',
		duration: 120,
		price: 26,
		currency: 'EUR',
		bookingRequired: true,
		bookingUrl: 'https://www.toureiffel.paris/en',
		website: 'https://www.toureiffel.paris/en',
		openingHours: {
			monday: { open: '09:30', close: '23:45' },
			tuesday: { open: '09:30', close: '23:45' },
			wednesday: { open: '09:30', close: '23:45' },
			thursday: { open: '09:30', close: '23:45' },
			friday: { open: '09:30', close: '23:45' },
			saturday: { open: '09:30', close: '23:45' },
			sunday: { open: '09:30', close: '23:45' }
		},
		admissionInfo: 'Summit access: €26, Second floor: €16',
		tips: 'Book tickets online in advance to skip the queue',
		rating: 4.7,
		reviewCount: 245000
	},
	{
		id: 'attraction-paris-002',
		name: 'Louvre Museum',
		category: 'museum',
		location: {
			name: 'Louvre Museum',
			address: {
				street: 'Rue de Rivoli',
				city: 'Paris',
				country: 'France',
				formatted: 'Rue de Rivoli, 75001 Paris, France'
			},
			geo: { latitude: 48.8606, longitude: 2.3376 }
		},
		description: "World's largest art museum and home to the Mona Lisa.",
		duration: 240,
		price: 17,
		currency: 'EUR',
		bookingRequired: true,
		bookingUrl: 'https://www.louvre.fr/en/visit',
		website: 'https://www.louvre.fr/en',
		openingHours: {
			monday: { open: '09:00', close: '18:00' },
			tuesday: { closed: true, open: '', close: '' },
			wednesday: { open: '09:00', close: '21:45' },
			thursday: { open: '09:00', close: '18:00' },
			friday: { open: '09:00', close: '21:45' },
			saturday: { open: '09:00', close: '18:00' },
			sunday: { open: '09:00', close: '18:00' }
		},
		admissionInfo: 'General admission: €17, Free for under 18',
		tips: 'Closed on Tuesdays. Enter via Carrousel entrance to avoid crowds.',
		rating: 4.8,
		reviewCount: 189000
	},
	{
		id: 'attraction-paris-003',
		name: 'Seine River Cruise',
		category: 'tour',
		location: {
			name: 'Bateaux Mouches',
			address: {
				street: 'Port de la Conférence',
				city: 'Paris',
				country: 'France',
				formatted: 'Port de la Conférence, 75008 Paris, France'
			},
			geo: { latitude: 48.8637, longitude: 2.3014 }
		},
		description: 'Scenic boat cruise along the Seine River past major landmarks.',
		duration: 70,
		price: 16,
		currency: 'EUR',
		bookingUrl: 'https://www.bateaux-mouches.fr',
		website: 'https://www.bateaux-mouches.fr',
		rating: 4.5,
		reviewCount: 32000
	},
	{
		id: 'attraction-paris-004',
		name: 'Sacré-Cœur Basilica',
		category: 'sightseeing',
		location: {
			name: 'Sacré-Cœur',
			address: {
				street: '35 Rue du Chevalier de la Barre',
				city: 'Paris',
				country: 'France',
				formatted: '35 Rue du Chevalier de la Barre, 75018 Paris, France'
			},
			geo: { latitude: 48.8867, longitude: 2.3431 }
		},
		description: 'Beautiful white basilica atop Montmartre hill with panoramic city views.',
		duration: 90,
		price: 0,
		currency: 'EUR',
		website: 'https://www.sacre-coeur-montmartre.com',
		admissionInfo: 'Free entry. Dome access: €6',
		tips: 'Visit at sunset for stunning views over Paris. Explore the artsy Montmartre neighborhood.',
		rating: 4.7,
		reviewCount: 98000
	},
	{
		id: 'attraction-paris-005',
		name: 'Musée d\'Orsay',
		category: 'museum',
		location: {
			name: 'Musée d\'Orsay',
			address: {
				street: '1 Rue de la Légion d\'Honneur',
				city: 'Paris',
				country: 'France',
				formatted: '1 Rue de la Légion d\'Honneur, 75007 Paris, France'
			},
			geo: { latitude: 48.8600, longitude: 2.3266 }
		},
		description: 'Impressionist and post-impressionist masterpieces in a stunning former railway station.',
		duration: 180,
		price: 14,
		currency: 'EUR',
		bookingUrl: 'https://www.musee-orsay.fr/en',
		website: 'https://www.musee-orsay.fr/en',
		openingHours: {
			monday: { closed: true, open: '', close: '' },
			tuesday: { open: '09:30', close: '18:00' },
			wednesday: { open: '09:30', close: '18:00' },
			thursday: { open: '09:30', close: '21:45' },
			friday: { open: '09:30', close: '18:00' },
			saturday: { open: '09:30', close: '18:00' },
			sunday: { open: '09:30', close: '18:00' }
		},
		admissionInfo: 'Adults: €14, Free for under 18',
		tips: 'See works by Monet, Van Gogh, and Renoir. Less crowded than the Louvre.',
		rating: 4.8,
		reviewCount: 72000
	},

	// ============ TOKYO ============
	{
		id: 'attraction-tokyo-001',
		name: 'Senso-ji Temple',
		category: 'sightseeing',
		location: {
			name: 'Senso-ji Temple',
			address: {
				street: '2 Chome-3-1 Asakusa',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan'
			},
			geo: { latitude: 35.7148, longitude: 139.7967 }
		},
		description: "Tokyo's oldest temple, featuring Nakamise shopping street.",
		duration: 90,
		price: 0,
		currency: 'JPY',
		website: 'https://www.senso-ji.jp',
		openingHours: {
			monday: { open: '06:00', close: '17:00' },
			tuesday: { open: '06:00', close: '17:00' },
			wednesday: { open: '06:00', close: '17:00' },
			thursday: { open: '06:00', close: '17:00' },
			friday: { open: '06:00', close: '17:00' },
			saturday: { open: '06:00', close: '17:00' },
			sunday: { open: '06:00', close: '17:00' }
		},
		admissionInfo: 'Free admission',
		tips: 'Visit early morning to avoid crowds. Try the street food on Nakamise.',
		rating: 4.6,
		reviewCount: 87000
	},
	{
		id: 'attraction-tokyo-002',
		name: 'teamLab Borderless',
		category: 'museum',
		location: {
			name: 'teamLab Borderless',
			address: {
				street: 'Azabudai Hills Garden Plaza B B1F',
				city: 'Tokyo',
				country: 'Japan',
				formatted: 'Azabudai Hills Garden Plaza B B1F, Minato City, Tokyo, Japan'
			},
			geo: { latitude: 35.6594, longitude: 139.7381 }
		},
		description: 'Immersive digital art museum with interactive installations.',
		duration: 180,
		price: 3800,
		currency: 'JPY',
		bookingRequired: true,
		bookingUrl: 'https://www.teamlab.art/e/borderless-azabudai/',
		website: 'https://www.teamlab.art',
		openingHours: {
			monday: { open: '10:00', close: '21:00' },
			tuesday: { closed: true, open: '', close: '' },
			wednesday: { open: '10:00', close: '21:00' },
			thursday: { open: '10:00', close: '21:00' },
			friday: { open: '10:00', close: '21:00' },
			saturday: { open: '10:00', close: '21:00' },
			sunday: { open: '10:00', close: '21:00' }
		},
		admissionInfo: 'Adults: ¥3,800',
		tips: 'Wear white clothing for the best experience with projections.',
		rating: 4.7,
		reviewCount: 45000
	},
	{
		id: 'attraction-tokyo-003',
		name: 'Tokyo Skytree',
		category: 'sightseeing',
		location: {
			name: 'Tokyo Skytree',
			address: {
				street: '1 Chome-1-2 Oshiage',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '1 Chome-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan'
			},
			geo: { latitude: 35.7101, longitude: 139.8107 }
		},
		description: 'Tallest structure in Japan at 634m with observation decks offering city-wide views.',
		duration: 120,
		price: 2100,
		currency: 'JPY',
		bookingUrl: 'https://www.tokyo-skytree.jp/en/',
		website: 'https://www.tokyo-skytree.jp/en/',
		admissionInfo: 'Tembo Deck: ¥2,100, Tembo Galleria: ¥1,000 additional',
		tips: 'Visit at night for spectacular city lights. Clear days offer views of Mt. Fuji.',
		rating: 4.5,
		reviewCount: 54000
	},
	{
		id: 'attraction-tokyo-004',
		name: 'Meiji Shrine',
		category: 'sightseeing',
		location: {
			name: 'Meiji Shrine',
			address: {
				street: '1-1 Yoyogikamizonocho',
				city: 'Tokyo',
				country: 'Japan',
				formatted: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan'
			},
			geo: { latitude: 35.6764, longitude: 139.6993 }
		},
		description: 'Serene Shinto shrine surrounded by a 170-acre evergreen forest in central Tokyo.',
		duration: 90,
		price: 0,
		currency: 'JPY',
		website: 'https://www.meijijingu.or.jp/en/',
		admissionInfo: 'Free admission',
		tips: 'Write a wish on an ema wooden plaque. Visit early morning for peaceful atmosphere.',
		rating: 4.6,
		reviewCount: 62000
	},
	{
		id: 'attraction-tokyo-005',
		name: 'Shibuya Crossing',
		category: 'sightseeing',
		location: {
			name: 'Shibuya Crossing',
			address: {
				street: 'Shibuya Station',
				city: 'Tokyo',
				country: 'Japan',
				formatted: 'Shibuya Crossing, Shibuya City, Tokyo, Japan'
			},
			geo: { latitude: 35.6595, longitude: 139.7004 }
		},
		description: 'World\'s busiest pedestrian crossing with up to 3,000 people crossing at once.',
		duration: 30,
		price: 0,
		currency: 'JPY',
		admissionInfo: 'Free',
		tips: 'Best viewed from Starbucks above the crossing or the Shibuya Sky observation deck.',
		rating: 4.4,
		reviewCount: 48000
	},

	// ============ SYDNEY ============
	{
		id: 'attraction-sydney-001',
		name: 'Sydney Opera House Tour',
		category: 'tour',
		location: {
			name: 'Sydney Opera House',
			address: {
				street: 'Bennelong Point',
				city: 'Sydney',
				country: 'Australia',
				formatted: 'Bennelong Point, Sydney NSW 2000, Australia'
			},
			geo: { latitude: -33.8568, longitude: 151.2153 }
		},
		description: 'Guided tour of the iconic performing arts venue.',
		duration: 60,
		price: 43,
		currency: 'AUD',
		bookingRequired: true,
		bookingUrl: 'https://www.sydneyoperahouse.com/visit/tours',
		website: 'https://www.sydneyoperahouse.com',
		openingHours: {
			monday: { open: '09:00', close: '17:00' },
			tuesday: { open: '09:00', close: '17:00' },
			wednesday: { open: '09:00', close: '17:00' },
			thursday: { open: '09:00', close: '17:00' },
			friday: { open: '09:00', close: '17:00' },
			saturday: { open: '09:00', close: '17:00' },
			sunday: { open: '09:00', close: '17:00' }
		},
		admissionInfo: 'Guided tour: AUD $43',
		rating: 4.6,
		reviewCount: 28000
	},
	{
		id: 'attraction-sydney-002',
		name: 'Taronga Zoo',
		category: 'outdoor',
		location: {
			name: 'Taronga Zoo',
			address: {
				street: 'Bradleys Head Road',
				city: 'Sydney',
				country: 'Australia',
				formatted: 'Bradleys Head Road, Mosman NSW 2088, Australia'
			},
			geo: { latitude: -33.8436, longitude: 151.2411 }
		},
		description: 'World-class zoo with stunning harbour views and native Australian wildlife.',
		duration: 240,
		price: 51,
		currency: 'AUD',
		bookingUrl: 'https://taronga.org.au/sydney-zoo',
		website: 'https://taronga.org.au/sydney-zoo',
		openingHours: {
			monday: { open: '09:30', close: '16:30' },
			tuesday: { open: '09:30', close: '16:30' },
			wednesday: { open: '09:30', close: '16:30' },
			thursday: { open: '09:30', close: '16:30' },
			friday: { open: '09:30', close: '16:30' },
			saturday: { open: '09:30', close: '16:30' },
			sunday: { open: '09:30', close: '16:30' }
		},
		admissionInfo: 'Adults: AUD $51, Children: AUD $30',
		tips: 'Take the ferry from Circular Quay for a scenic arrival.',
		rating: 4.5,
		reviewCount: 21000
	},
	{
		id: 'attraction-sydney-003',
		name: 'Sydney Harbour Bridge Climb',
		category: 'outdoor',
		location: {
			name: 'Sydney Harbour Bridge',
			address: {
				street: '3 Cumberland Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: '3 Cumberland Street, The Rocks NSW 2000, Australia'
			},
			geo: { latitude: -33.8523, longitude: 151.2108 }
		},
		description: 'Climb to the summit of the iconic bridge for 360-degree views of Sydney.',
		duration: 180,
		price: 268,
		currency: 'AUD',
		bookingRequired: true,
		bookingUrl: 'https://www.bridgeclimb.com',
		website: 'https://www.bridgeclimb.com',
		admissionInfo: 'From AUD $268 depending on time',
		tips: 'Twilight and dawn climbs offer the best light for photos. Book well in advance.',
		rating: 4.8,
		reviewCount: 15000
	},
	{
		id: 'attraction-sydney-004',
		name: 'Bondi Beach',
		category: 'outdoor',
		location: {
			name: 'Bondi Beach',
			address: {
				street: 'Queen Elizabeth Drive',
				city: 'Sydney',
				country: 'Australia',
				formatted: 'Queen Elizabeth Drive, Bondi Beach NSW 2026, Australia'
			},
			geo: { latitude: -33.8915, longitude: 151.2767 }
		},
		description: 'Australia\'s most famous beach with golden sand, surf, and coastal walking path.',
		duration: 180,
		price: 0,
		currency: 'AUD',
		admissionInfo: 'Free',
		tips: 'Walk the Bondi to Coogee coastal trail. Learn to surf with a lesson from local schools.',
		rating: 4.6,
		reviewCount: 67000
	},
	{
		id: 'attraction-sydney-005',
		name: 'The Rocks Walking Tour',
		category: 'tour',
		location: {
			name: 'The Rocks',
			address: {
				street: 'George Street',
				city: 'Sydney',
				country: 'Australia',
				formatted: 'George Street, The Rocks NSW 2000, Australia'
			},
			geo: { latitude: -33.8599, longitude: 151.2090 }
		},
		description: 'Explore Sydney\'s oldest neighborhood with convict-era history and cobblestone lanes.',
		duration: 90,
		price: 35,
		currency: 'AUD',
		website: 'https://www.therocks.com',
		admissionInfo: 'Guided tours from AUD $35',
		tips: 'Visit on weekends for The Rocks Markets. Many historic pubs for an evening drink.',
		rating: 4.5,
		reviewCount: 12000
	}
];

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesQuery(activity: Activity, query?: string): boolean {
	if (!query) return true;
	const lowerQuery = query.toLowerCase();
	return (
		activity.name.toLowerCase().includes(lowerQuery) ||
		activity.location.address.city.toLowerCase().includes(lowerQuery) ||
		activity.category.toLowerCase().includes(lowerQuery) ||
		(activity.description?.toLowerCase().includes(lowerQuery) ?? false)
	);
}

export const fakeAttractionAdapter: AttractionAdapter = {
	async search(params: ActivitySearchParams): Promise<Activity[]> {
		await delay(200 + Math.random() * 200);

		return fakeAttractions
			.filter((activity) => matchesQuery(activity, params.query))
			.filter((activity) => {
				if (!params.categories?.length) return true;
				return params.categories.includes(activity.category);
			})
			.filter((activity) => {
				if (!params.minRating) return true;
				return (activity.rating ?? 0) >= params.minRating;
			})
			.slice(0, params.limit || 20);
	},

	async getById(id: string): Promise<Activity | null> {
		await delay(100);
		return fakeAttractions.find((a) => a.id === id) || null;
	},

	async getDetails(activity: Activity): Promise<Activity> {
		await delay(150);
		return activity;
	}
};

/**
 * Search fake attractions data (used as fallback).
 */
function searchFakeAttractions(params: ActivitySearchParams): Activity[] {
	return fakeAttractions
		.filter((activity) => matchesQuery(activity, params.query))
		.filter((activity) => {
			if (!params.categories?.length) return true;
			return params.categories.includes(activity.category);
		})
		.filter((activity) => {
			if (!params.minRating) return true;
			return (activity.rating ?? 0) >= params.minRating;
		})
		.slice(0, params.limit || 20);
}

/**
 * Attraction adapter that uses real Foursquare API with fallback to fake data.
 *
 * The adapter first tries the real API. If the API call fails (network error,
 * rate limit, API key not configured), it falls back to the fake data.
 */
export const attractionAdapter: AttractionAdapter = {
	async search(params: ActivitySearchParams): Promise<Activity[]> {
		// If no location provided, fall back to fake data
		if (!params.location) {
			console.log('[AttractionAdapter] No location provided, using fake data');
			return searchFakeAttractions(params);
		}

		try {
			// Try real API first
			const apiResults = await searchAttractionsApi(params.location, {
				query: params.query,
				limit: params.limit,
				categories: params.categories
			});

			if (apiResults.length > 0) {
				return apiResults;
			}

			// If API returns no results, fall back to fake data
			const fakeResults = searchFakeAttractions(params);
			if (fakeResults.length > 0) {
				console.log(`[AttractionAdapter] API returned no results, using fake data`);
				return fakeResults;
			}

			return [];
		} catch (error) {
			// Log the error and fall back to fake data
			console.warn(`[AttractionAdapter] API error, falling back to fake data:`, error);
			return searchFakeAttractions(params);
		}
	},

	async getById(id: string): Promise<Activity | null> {
		// Check fake attractions first (for backward compatibility with existing IDs)
		const fakeActivity = fakeAttractions.find((a) => a.id === id);
		if (fakeActivity) {
			return fakeActivity;
		}
		// For Foursquare IDs (format: "fsq-..."), we could fetch details
		// but for now just return null
		return null;
	},

	async getDetails(activity: Activity): Promise<Activity> {
		return activity; // Already have full details from search
	}
};
