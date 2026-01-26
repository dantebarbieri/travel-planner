import type {
	Trip,
	City,
	Stay,
	Activity,
	FoodVenue,
	TransportLeg,
	ItineraryDay,
	DailyItem,
	NewDailyItem,
	ColorScheme,
	Location
} from '$lib/types/travel';
import { storageService } from '$lib/services/storageService';
import { generateTripId, generateCityId, generateDayId, generateItemId } from '$lib/utils/ids';
import { getDefaultColorScheme, assignStayColorsWithInferred } from '$lib/utils/colors';
import { getDatesInRange, getDayNumber } from '$lib/utils/dates';

interface TripStoreState {
	trips: Trip[];
	currentTripId: string | null;
	isLoading: boolean;
	error: string | null;
	lastSaved: Date | null;
}

// Reactive state using Svelte 5 runes
let state = $state<TripStoreState>({
	trips: [],
	currentTripId: null,
	isLoading: false,
	error: null,
	lastSaved: null
});

// Derived values
const currentTrip = $derived(state.trips.find((t) => t.id === state.currentTripId) ?? null);

const sortedTrips = $derived(
	[...state.trips].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
	)
);

const tripCount = $derived(state.trips.length);

// ============ Load/Save ============

function loadTrips(): void {
	state.isLoading = true;
	state.error = null;
	try {
		state.trips = storageService.loadTrips();
		state.lastSaved = storageService.getLastSaveTime();
	} catch (e) {
		state.error = 'Failed to load trips';
		console.error(e);
	} finally {
		state.isLoading = false;
	}
}

function saveTrips(): void {
	storageService.saveTripsDebounced(state.trips);
	state.lastSaved = new Date();
}

// ============ Trip CRUD ============

function createTrip(data: {
	name: string;
	homeCity: Location;
	startDate: string;
	endDate: string;
	description?: string;
}): Trip {
	const trip: Trip = {
		id: generateTripId(),
		name: data.name,
		description: data.description,
		homeCity: data.homeCity,
		startDate: data.startDate,
		endDate: data.endDate,
		cities: [],
		activities: [],
		foodVenues: [],
		transportLegs: [],
		itinerary: [],
		colorScheme: getDefaultColorScheme(),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	state.trips = [...state.trips, trip];
	saveTrips();
	return trip;
}

function updateTrip(id: string, updates: Partial<Trip>): void {
	state.trips = state.trips.map((t) =>
		t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
	);
	saveTrips();
}

function deleteTrip(id: string): void {
	state.trips = state.trips.filter((t) => t.id !== id);
	if (state.currentTripId === id) {
		state.currentTripId = null;
	}
	saveTrips();
}

function importTrip(trip: Trip): Trip {
	// Generate new ID to avoid conflicts
	const importedTrip: Trip = {
		...trip,
		id: generateTripId(),
		name: trip.name + ' (Imported)',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	state.trips = [...state.trips, importedTrip];
	saveTrips();
	return importedTrip;
}

function setCurrentTrip(id: string | null): void {
	state.currentTripId = id;
}

// ============ City Management ============

function addCity(
	tripId: string,
	cityData: Omit<City, 'id' | 'stays' | 'arrivalTransportId' | 'departureTransportId'>
): City {
	const city: City = {
		...cityData,
		id: generateCityId(),
		stays: []
	};

	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;

		// Extend trip dates if city dates are outside current range
		let newStartDate = t.startDate;
		let newEndDate = t.endDate;

		if (cityData.startDate < t.startDate) {
			newStartDate = cityData.startDate;
		}
		if (cityData.endDate > t.endDate) {
			newEndDate = cityData.endDate;
		}

		const updatedTrip = {
			...t,
			startDate: newStartDate,
			endDate: newEndDate,
			cities: [...t.cities, city],
			updatedAt: new Date().toISOString()
		};
		// Regenerate itinerary with new city
		return regenerateItinerary(updatedTrip);
	});

	saveTrips();
	return city;
}

