import type { AttractionAdapter, ActivitySearchParams, Activity } from '$lib/types/travel';

const fakeAttractions: Activity[] = [
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
