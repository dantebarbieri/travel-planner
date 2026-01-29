<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { tripStore } from '$lib/stores/tripStore.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { fakeWeatherAdapter } from '$lib/adapters/weather/fakeAdapter';
	import { formatDate, daysBetween, getDatesInRange } from '$lib/utils/dates';
	import { resolveAllDayUnits, type DayUnitResolution } from '$lib/utils/units';
	import type { WeatherCondition, City, DailyItem, ItineraryDay, Activity, FoodVenue, Stay, TravelMode, StayDailyItem, StaySegment, TransportLeg } from '$lib/types/travel';
	import { isStayItem } from '$lib/types/travel';
	import { fakeCityAdapter, type CitySearchResult } from '$lib/adapters/cities/fakeAdapter';
	import { computeStaySegments, dayHasMissingLodging, defaultKindColors, defaultPaletteColors } from '$lib/utils/colors';
	import type { ColorScheme } from '$lib/types/travel';
	import ItineraryDayComponent from '$lib/components/itinerary/ItineraryDay.svelte';
	import AddItemModal from '$lib/components/modals/AddItemModal.svelte';
	import MoveItemModal from '$lib/components/modals/MoveItemModal.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { storageService } from '$lib/services/storageService';
	import { documentService } from '$lib/services/documentService';
	import TripSettingsModal from '$lib/components/settings/TripSettingsModal.svelte';
	import { onMount } from 'svelte';

	const tripId = $derived($page.params.id);
	const trip = $derived(tripStore.state.trips.find((t) => t.id === tripId));

	// Weather data keyed by date, with array of conditions (one per city for that day)
	let weatherData = $state<Record<string, WeatherCondition[]>>({});
	let isEditing = $state(false);
	let showAddCityModal = $state(false);
	let citySearchValue = $state('');
	let selectedCity = $state<CitySearchResult | null>(null);
	let newCityStartDate = $state('');
	let newCityEndDate = $state('');
	let showExportModal = $state(false);
	let isExporting = $state(false);
	let showEditCityModal = $state(false);
	let editingCity = $state<City | null>(null);
	let editCityStartDate = $state('');
	let editCityEndDate = $state('');
	let showAddItemModal = $state(false);
	let addItemDayId = $state<string | null>(null);
	let addItemKind = $state<'activity' | 'food' | 'stay' | 'transport'>('activity');
	let showMoveItemModal = $state(false);
	let moveItemId = $state<string | null>(null);
	let moveItemFromDayId = $state<string | null>(null);
	let showTripSettingsModal = $state(false);

	onMount(async () => {
		if (trip) {
			tripStore.setCurrentTrip(trip.id);
			await loadWeather();
		}
	});

	async function loadWeather() {
		if (!trip) return;

		for (const day of trip.itinerary) {
			await loadWeatherForDay(day);
		}
	}

	async function loadWeatherForDay(day: ItineraryDay) {
		if (!trip) return;

		// Get all cities for this day
		const dayCities = trip.cities.filter((c) => day.cityIds.includes(c.id));
		if (dayCities.length === 0) {
			weatherData[day.date] = [];
			return;
		}

		const conditions: WeatherCondition[] = [];
		for (const city of dayCities) {
			const location = {
				name: city.name,
				address: {
					street: '',
					city: city.name,
					country: city.country,
					formatted: `${city.name}, ${city.country}`
				},
				geo: city.location
			};
			try {
				// Use smart weather fetch (forecast vs historical based on date)
				const forecasts = await fakeWeatherAdapter.getWeather(location, [day.date]);
				if (forecasts[0]) {
					conditions.push(forecasts[0]);
				}
			} catch {
				// Ignore weather errors for this city
			}
		}
		weatherData[day.date] = conditions;
	}

	// Reload weather when itinerary changes (cities assigned to days change)
	let previousCityIds = $state<Record<string, string[]>>({});

	$effect(() => {
		if (!trip) return;

		// Check each day to see if its cities changed
		for (const day of trip.itinerary) {
			const currentIds = day.cityIds.join(',');
			const previousIds = previousCityIds[day.date]?.join(',') || '';

			if (currentIds !== previousIds) {
				// Cities changed for this day - reload weather
				loadWeatherForDay(day);
				previousCityIds[day.date] = [...day.cityIds];
			}
		}
	});

	function toggleEditing() {
		isEditing = !isEditing;
	}

	function openExportModal() {
		showExportModal = true;
	}

	async function exportAs(format: 'json' | 'pdf' | 'docx' | 'print') {
		if (!trip) return;
		isExporting = true;
		try {
			switch (format) {
				case 'json':
					// Pass custom schemes so the trip's scheme can be embedded
					storageService.downloadJson(trip, settingsStore.userSettings.customColorSchemes);
					break;
				case 'pdf':
					await documentService.exportToPDF(trip);
					break;
				case 'docx':
					await documentService.exportToDOCX(trip);
					break;
				case 'print':
					documentService.openPrintView(trip);
					break;
			}
			showExportModal = false;
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			isExporting = false;
		}
	}

	function toggleColorMode() {
		if (trip) {
			tripStore.toggleColorMode(trip.id);
		}
	}

	// Find unassigned date ranges in the trip
	function getUnassignedDateRanges(): Array<{ start: string; end: string }> {
		if (!trip) return [];

		const tripDates = getDatesInRange(trip.startDate, trip.endDate);
		const assignedDates = new Set<string>();

		// Collect all dates covered by existing cities
		for (const city of trip.cities) {
			const cityDates = getDatesInRange(city.startDate, city.endDate);
			cityDates.forEach((d) => assignedDates.add(d));
		}

		// Find contiguous unassigned ranges
		const ranges: Array<{ start: string; end: string }> = [];
		let currentRange: { start: string; end: string } | null = null;

		for (const date of tripDates) {
			if (!assignedDates.has(date)) {
				if (!currentRange) {
					currentRange = { start: date, end: date };
				} else {
					currentRange.end = date;
				}
			} else {
				if (currentRange) {
					ranges.push(currentRange);
					currentRange = null;
				}
			}
		}

		if (currentRange) {
			ranges.push(currentRange);
		}

		return ranges;
	}

	function openAddCityModal() {
		citySearchValue = '';
		selectedCity = null;

		// Smart defaults: find first unassigned gap
		const unassignedRanges = getUnassignedDateRanges();
		if (unassignedRanges.length > 0) {
			newCityStartDate = unassignedRanges[0].start;
			newCityEndDate = unassignedRanges[0].end;
		} else {
			// No gaps - default to trip dates (user will need to adjust or overlap is expected)
			newCityStartDate = trip?.startDate || '';
			newCityEndDate = trip?.endDate || '';
		}

		showAddCityModal = true;
	}

	function addCity() {
		if (!trip || !selectedCity || !newCityStartDate || !newCityEndDate) return;

		tripStore.addCity(trip.id, {
			name: selectedCity.name,
			country: selectedCity.country,
			location: selectedCity.location,
			timezone: selectedCity.timezone,
			startDate: newCityStartDate,
			endDate: newCityEndDate
		});

		showAddCityModal = false;
		citySearchValue = '';
		selectedCity = null;
	}

	// Check for date conflicts with existing cities (excluding allowed 1-day transitions)
	const dateConflict = $derived.by(() => {
		if (!trip || !newCityStartDate || !newCityEndDate) return null;

		const newStart = new Date(newCityStartDate);
		const newEnd = new Date(newCityEndDate);

		for (const city of trip.cities) {
			const cityStart = new Date(city.startDate);
			const cityEnd = new Date(city.endDate);

			// Check if ranges overlap
			if (newStart <= cityEnd && newEnd >= cityStart) {
				// Allow 1-day transition overlap (new city starts on old city's last day, or vice versa)
				const isTransitionOverlap =
					(newStart.getTime() === cityEnd.getTime() && newEnd > cityEnd) ||
					(newEnd.getTime() === cityStart.getTime() && newStart < cityStart);

				if (!isTransitionOverlap) {
					return {
						cityName: city.name,
						start: city.startDate,
						end: city.endDate
					};
				}
			}
		}

		return null;
	});

	function handleAddItem(day: ItineraryDay) {
		addItemDayId = day.id;
		addItemKind = 'activity';
		showAddItemModal = true;
	}

	function openEditCityModal(city: City) {
		editingCity = city;
		editCityStartDate = city.startDate;
		editCityEndDate = city.endDate;
		showEditCityModal = true;
	}

	function saveCityDates() {
		if (!trip || !editingCity || !editCityStartDate || !editCityEndDate) return;
		tripStore.updateCity(trip.id, editingCity.id, {
			startDate: editCityStartDate,
			endDate: editCityEndDate
		});
		showEditCityModal = false;
		editingCity = null;
	}

	function deleteCity(cityId: string) {
		if (!trip) return;
		if (confirm('Are you sure you want to remove this city?')) {
			tripStore.removeCity(trip.id, cityId);
		}
	}

	function handleAddActivityToDay(activity: Activity) {
		if (!trip || !addItemDayId) return;

		// Add the activity to the trip
		tripStore.addActivity(trip.id, activity);

		// Find the day and check if it has stay bookends (intermediate day)
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		if (day && day.items.length >= 2) {
			const firstItem = day.items[0];
			const lastItem = day.items[day.items.length - 1];
			
			// Check if both first and last items are stays without check-in/check-out flags
			const hasStayBookends = 
				isStayItem(firstItem) && isStayItem(lastItem) &&
				!firstItem.isCheckIn && !firstItem.isCheckOut &&
				!lastItem.isCheckIn && !lastItem.isCheckOut;

			if (hasStayBookends) {
				// Insert before the last item (the end-of-day stay bookend)
				tripStore.insertDayItemAt(trip.id, addItemDayId, {
					kind: 'activity',
					activityId: activity.id
				}, day.items.length - 1);
				return;
			}
		}

		// Default: add at end
		tripStore.addDayItem(trip.id, addItemDayId, {
			kind: 'activity',
			activityId: activity.id
		});
	}

	function handleAddFoodVenueToDay(venue: FoodVenue) {
		if (!trip || !addItemDayId) return;

		// Add the food venue to the trip
		tripStore.addFoodVenue(trip.id, venue);

		// Find the day and check if it has stay bookends (intermediate day)
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		if (day && day.items.length >= 2) {
			const firstItem = day.items[0];
			const lastItem = day.items[day.items.length - 1];
			
			// Check if both first and last items are stays without check-in/check-out flags
			const hasStayBookends = 
				isStayItem(firstItem) && isStayItem(lastItem) &&
				!firstItem.isCheckIn && !firstItem.isCheckOut &&
				!lastItem.isCheckIn && !lastItem.isCheckOut;

			if (hasStayBookends) {
				// Insert before the last item (the end-of-day stay bookend)
				tripStore.insertDayItemAt(trip.id, addItemDayId, {
					kind: 'food',
					foodVenueId: venue.id,
					mealSlot: venue.mealType
				}, day.items.length - 1);
				return;
			}
		}

		// Default: add at end
		tripStore.addDayItem(trip.id, addItemDayId, {
			kind: 'food',
			foodVenueId: venue.id,
			mealSlot: venue.mealType
		});
	}

	function handleAddStayToDay(stay: Stay) {
		if (!trip || !addItemDayId) return;

		// Find the city for this day to add the stay to
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		if (!day || day.cityIds.length === 0) return;

		const cityId = day.cityIds[0];

		// Check if stay extends beyond trip end date
		if (stay.checkOut > trip.endDate) {
			const confirmed = confirm(
				`This stay's check-out date (${formatDate(stay.checkOut)}) extends beyond the trip end date (${formatDate(trip.endDate)}). Would you like to extend the trip to accommodate this stay?`
			);
			if (!confirmed) return;
			// Extend the trip dates
			tripStore.extendTripDates(trip.id, stay.checkOut);
		}

		// Check for conflicts with existing stays (overlapping dates aside from check-in/check-out transitions)
		const allStays = trip.cities.flatMap((c) => c.stays);
		const conflictingStays = allStays.filter((existingStay) => {
			// Stays overlap if they share any night (check-in to day before check-out)
			// Allow check-in on another stay's check-out day (transition day)
			const newStayFirstNight = stay.checkIn;
			const newStayLastNight = getDatesInRange(stay.checkIn, stay.checkOut).slice(0, -1).pop() || stay.checkIn;
			const existingFirstNight = existingStay.checkIn;
			const existingLastNight = getDatesInRange(existingStay.checkIn, existingStay.checkOut).slice(0, -1).pop() || existingStay.checkIn;

			// Check if the night ranges overlap
			return newStayFirstNight <= existingLastNight && newStayLastNight >= existingFirstNight;
		});

		if (conflictingStays.length > 0) {
			const conflictNames = conflictingStays.map((s) => s.name).join(', ');
			const confirmed = confirm(
				`This stay overlaps with existing stay(s): ${conflictNames}. Are you sure you want to add it anyway?`
			);
			if (!confirmed) return;
		}

		// Add the stay to the city
		tripStore.addStay(trip.id, cityId, stay);

		// Get all dates for this stay
		const stayDates = getDatesInRange(stay.checkIn, stay.checkOut);

		// Need to re-fetch trip after extending dates (itinerary may have changed)
		const updatedTrip = tripStore.state.trips.find((t) => t.id === trip.id);
		if (!updatedTrip) return;

		// Add stay items to each day
		for (const date of stayDates) {
			const dayForDate = updatedTrip.itinerary.find((d) => d.date === date);
			if (!dayForDate) continue;

			const isCheckInDay = date === stay.checkIn;
			const isCheckOutDay = date === stay.checkOut;

			if (isCheckInDay) {
				// Check-in day: add at end of day
				tripStore.addDayItem(trip.id, dayForDate.id, {
					kind: 'stay',
					stayId: stay.id,
					isCheckIn: true
				});
			} else if (isCheckOutDay) {
				// Check-out day: add at beginning of day
				// We need to insert at position 0, so we'll add and then reorder
				tripStore.addDayItem(trip.id, dayForDate.id, {
					kind: 'stay',
					stayId: stay.id,
					isCheckOut: true
				});
				// Move the checkout item to the beginning
				const currentDay = tripStore.state.trips.find((t) => t.id === trip.id)?.itinerary.find((d) => d.id === dayForDate.id);
				if (currentDay && currentDay.items.length > 1) {
					const checkoutItem = currentDay.items[currentDay.items.length - 1];
					const reorderedItems = [checkoutItem, ...currentDay.items.slice(0, -1)];
					tripStore.reorderDayItems(trip.id, dayForDate.id, reorderedItems);
				}
			} else {
				// Intermediate day: add at beginning and end for route timing calculations
				// Add at beginning
				tripStore.addDayItem(trip.id, dayForDate.id, {
					kind: 'stay',
					stayId: stay.id
				});
				// Move to beginning
				let currentDay = tripStore.state.trips.find((t) => t.id === trip.id)?.itinerary.find((d) => d.id === dayForDate.id);
				if (currentDay && currentDay.items.length > 1) {
					const stayItem = currentDay.items[currentDay.items.length - 1];
					const reorderedItems = [stayItem, ...currentDay.items.slice(0, -1)];
					tripStore.reorderDayItems(trip.id, dayForDate.id, reorderedItems);
				}

				// Add at end
				tripStore.addDayItem(trip.id, dayForDate.id, {
					kind: 'stay',
					stayId: stay.id
				});
			}
		}
	}

	// Get the city location for the current add item day
	const addItemCityLocation = $derived.by(() => {
		if (!trip || !addItemDayId) return undefined;
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		if (!day || day.cityIds.length === 0) return undefined;
		const city = trip.cities.find((c) => c.id === day.cityIds[0]);
		return city?.location;
	});

	// Get the selected day's date for default check-in
	const addItemSelectedDate = $derived.by(() => {
		if (!trip || !addItemDayId) return undefined;
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		return day?.date;
	});

	// Get the default check-out date: end of city, or end of span without city, or end of trip
	const addItemDefaultCheckOutDate = $derived.by(() => {
		if (!trip || !addItemDayId) return undefined;
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		if (!day) return undefined;

		// If day has a city, use the city's end date
		if (day.cityIds.length > 0) {
			const city = trip.cities.find((c) => c.id === day.cityIds[0]);
			if (city) {
				return city.endDate;
			}
		}

		// Day has no city - find the end of the span without a city
		// Look forward through days until we find one with a city or reach end of trip
		const dayIndex = trip.itinerary.findIndex((d) => d.id === addItemDayId);
		if (dayIndex === -1) return trip.endDate;

		for (let i = dayIndex + 1; i < trip.itinerary.length; i++) {
			const futureDay = trip.itinerary[i];
			if (futureDay.cityIds.length > 0) {
				// Found a day with a city - return the day before it
				return trip.itinerary[i - 1].date;
			}
		}

		// No city found until end of trip - use trip end date
		return trip.endDate;
	});

	function handleReorder(dayId: string, items: DailyItem[]) {
		if (trip) {
			tripStore.reorderDayItems(trip.id, dayId, items);
		}
	}

	function handleRemoveItem(dayId: string, itemId: string) {
		if (trip) {
			tripStore.removeDayItem(trip.id, dayId, itemId);
		}
	}

	function handleRemoveEntireStay(stayId: string) {
		if (trip) {
			tripStore.removeAllStayItems(trip.id, stayId);
		}
	}

	function handleRemoveEntireTransport(transportLegId: string) {
		if (trip) {
			tripStore.removeAllTransportItems(trip.id, transportLegId);
		}
	}

	function handleAddTransportToDay(leg: TransportLeg) {
		if (!trip) return;

		// Check if arrival date extends beyond trip
		const arrivalDate = leg.arrivalDate || leg.departureDate;
		if (arrivalDate > trip.endDate) {
			const confirmed = confirm(
				`This transport's arrival date (${formatDate(arrivalDate)}) extends beyond the trip end date. Extend trip?`
			);
			if (!confirmed) return;
			// Extend trip dates if needed (this will regenerate itinerary)
			tripStore.updateTrip(trip.id, { endDate: arrivalDate });
		}

		// Check if departure date is before trip start
		if (leg.departureDate < trip.startDate) {
			const confirmed = confirm(
				`This transport's departure date (${formatDate(leg.departureDate)}) is before the trip start date. Extend trip?`
			);
			if (!confirmed) return;
			tripStore.updateTrip(trip.id, { startDate: leg.departureDate });
		}

		// Add transport with departure/arrival daily items
		tripStore.addTransportWithDailyItems(trip.id, leg);
	}

	function handleDuplicateItem(dayId: string, itemId: string) {
		if (trip) {
			tripStore.duplicateDayItem(trip.id, dayId, itemId);
		}
	}

	function handleMoveItem(dayId: string, itemId: string) {
		moveItemFromDayId = dayId;
		moveItemId = itemId;
		showMoveItemModal = true;
	}

	function handleMoveItemConfirm(toDayId: string) {
		if (trip && moveItemFromDayId && moveItemId) {
			tripStore.moveDayItem(trip.id, moveItemFromDayId, toDayId, moveItemId);
		}
		showMoveItemModal = false;
		moveItemId = null;
		moveItemFromDayId = null;
	}

	function handleTravelModeChange(dayId: string, itemId: string, mode: TravelMode) {
		if (trip) {
			tripStore.updateDayItem(trip.id, dayId, itemId, { travelMode: mode });
		}
	}

	const duration = $derived(trip ? daysBetween(trip.startDate, trip.endDate) + 1 : 0);
	const allStays = $derived(trip?.cities.flatMap((c) => c.stays) || []);

	// Resolve color scheme: if a custom scheme is selected, use its colors
	// This ensures that if the scheme is edited, the trip reflects those changes
	const resolvedColorScheme = $derived.by<ColorScheme>(() => {
		if (!trip) return { mode: 'by-kind', kindColors: defaultKindColors, paletteColors: defaultPaletteColors };
		
		const schemeId = trip.colorScheme.customSchemeId;
		if (schemeId) {
			const customScheme = settingsStore.userSettings.customColorSchemes.find(s => s.id === schemeId);
			if (customScheme) {
				return {
					...trip.colorScheme,
					kindColors: customScheme.kindColors,
					paletteColors: customScheme.paletteColors
				};
			}
		}
		return trip.colorScheme;
	});

	// Compute stay segments for by-stay coloring (using resolved scheme)
	const staySegments = $derived<StaySegment[]>(trip ? computeStaySegments({ ...trip, colorScheme: resolvedColorScheme }) : []);

	// Resolve trip settings (includes trip-specific overrides)
	const resolvedSettings = $derived(trip ? settingsStore.resolveSettingsForTrip(trip) : null);

	// Compute per-day unit resolutions based on each day's country
	const dayUnitResolutions = $derived<Map<string, DayUnitResolution>>(
		trip && resolvedSettings
			? resolveAllDayUnits(
					trip,
					resolvedSettings.temperatureUnit,
					resolvedSettings.distanceUnit
				)
			: new Map()
	);

	// Helper function to get unit resolution for a specific day
	function getDayUnitResolution(dayId: string): DayUnitResolution | undefined {
		return dayUnitResolutions.get(dayId);
	}
	
	// Check which days have missing lodging (city assigned but no stay)
	function checkDayMissingLodging(day: ItineraryDay): boolean {
		if (!trip) return false;
		return dayHasMissingLodging(trip, day);
	}