function updateCity(tripId: string, cityId: string, updates: Partial<City>): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;

		const updatedCities = t.cities.map((c) => (c.id === cityId ? { ...c, ...updates } : c));

		// Recalculate trip dates based on all cities
		let newStartDate = t.startDate;
		let newEndDate = t.endDate;

		for (const city of updatedCities) {
			if (city.startDate < newStartDate) {
				newStartDate = city.startDate;
			}
			if (city.endDate > newEndDate) {
				newEndDate = city.endDate;
			}
		}

		const updatedTrip = {
			...t,
			startDate: newStartDate,
			endDate: newEndDate,
			cities: updatedCities,
			updatedAt: new Date().toISOString()
		};
		return regenerateItinerary(updatedTrip);
	});
	saveTrips();
}

function removeCity(tripId: string, cityId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const updatedTrip = {
			...t,
			cities: t.cities.filter((c) => c.id !== cityId),
			updatedAt: new Date().toISOString()
		};
		return regenerateItinerary(updatedTrip);
	});
	saveTrips();
}

// ============ Stay Management ============

function addStay(tripId: string, cityId: string, stay: Stay): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const updatedTrip = {
			...t,
			cities: t.cities.map((c) => (c.id === cityId ? { ...c, stays: [...c.stays, stay] } : c)),
			updatedAt: new Date().toISOString()
		};
		// Update color scheme if in by-stay mode
		if (updatedTrip.colorScheme.mode === 'by-stay') {
			const allStayIds = updatedTrip.cities.flatMap((c) => c.stays.map((s) => s.id));
			const citiesWithoutStays = updatedTrip.cities
				.filter((c) => c.stays.length === 0)
				.map((c) => c.id);
			updatedTrip.colorScheme.stayColors = assignStayColorsWithInferred(allStayIds, citiesWithoutStays);
		}
		return regenerateItinerary(updatedTrip);
	});
	saveTrips();
}

function updateStay(tripId: string, cityId: string, stayId: string, updates: Partial<Stay>): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const updatedTrip = {
			...t,
			cities: t.cities.map((c) =>
				c.id === cityId
					? { ...c, stays: c.stays.map((s) => (s.id === stayId ? ({ ...s, ...updates } as Stay) : s)) }
					: c
			),
			updatedAt: new Date().toISOString()
		};
		return regenerateItinerary(updatedTrip);
	});
	saveTrips();
}

function removeStay(tripId: string, cityId: string, stayId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const updatedTrip = {
			...t,
			cities: t.cities.map((c) =>
				c.id === cityId ? { ...c, stays: c.stays.filter((s) => s.id !== stayId) } : c
			),
			updatedAt: new Date().toISOString()
		};
		return regenerateItinerary(updatedTrip);
	});
	saveTrips();
}

// ============ Activity Management ============

function addActivity(tripId: string, activity: Activity): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId
			? { ...t, activities: [...t.activities, activity], updatedAt: new Date().toISOString() }
			: t
	);
	saveTrips();
}

function updateActivity(tripId: string, activityId: string, updates: Partial<Activity>): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId
			? {
					...t,
					activities: t.activities.map((a) => (a.id === activityId ? { ...a, ...updates } : a)),
					updatedAt: new Date().toISOString()
				}
			: t
	);
	saveTrips();
}

function removeActivity(tripId: string, activityId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			activities: t.activities.filter((a) => a.id !== activityId),
			itinerary: t.itinerary.map((day) => ({
				...day,
				items: day.items.filter((item) => !(item.kind === 'activity' && item.activityId === activityId))
			})),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

// ============ Food Venue Management ============

function addFoodVenue(tripId: string, venue: FoodVenue): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId
			? { ...t, foodVenues: [...t.foodVenues, venue], updatedAt: new Date().toISOString() }
			: t
	);
	saveTrips();
}

