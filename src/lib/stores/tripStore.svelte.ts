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
	KindColors,
	Location,
	EnrichedCityData
} from '$lib/types/travel';
import type { TripSettings, CustomColorScheme } from '$lib/types/settings';
import { createOverride } from '$lib/types/settings';
import { storageService, type ExportedTrip } from '$lib/services/storageService';
import { generateTripId, generateCityId, generateDayId, generateItemId } from '$lib/utils/ids';
import { 
	getDefaultColorScheme, 
	assignStayColorsWithInferred,
	computeStaySegments,
	buildStayColorsFromSegments,
	defaultKindColors,
	defaultPaletteColors
} from '$lib/utils/colors';
import { getDatesInRange, getDayNumber } from '$lib/utils/dates';
import { calculateHaversineDistance } from '$lib/services/geoService';

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
	// Generate initial itinerary days from trip dates
	const dates = getDatesInRange(data.startDate, data.endDate);
	const initialItinerary: ItineraryDay[] = dates.map((date, index) => ({
		id: generateDayId(),
		date,
		dayNumber: index + 1,
		cityIds: [],
		items: []
	}));

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
		itinerary: initialItinerary,
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

function extendTripDates(tripId: string, newEndDate: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		if (newEndDate <= t.endDate) return t;

		const updatedTrip = {
			...t,
			endDate: newEndDate,
			updatedAt: new Date().toISOString()
		};
		return regenerateItinerary(updatedTrip);
	});
	saveTrips();
}

function deleteTrip(id: string): void {
	state.trips = state.trips.filter((t) => t.id !== id);
	if (state.currentTripId === id) {
		state.currentTripId = null;
	}
	saveTrips();
}