</script>

{#if !trip}
	<div class="not-found">
		<h1>Trip not found</h1>
		<p>The trip you're looking for doesn't exist.</p>
		<Button onclick={() => goto('/')}>Go Home</Button>
	</div>
{:else}
	<div class="trip-page">
		<header class="trip-header">
			<div class="trip-info">
				<a href="/" class="back-link">
					<Icon name="chevronLeft" size={20} />
					Back to trips
				</a>
				<h1>{trip.name}</h1>
				<div class="trip-meta">
					<span class="trip-dates">
						<Icon name="calendar" size={16} />
						{formatDate(trip.startDate)} - {formatDate(trip.endDate)}
					</span>
					<Badge>{duration} days</Badge>
					{#if trip.cities.length > 0}
						<span class="trip-cities">
							{trip.cities.map((c) => c.name).join(' → ')}
						</span>
					{/if}
				</div>
			</div>
			<div class="trip-actions">
				<Button variant="ghost" size="sm" onclick={toggleColorMode} title="Toggle color mode">
					Color: {trip.colorScheme.mode === 'by-kind' ? 'By Type' : 'By Stay'}
				</Button>
				<Button variant="ghost" size="sm" onclick={() => (showTripSettingsModal = true)} title="Trip settings">
					<Icon name="settings" size={16} />
				</Button>
				<Button variant="ghost" size="sm" onclick={openExportModal}>
					<Icon name="export" size={16} />
					Export
				</Button>
				<Button variant={isEditing ? 'primary' : 'secondary'} size="sm" onclick={toggleEditing}>
					<Icon name={isEditing ? 'check' : 'edit'} size={16} />
					{isEditing ? 'Done' : 'Edit'}
				</Button>
			</div>
		</header>

		{#if trip.cities.length === 0}
			<div class="empty-cities">
				<Icon name="location" size={48} />
				<h2>No destinations yet</h2>
				<p>Add your first city to start planning your itinerary</p>
				<Button onclick={openAddCityModal}>
					<Icon name="add" size={18} />
					Add City
				</Button>
			</div>
		{:else}
			{#if isEditing}
				<div class="cities-manager">
					<h3>Destinations</h3>
					<div class="cities-list">
						{#each trip.cities as city (city.id)}
							<div class="city-item">
								<div class="city-info">
									<span class="city-name">{city.name}, {city.country}</span>
									<span class="city-dates">{formatDate(city.startDate, { month: 'short', day: 'numeric' })} - {formatDate(city.endDate, { month: 'short', day: 'numeric' })}</span>
								</div>
								<div class="city-actions">
									<button type="button" class="icon-btn" onclick={() => openEditCityModal(city)} title="Edit dates">
										<Icon name="edit" size={14} />
									</button>
									<button type="button" class="icon-btn danger" onclick={() => deleteCity(city.id)} title="Remove city">
										<Icon name="delete" size={14} />
									</button>
								</div>
							</div>
						{/each}
					</div>
					<Button variant="secondary" size="sm" onclick={openAddCityModal}>
						<Icon name="add" size={16} />
						Add City
					</Button>
				</div>
			{/if}

			<div class="itinerary-container" style="--color-kind-stay: {resolvedColorScheme.kindColors.stay}; --color-kind-activity: {resolvedColorScheme.kindColors.activity}; --color-kind-food: {resolvedColorScheme.kindColors.food}; --color-kind-transport: {resolvedColorScheme.kindColors.transport}; --color-kind-flight: {resolvedColorScheme.kindColors.flight}">
				{#each trip.itinerary as day (day.id)}
					<ItineraryDayComponent
						{day}
						cities={trip.cities}
						stays={allStays}
						activities={trip.activities}
						foodVenues={trip.foodVenues}
						transportLegs={trip.transportLegs}
						colorScheme={resolvedColorScheme}
						{staySegments}
						hasMissingLodging={checkDayMissingLodging(day)}
						weatherList={weatherData[day.date] || []}
						{isEditing}
						unitResolution={getDayUnitResolution(day.id)}
						onAddItem={() => handleAddItem(day)}
						onReorder={(items) => handleReorder(day.id, items)}
						onRemoveItem={(itemId) => handleRemoveItem(day.id, itemId)}
						onRemoveEntireStay={handleRemoveEntireStay}
						onRemoveEntireTransport={handleRemoveEntireTransport}
						onMoveItem={(itemId) => handleMoveItem(day.id, itemId)}
						onDuplicateItem={(itemId) => handleDuplicateItem(day.id, itemId)}
						onTravelModeChange={(itemId, mode) => handleTravelModeChange(day.id, itemId, mode)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<Modal isOpen={showAddCityModal} title="Add City" onclose={() => (showAddCityModal = false)}>
		<form class="city-form" onsubmit={(e) => { e.preventDefault(); addCity(); }}>
			<SearchAutocomplete
				label="City"
				placeholder="Search for a city..."
				searchFn={fakeCityAdapter.search}
				renderItem={(city) => ({ name: city.name, subtitle: city.country, icon: 'location' })}
				getItemId={(city) => city.id}
				onSelect={(city) => { selectedCity = city; }}
				bind:value={citySearchValue}
				bind:selectedItem={selectedCity}
				required
			/>
			<div class="date-row">
				<div class="form-field">
					<label class="label" for="city-start">Start Date</label>
					<input
						type="date"
						id="city-start"
						class="input"
						bind:value={newCityStartDate}
						required
					/>
				</div>
				<div class="form-field">
					<label class="label" for="city-end">End Date</label>
					<input
						type="date"
						id="city-end"
						class="input"
						bind:value={newCityEndDate}
						min={newCityStartDate}
						required
					/>
				</div>
			</div>
			{#if dateConflict}
				<div class="date-conflict-warning">
					<Icon name="close" size={16} />
					<span>Dates overlap with <strong>{dateConflict.cityName}</strong> ({formatDate(dateConflict.start, { month: 'short', day: 'numeric' })} - {formatDate(dateConflict.end, { month: 'short', day: 'numeric' })})</span>
				</div>
			{/if}
			<p class="date-hint">Dates outside current trip range will extend the trip. A 1-day overlap for transition days is allowed.</p>
			<div class="form-actions">
				<Button variant="secondary" onclick={() => (showAddCityModal = false)}>Cancel</Button>
				<Button type="submit" disabled={!selectedCity || !!dateConflict}>Add City</Button>
			</div>
		</form>
	</Modal>

	<Modal isOpen={showEditCityModal} title="Edit City Dates" onclose={() => (showEditCityModal = false)}>
		{#if editingCity}
			<form class="city-form" onsubmit={(e) => { e.preventDefault(); saveCityDates(); }}>
				<p class="city-name-display">{editingCity.name}, {editingCity.country}</p>
				<div class="date-row">
					<div class="form-field">
						<label class="label" for="edit-city-start">Start Date</label>
						<input
							type="date"
							id="edit-city-start"
							class="input"
							bind:value={editCityStartDate}
							required
						/>
					</div>
					<div class="form-field">
						<label class="label" for="edit-city-end">End Date</label>
						<input
							type="date"
							id="edit-city-end"
							class="input"
							bind:value={editCityEndDate}
							min={editCityStartDate}
							required
						/>
					</div>
				</div>
				<p class="date-hint">Changing dates may extend or shorten the overall trip.</p>
				<div class="form-actions">
					<Button variant="secondary" onclick={() => (showEditCityModal = false)}>Cancel</Button>
					<Button type="submit">Save Changes</Button>
				</div>
			</form>
		{/if}
	</Modal>

	<AddItemModal
		isOpen={showAddItemModal}
		onclose={() => {
			showAddItemModal = false;
			addItemDayId = null;
		}}
		onAddActivity={handleAddActivityToDay}
		onAddFoodVenue={handleAddFoodVenueToDay}
		onAddStay={handleAddStayToDay}
		onAddTransport={handleAddTransportToDay}
		cityLocation={addItemCityLocation}
		selectedDate={addItemSelectedDate}
		defaultCheckOutDate={addItemDefaultCheckOutDate}
	/>

	<MoveItemModal
		isOpen={showMoveItemModal}
		days={trip.itinerary}
		currentDayId={moveItemFromDayId || ''}
		onclose={() => {
			showMoveItemModal = false;
			moveItemId = null;
			moveItemFromDayId = null;
		}}
		onMove={handleMoveItemConfirm}
	/>

	<Modal isOpen={showExportModal} title="Export Trip" onclose={() => (showExportModal = false)}>
		<div class="export-options">
			<button class="export-option" onclick={() => exportAs('pdf')} disabled={isExporting}>
				<div class="export-icon">📄</div>
				<div class="export-info">
					<span class="export-format">PDF</span>
					<span class="export-desc">Best for printing or sharing</span>
				</div>
			</button>
			<button class="export-option" onclick={() => exportAs('docx')} disabled={isExporting}>
				<div class="export-icon">📝</div>
				<div class="export-info">
					<span class="export-format">Word Document</span>
					<span class="export-desc">Editable DOCX format</span>
				</div>
			</button>
			<button class="export-option" onclick={() => exportAs('json')} disabled={isExporting}>
				<div class="export-icon">💾</div>
				<div class="export-info">
					<span class="export-format">JSON</span>
					<span class="export-desc">Backup or import to another device</span>
				</div>
			</button>
			<button class="export-option" onclick={() => exportAs('print')} disabled={isExporting}>
				<div class="export-icon">🖨️</div>
				<div class="export-info">
					<span class="export-format">Print</span>
					<span class="export-desc">Open print-friendly view</span>
				</div>
			</button>
		</div>
		{#if isExporting}
			<div class="export-loading">Preparing export...</div>
		{/if}
	</Modal>
{/if}

{#if trip}
	<TripSettingsModal
		isOpen={showTripSettingsModal}
		{trip}
		onclose={() => (showTripSettingsModal = false)}
	/>
{/if}

<style>
	.trip-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.not-found {
		text-align: center;
		padding: var(--space-16);

		& h1 {
			margin-bottom: var(--space-2);
		}

		& p {
			color: var(--text-secondary);
			margin-bottom: var(--space-6);
		}
	}

	.trip-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--border-color);
	}

	.trip-info {
		flex: 1;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.875rem;
		color: var(--text-secondary);
		text-decoration: none;
		margin-bottom: var(--space-2);

		&:hover {
			color: var(--color-primary);
		}
	}

	.trip-info h1 {
		margin-bottom: var(--space-2);
	}

	.trip-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.trip-dates {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.trip-cities {
		color: var(--text-tertiary);
	}

	.trip-actions {
		display: flex;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.empty-cities {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-16) var(--space-4);
		background: var(--surface-primary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-lg);
		color: var(--text-tertiary);

		& h2 {
			margin: var(--space-4) 0 var(--space-2);
			color: var(--text-primary);
		}

		& p {
			color: var(--text-secondary);
			margin-bottom: var(--space-6);
		}
	}

	.cities-manager {
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		margin-bottom: var(--space-6);

		& h3 {
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--text-secondary);
			margin: 0 0 var(--space-3);
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}

	.cities-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.city-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.city-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.city-info .city-name {
		font-weight: 500;
	}

	.city-info .city-dates {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.city-actions {
		display: flex;
		gap: var(--space-1);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-tertiary);
		cursor: pointer;

		&:hover {
			background: var(--surface-secondary);
			color: var(--text-primary);
		}

		&.danger:hover {
			background: color-mix(in oklch, var(--color-error), transparent 90%);
			color: var(--color-error);
		}
	}

	.city-name-display {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 var(--space-4);
	}

	.date-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
		font-style: italic;
	}

	.date-conflict-warning {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: color-mix(in oklch, var(--color-error), transparent 90%);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: 0.875rem;

		& strong {
			font-weight: 600;
		}
	}

	.itinerary-container {
		container-type: inline-size;
		container-name: itinerary;
	}

	.city-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.date-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.export-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.export-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover:not(:disabled) {
			background: var(--surface-primary);
			border-color: var(--color-primary);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.export-icon {
		font-size: 1.5rem;
		width: 40px;
		text-align: center;
	}

	.export-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.export-format {
		font-weight: 600;
		color: var(--text-primary);
	}

	.export-desc {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.export-loading {
		text-align: center;
		padding: var(--space-4);
		color: var(--text-secondary);
		font-style: italic;
	}

	@media (max-width: 640px) {
		.trip-header {
			flex-direction: column;
		}

		.trip-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.date-row {
			grid-template-columns: 1fr;
		}
	}
</style>