function updateFoodVenue(tripId: string, venueId: string, updates: Partial<FoodVenue>): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId
			? {
					...t,
					foodVenues: t.foodVenues.map((v) => (v.id === venueId ? { ...v, ...updates } : v)),
					updatedAt: new Date().toISOString()
				}
			: t
	);
	saveTrips();
}

function removeFoodVenue(tripId: string, venueId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			foodVenues: t.foodVenues.filter((v) => v.id !== venueId),
			itinerary: t.itinerary.map((day) => ({
				...day,
				items: day.items.filter((item) => !(item.kind === 'food' && item.foodVenueId === venueId))
			})),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

// ============ Transport Management ============

function addTransportLeg(tripId: string, leg: TransportLeg): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId
			? { ...t, transportLegs: [...t.transportLegs, leg], updatedAt: new Date().toISOString() }
			: t
	);
	saveTrips();
}

function updateTransportLeg(tripId: string, legId: string, updates: Partial<TransportLeg>): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId
			? {
					...t,
					transportLegs: t.transportLegs.map((l) => (l.id === legId ? { ...l, ...updates } : l)),
					updatedAt: new Date().toISOString()
				}
			: t
	);
	saveTrips();
}

function removeTransportLeg(tripId: string, legId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			transportLegs: t.transportLegs.filter((l) => l.id !== legId),
			itinerary: t.itinerary.map((day) => ({
				...day,
				items: day.items.filter((item) => !(item.kind === 'transport' && item.transportLegId === legId))
			})),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

// ============ Daily Item Management ============

function addDayItem(tripId: string, dayId: string, item: NewDailyItem): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => {
				if (day.id !== dayId) return day;
				const newItem: DailyItem = {
					...item,
					id: generateItemId(),
					sortOrder: day.items.length
				} as DailyItem;
				return { ...day, items: [...day.items, newItem] };
			}),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function updateDayItem(tripId: string, dayId: string, itemId: string, updates: Partial<DailyItem>): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => {
				if (day.id !== dayId) return day;
				return {
					...day,
					items: day.items.map((item) => (item.id === itemId ? ({ ...item, ...updates } as DailyItem) : item))
				};
			}),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function removeDayItem(tripId: string, dayId: string, itemId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => {
				if (day.id !== dayId) return day;
				const filteredItems = day.items.filter((item) => item.id !== itemId);
				return {
					...day,
					items: filteredItems.map((item, idx) => ({ ...item, sortOrder: idx }))
				};
			}),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function reorderDayItems(tripId: string, dayId: string, items: DailyItem[]): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => {
				if (day.id !== dayId) return day;
				return {
					...day,
					items: items.map((item, idx) => ({ ...item, sortOrder: idx }))
				};
			}),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function updateDayTitle(tripId: string, dayId: string, title: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => (day.id === dayId ? { ...day, title } : day)),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function moveDayItem(tripId: string, fromDayId: string, toDayId: string, itemId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;

		let itemToMove: DailyItem | undefined;

		// Find and remove the item from the source day
		const updatedItinerary = t.itinerary.map((day) => {
			if (day.id === fromDayId) {
				const item = day.items.find((i) => i.id === itemId);
				if (item) {
					itemToMove = { ...item };
				}
				return {
					...day,
					items: day.items
						.filter((i) => i.id !== itemId)
						.map((item, idx) => ({ ...item, sortOrder: idx }))
				};
			}
			return day;
		});

		// Add the item to the target day
		if (itemToMove) {
			return {
				...t,
				itinerary: updatedItinerary.map((day) => {
					if (day.id === toDayId) {
						return {
							...day,
							items: [...day.items, { ...itemToMove!, sortOrder: day.items.length }]
						};
					}
					return day;
				}),
				updatedAt: new Date().toISOString()
			};
		}

		return t;
	});
	saveTrips();
}