function importTrip(exportedTrip: ExportedTrip): { trip: Trip; embeddedColorScheme?: CustomColorScheme } {
	// Extract embedded color scheme before importing
	const { embeddedColorScheme, ...tripData } = exportedTrip;
	
	// Generate new ID to avoid conflicts
	const importedTrip: Trip = {
		...tripData,
		id: generateTripId(),
		name: tripData.name + ' (Imported)',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
	
	// If there's an embedded color scheme, generate a new ID for it
	// to avoid conflicts with existing schemes
	let schemeToAdd: CustomColorScheme | undefined;
	if (embeddedColorScheme) {
		const newSchemeId = generateTripId(); // Use same ID generator for uniqueness
		schemeToAdd = {
			...embeddedColorScheme,
			id: newSchemeId,
			name: embeddedColorScheme.name + ' (Imported)'
		};
		// Update the trip's colorScheme to reference the new scheme ID
		importedTrip.colorScheme = {
			...importedTrip.colorScheme,
			customSchemeId: newSchemeId
		};
	}

	state.trips = [...state.trips, importedTrip];
	saveTrips();
	return { trip: importedTrip, embeddedColorScheme: schemeToAdd };
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
		// Regenerate itinerary first to get proper day assignments
		const tripWithItinerary = regenerateItinerary(updatedTrip);
		// Update color scheme if in by-stay mode
		if (tripWithItinerary.colorScheme.mode === 'by-stay') {
			const segments = computeStaySegments(tripWithItinerary);
			tripWithItinerary.colorScheme.stayColors = buildStayColorsFromSegments(segments);
		}
		return tripWithItinerary;
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

// ============ City Inference from Stays ============

/**
 * Infer city data from a stay's geocoded location.
 * Used when adding a stay without an existing city.
 */
function inferCityFromStay(stay: Stay): Omit<City, 'id' | 'stays' | 'arrivalTransportId' | 'departureTransportId'> {
	const addr = stay.location.address;
	return {
		name: addr.city || addr.state || 'Unknown',
		country: addr.country || 'Unknown',
		location: stay.location.geo,
		timezone: stay.location.timezone || 'UTC',
		startDate: stay.checkIn,
		endDate: stay.checkOut
	};
}

/**
 * Find an existing city in the trip that matches the stay's location.
 * Matches by exact city name + country, or by proximity (within 25km).
 */
function findMatchingCity(trip: Trip, stay: Stay): City | null {
	const stayCity = stay.location.address.city?.toLowerCase().trim();
	const stayCountry = stay.location.address.country?.toLowerCase().trim();

	for (const city of trip.cities) {
		// Exact name + country match
		if (
			stayCity &&
			stayCountry &&
			city.name.toLowerCase() === stayCity &&
			city.country.toLowerCase() === stayCountry
		) {
			return city;
		}
		// Proximity match (~25km) for suburbs/neighborhoods
		const distance = calculateHaversineDistance(stay.location.geo, city.location);
		if (distance < 25) {
			return city;
		}
	}
	return null;
}

/**
 * Add a stay to a trip, automatically inferring or matching the city.
 * This is the main entry point for the stay-first workflow.
 *
 * If a matching city exists (by name or proximity), the stay is added to it.
 * Otherwise, a new city is created from the stay's location data.
 *
 * @param tripId - The trip to add the stay to
 * @param stay - The stay to add
 * @param enrichedCityData - Optional pre-enriched city data from Geoapify (for proper country names, etc.)
 * @returns The cityId and whether a new city was created.
 */
function addStayWithCityInference(
	tripId: string,
	stay: Stay,
	enrichedCityData?: EnrichedCityData
): { cityId: string; isNewCity: boolean } {
	const trip = state.trips.find((t) => t.id === tripId);
	if (!trip) throw new Error('Trip not found');

	const existingCity = findMatchingCity(trip, stay);

	if (existingCity) {
		// Add stay to existing city
		addStay(tripId, existingCity.id, stay);

		// Extend city dates if the stay goes beyond current range
		const needsDateUpdate =
			stay.checkIn < existingCity.startDate || stay.checkOut > existingCity.endDate;
		if (needsDateUpdate) {
			const newStartDate =
				stay.checkIn < existingCity.startDate ? stay.checkIn : existingCity.startDate;
			const newEndDate =
				stay.checkOut > existingCity.endDate ? stay.checkOut : existingCity.endDate;
			updateCity(tripId, existingCity.id, { startDate: newStartDate, endDate: newEndDate });
		}

		return { cityId: existingCity.id, isNewCity: false };
	} else {
		// Create new city - use enriched data if available, otherwise infer from stay
		let cityData: Omit<City, 'id' | 'stays' | 'arrivalTransportId' | 'departureTransportId'>;
		
		if (enrichedCityData) {
			// Use enriched data with stay dates
			cityData = {
				...enrichedCityData,
				startDate: stay.checkIn,
				endDate: stay.checkOut
			};
		} else {
			// Fall back to inferring from stay's location
			cityData = inferCityFromStay(stay);
		}
		
		const newCity = addCity(tripId, cityData);
		addStay(tripId, newCity.id, stay);
		return { cityId: newCity.id, isNewCity: true };
	}
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

function insertDayItemAt(tripId: string, dayId: string, item: NewDailyItem, position: number): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => {
				if (day.id !== dayId) return day;
				const newItem: DailyItem = {
					...item,
					id: generateItemId(),
					sortOrder: position
				} as DailyItem;
				const newItems = [...day.items];
				// Clamp position to valid range
				const insertPos = Math.max(0, Math.min(position, newItems.length));
				newItems.splice(insertPos, 0, newItem);
				// Re-number sortOrder
				return { ...day, items: newItems.map((it, idx) => ({ ...it, sortOrder: idx })) };
			}),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function duplicateDayItem(tripId: string, dayId: string, itemId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => {
				if (day.id !== dayId) return day;
				const itemToDuplicate = day.items.find((i) => i.id === itemId);
				if (!itemToDuplicate) return day;
				
				const itemIndex = day.items.findIndex((i) => i.id === itemId);
				const duplicatedItem: DailyItem = {
					...itemToDuplicate,
					id: generateItemId(),
					sortOrder: itemIndex + 1
				};
				
				const newItems = [...day.items];
				newItems.splice(itemIndex + 1, 0, duplicatedItem);
				// Re-number sortOrder
				return { ...day, items: newItems.map((it, idx) => ({ ...it, sortOrder: idx })) };
			}),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function removeAllStayItems(tripId: string, stayId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			itinerary: t.itinerary.map((day) => ({
				...day,
				items: day.items
					.filter((item) => !(item.kind === 'stay' && item.stayId === stayId))
					.map((it, idx) => ({ ...it, sortOrder: idx }))
			})),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function removeAllTransportItems(tripId: string, transportLegId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			transportLegs: t.transportLegs.filter((l) => l.id !== transportLegId),
			itinerary: t.itinerary.map((day) => ({
				...day,
				items: day.items
					.filter((item) => !(item.kind === 'transport' && item.transportLegId === transportLegId))
					.map((it, idx) => ({ ...it, sortOrder: idx }))
			})),
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function addTransportWithDailyItems(tripId: string, leg: TransportLeg): void {
	// First add the transport leg
	addTransportLeg(tripId, leg);

	// Get the updated trip
	const trip = state.trips.find((t) => t.id === tripId);
	if (!trip) return;

	const departureDay = trip.itinerary.find((d) => d.date === leg.departureDate);
	const arrivalDate = leg.arrivalDate || leg.departureDate;
	const arrivalDay = trip.itinerary.find((d) => d.date === arrivalDate);

	// Add departure item at end of departure day
	if (departureDay) {
		addDayItem(tripId, departureDay.id, {
			kind: 'transport',
			transportLegId: leg.id,
			isDeparture: true
		});
	}

	// Add arrival item at beginning of arrival day (if different from departure)
	if (arrivalDay && arrivalDay.id !== departureDay?.id) {
		insertDayItemAt(tripId, arrivalDay.id, {
			kind: 'transport',
			transportLegId: leg.id,
			isArrival: true
		}, 0);
	} else if (arrivalDay && arrivalDay.id === departureDay?.id) {
		// Same day - add arrival after departure
		addDayItem(tripId, arrivalDay.id, {
			kind: 'transport',
			transportLegId: leg.id,
			isArrival: true
		});
	}
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
			// Compute stay segments and build color map
			const segments = computeStaySegments(t);
			newScheme.stayColors = buildStayColorsFromSegments(segments);
		}
		return { ...t, colorScheme: newScheme, updatedAt: new Date().toISOString() };
	});
	saveTrips();
}

function setTripColorMode(tripId: string, mode: 'by-kind' | 'by-stay'): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const newScheme: ColorScheme = {
			...t.colorScheme,
			mode
		};
		if (mode === 'by-stay') {
			// Compute stay segments and build color map
			const segments = computeStaySegments(t);
			newScheme.stayColors = buildStayColorsFromSegments(segments);
		}
		return {
			...t,
			colorScheme: newScheme,
			settings: { ...t.settings, colorModeOverridden: true },
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function clearTripColorMode(tripId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const newSettings = { ...t.settings };
		delete newSettings.colorModeOverridden;
		return {
			...t,
			settings: newSettings,
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function setTripColorScheme(tripId: string, scheme: { id: string; name: string; kindColors: KindColors; paletteColors: string[] }): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const newScheme: ColorScheme = {
			...t.colorScheme,
			kindColors: { ...scheme.kindColors },
			paletteColors: [...scheme.paletteColors],
			customSchemeId: scheme.id
		};
		// Recompute stay colors with new palette
		if (t.colorScheme.mode === 'by-stay') {
			const segments = computeStaySegments({ ...t, colorScheme: newScheme });
			newScheme.stayColors = buildStayColorsFromSegments(segments);
		}
		return {
			...t,
			colorScheme: newScheme,
			settings: { ...t.settings, colorSchemeOverridden: true },
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function clearTripColorScheme(tripId: string): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const newScheme: ColorScheme = {
			...t.colorScheme,
			kindColors: { ...defaultKindColors },
			paletteColors: [...defaultPaletteColors]
		};
		delete newScheme.customSchemeId;
		// Recompute stay colors with default palette
		if (t.colorScheme.mode === 'by-stay') {
			const segments = computeStaySegments({ ...t, colorScheme: newScheme });
			newScheme.stayColors = buildStayColorsFromSegments(segments);
		}
		const newSettings = { ...t.settings };
		delete newSettings.colorSchemeOverridden;
		return {
			...t,
			colorScheme: newScheme,
			settings: newSettings,
			updatedAt: new Date().toISOString()
		};
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

// ============ Trip Settings ============

function updateTripSettings(tripId: string, settings: Partial<TripSettings>): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		return {
			...t,
			settings: { ...t.settings, ...settings },
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
}

function setTripSettingOverride<K extends keyof TripSettings>(
	tripId: string,
	key: K,
	value: NonNullable<TripSettings[K]> extends { value: infer T } ? T : TripSettings[K]
): void {
	// For boolean flags like colorModeOverridden, set directly
	if (key === 'colorModeOverridden') {
		updateTripSettings(tripId, { [key]: value } as Partial<TripSettings>);
	} else {
		// For MaybeOverridden fields, wrap in createOverride
		updateTripSettings(tripId, {
			[key]: createOverride(value)
		} as Partial<TripSettings>);
	}
}

function clearTripSettingOverride(tripId: string, key: keyof TripSettings): void {
	state.trips = state.trips.map((t) => {
		if (t.id !== tripId) return t;
		const newSettings = { ...t.settings };
		delete newSettings[key];
		return {
			...t,
			settings: newSettings,
			updatedAt: new Date().toISOString()
		};
	});
	saveTrips();
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
	extendTripDates,

	// City
	addCity,
	updateCity,
	removeCity,

	// Stay
	addStay,
	addStayWithCityInference,
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
	removeAllTransportItems,
	addTransportWithDailyItems,

	// Daily Items
	addDayItem,
	insertDayItemAt,
	duplicateDayItem,
	removeAllStayItems,
	updateDayItem,
	removeDayItem,
	reorderDayItems,
	moveDayItem,
	updateDayTitle,

	// Color Scheme
	updateColorScheme,
	toggleColorMode,
	setTripColorMode,
	clearTripColorMode,
	setTripColorScheme,
	clearTripColorScheme,

	// Trip Settings
	updateTripSettings,
	setTripSettingOverride,
	clearTripSettingOverride
};