// ============ Color Scheme ============

function updateColorScheme(tripId: string, colorScheme: ColorScheme): void {
	state.trips = state.trips.map((t) =>
		t.id === tripId ? { ...t, colorScheme, updatedAt: new Date().toISOString() } : t
	);
	saveTrips();
}

function toggleColorMode(tripId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const newMode = t.colorScheme.mode === 'by-kind' ? 'by-stay' : 'by-kind';
		const newScheme: ColorScheme = {
			...t.colorScheme,
			mode: newMode
		};
		if (newMode === 'by-stay') {
			const allStayIds = t.cities.flatMap((c) => c.stays.map((s) => s.id));
			const citiesWithoutStays = t.cities
				.filter((c) => c.stays.length === 0)
				.map((c) => c.id);
			newScheme.stayColors = assignStayColorsWithInferred(allStayIds, citiesWithoutStays);
		}
		return { ...t, colorScheme: newScheme, updatedAt: new Date().toISOString() };
	});
	saveTrips();
}

// ============ Itinerary Generation ============

function regenerateItinerary(trip: Trip): Trip {
	const dates = getDatesInRange(trip.startDate, trip.endDate);
	const existingDays = new Map(trip.itinerary.map((d) => [d.date, d]));

	const newItinerary: ItineraryDay[] = dates.map((date, index) => {
		const existing = existingDays.get(date);
		const cityIds = getCityIdsForDate(trip, date);

		if (existing) {
			return {
				...existing,
				dayNumber: index + 1,
				cityIds
			};
		}

		return {
			id: generateDayId(),
			date,
			dayNumber: index + 1,
			cityIds,
			items: []
		};
	});

	return { ...trip, itinerary: newItinerary };
}

function getCityIdsForDate(trip: Trip, date: string): string[] {
	// First, get cities based on their date range (fallback)
	const citiesFromRange: string[] = [];
	for (const city of trip.cities) {
		if (date >= city.startDate && date <= city.endDate) {
			citiesFromRange.push(city.id);
		}
	}

	// Then, get cities based on lodging (overrides range if present)
	const citiesFromLodging: string[] = [];
	for (const city of trip.cities) {
		for (const stay of city.stays) {
			// Include check-in day and all days up to (but not including) check-out
			if (date >= stay.checkIn && date < stay.checkOut) {
				if (!citiesFromLodging.includes(city.id)) {
					citiesFromLodging.push(city.id);
				}
			}
			// Also include check-out day for that city (last day at the hotel)
			if (date === stay.checkOut) {
				if (!citiesFromLodging.includes(city.id)) {
					citiesFromLodging.push(city.id);
				}
			}
		}
	}

	// If we have lodging for this date, use that; otherwise use the city date range
	if (citiesFromLodging.length > 0) {
		return citiesFromLodging;
	}

	return citiesFromRange;
}

// ============ Export Store ============

export const tripStore = {
	get state() {
		return state;
	},
	get currentTrip() {
		return currentTrip;
	},
	get sortedTrips() {
		return sortedTrips;
	},
	get tripCount() {
		return tripCount;
	},

	// Load/Save
	loadTrips,
	saveTrips,

	// Trip CRUD
	createTrip,
	updateTrip,
	deleteTrip,
	importTrip,
	setCurrentTrip,

	// City
	addCity,
	updateCity,
	removeCity,

	// Stay
	addStay,
	updateStay,
	removeStay,

	// Activity
	addActivity,
	updateActivity,
	removeActivity,

	// Food
	addFoodVenue,
	updateFoodVenue,
	removeFoodVenue,

	// Transport
	addTransportLeg,
	updateTransportLeg,
	removeTransportLeg,

	// Daily Items
	addDayItem,
	updateDayItem,
	removeDayItem,
	reorderDayItems,
	moveDayItem,
	updateDayTitle,

	// Color Scheme
	updateColorScheme,
	toggleColorMode
};
