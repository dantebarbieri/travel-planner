<script lang="ts">
	import type { Activity, FoodVenue, Stay, StayType, DailyItemKind, Location, GeoLocation, TransportLeg } from '$lib/types/travel';
	import { attractionAdapter } from '$lib/adapters/attractions';
	import { foodAdapter } from '$lib/adapters/food';
	import { lodgingAdapter } from '$lib/adapters/lodging';
	import { cityAdapter, type CitySearchResult } from '$lib/adapters/cities';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';
	import TransportKindModal from '$lib/components/modals/TransportKindModal.svelte';
	import FlightSearchModal from '$lib/components/modals/FlightSearchModal.svelte';
	import { generateActivityId, generateFoodVenueId, generateStayId } from '$lib/utils/ids';
	import { geocodeAddress, type GeocodingResult } from '$lib/api/geocodingApi';
	import { parseAddress, formatParsedAddress } from '$lib/utils/addressParser';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAddActivity: (activity: Activity) => void;
		onAddFoodVenue: (venue: FoodVenue) => void;
		onAddStay?: (stay: Stay) => void;
		onAddTransport?: (leg: TransportLeg) => void;
		cityLocation?: GeoLocation;
		/** Pre-filled city name from day, e.g., "Paris, France" */
		cityName?: string;
		/** The date of the selected day (for default check-in) */
		selectedDate?: string;
		/** The default check-out date (end of city, span, or trip) */
		defaultCheckOutDate?: string;
	}

	let { isOpen, onclose, onAddActivity, onAddFoodVenue, onAddStay, onAddTransport, cityLocation, cityName, selectedDate, defaultCheckOutDate }: Props = $props();

	let selectedKind = $state<'activity' | 'food' | 'stay' | 'transport'>('activity');
	let activitySearchQuery = $state('');
	let foodSearchQuery = $state('');
	let staySearchQuery = $state('');
	let selectedActivity = $state<Activity | null>(null);
	let selectedFoodVenue = $state<FoodVenue | null>(null);
	let selectedStay = $state<Stay | null>(null);
	let scheduledTime = $state('');

	// Stay-specific fields
	let stayCheckIn = $state('');
	let stayCheckOut = $state('');
	let stayType = $state<StayType>('hotel');

	// Transport-specific state
	let showTransportKindModal = $state(false);
	let showFlightSearchModal = $state(false);

	// Derived: whichever item is currently selected based on kind
	const selectedItem = $derived.by(() => {
		if (selectedKind === 'activity') return selectedActivity;
		if (selectedKind === 'food') return selectedFoodVenue;
		if (selectedKind === 'stay') return selectedStay;
		// Transport doesn't use selectedItem - it uses sub-modals
		return null;
	});

	// For custom entries
	let customName = $state('');
	let customAddress = $state('');
	let customNotes = $state('');
	let showCustomForm = $state(false);

	// Geocoding state
	let isGeocoding = $state(false);
	let geocodeResult = $state<GeocodingResult | null>(null);
	let geocodeError = $state<string | null>(null);

	// City/location state for "near" parameter (required for Foursquare searches)
	let selectedNearCity = $state<CitySearchResult | null>(null);
	let nearCitySearchValue = $state('');
	let nearCityLocation = $state<GeoLocation | undefined>(undefined);
	let nearCityName = $state<string | undefined>(undefined);

	// Set default dates when modal opens or when switching to stay kind
	function setDefaultStayDates() {
		stayCheckIn = selectedDate || '';
		stayCheckOut = defaultCheckOutDate || selectedDate || '';
	}

	$effect(() => {
		if (!isOpen) {
			// Reset state when modal closes
			selectedKind = 'activity';
			activitySearchQuery = '';
			foodSearchQuery = '';
			staySearchQuery = '';
			selectedActivity = null;
			selectedFoodVenue = null;
			selectedStay = null;
			scheduledTime = '';
			stayCheckIn = '';
			stayCheckOut = '';
			stayType = 'hotel';
			customName = '';
			customAddress = '';
			customNotes = '';
			showCustomForm = false;
			isGeocoding = false;
			geocodeResult = null;
			geocodeError = null;
			showTransportKindModal = false;
			showFlightSearchModal = false;
			// Reset city state
			selectedNearCity = null;
			nearCitySearchValue = '';
			nearCityLocation = undefined;
			nearCityName = undefined;
		} else {
			// Set default dates when modal opens
			setDefaultStayDates();
			// Initialize city state from props
			if (cityName && cityLocation) {
				// Day has a city - search to get properly formatted name
				nearCityLocation = cityLocation;
				nearCitySearchValue = cityName;
				// Do a city search to get the full formatted name (async)
				searchCities(cityName).then((results) => {
					if (results.length > 0) {
						// Use the first result's formatted name
						const city = results[0];
						nearCityName = city.formatted || `${city.name}, ${city.state || city.country}`;
						nearCitySearchValue = nearCityName;
						selectedNearCity = city;
					} else {
						// Fallback to prop value if search fails
						nearCityName = cityName;
					}
				});
			} else {
				// No city - user must search
				nearCityName = undefined;
				nearCityLocation = undefined;
				nearCitySearchValue = '';
				selectedNearCity = null;
			}
		}
	});

	// Search function for cities (for "near" field)
	async function searchCities(query: string): Promise<CitySearchResult[]> {
		return cityAdapter.search(query, 10);
	}

	function selectNearCity(city: CitySearchResult) {
		selectedNearCity = city;
		// Use formatted address for better context, or fallback to state/country
		nearCityName = city.formatted || `${city.name}, ${city.state || city.country}`;
		nearCityLocation = city.location;
		nearCitySearchValue = nearCityName;
	}

	function clearNearCity() {
		selectedNearCity = null;
		nearCityName = undefined;
		nearCityLocation = undefined;
		nearCitySearchValue = '';
	}

	// Search function for activities
	async function searchActivities(query: string): Promise<Activity[]> {
		// Require city to be set for Foursquare searches
		if (!nearCityLocation) return [];

		const location: Location = {
			name: nearCityName || 'Search Location',
			address: { street: '', city: '', country: '', formatted: nearCityName || '' },
			geo: nearCityLocation
		};

		return attractionAdapter.search({
			query,
			location,
			near: nearCityName,
			limit: 10
		});
	}

	// Search function for food venues
	async function searchFoodVenues(query: string): Promise<FoodVenue[]> {
		// Require city to be set for Foursquare searches
		if (!nearCityLocation) return [];

		const location: Location = {
			name: nearCityName || 'Search Location',
			address: { street: '', city: '', country: '', formatted: nearCityName || '' },
			geo: nearCityLocation
		};

		return foodAdapter.search({
			query,
			location,
			near: nearCityName,
			limit: 10
		});
	}

	// Search function for stays
	async function searchStays(query: string): Promise<Stay[]> {
		// Require city to be set for Foursquare searches
		if (!nearCityLocation) return [];

		const location: Location = {
			name: nearCityName || 'Search Location',
			address: { street: '', city: '', country: '', formatted: nearCityName || '' },
			geo: nearCityLocation
		};

		return lodgingAdapter.search({
			query,
			location,
			near: nearCityName,
			checkIn: stayCheckIn || undefined,
			checkOut: stayCheckOut || undefined,
			limit: 10
		});
	}

	function selectActivity(item: Activity) {
		selectedActivity = item;
		showCustomForm = false;
	}

	function selectFoodVenue(item: FoodVenue) {
		selectedFoodVenue = item;
		showCustomForm = false;
	}

	function selectStay(item: Stay) {
		selectedStay = item;
		showCustomForm = false;
	}

	function addSelectedItem() {
		if (selectedKind === 'activity' && selectedActivity) {
			onAddActivity({
				...selectedActivity,
				startTime: scheduledTime || undefined
			});
		} else if (selectedKind === 'food' && selectedFoodVenue) {
			onAddFoodVenue({
				...selectedFoodVenue,
				scheduledTime: scheduledTime || undefined
			});
		} else if (selectedKind === 'stay' && selectedStay && onAddStay) {
			onAddStay({
				...selectedStay,
				checkIn: stayCheckIn || selectedStay.checkIn,
				checkOut: stayCheckOut || selectedStay.checkOut
			});
		} else {
			return;
		}

		onclose();
	}

	function addCustomItem() {
		if (!customName.trim()) return;

		// Use geocoded location if available, otherwise create a fallback with parsed address
		let customLocation: Location;

		if (geocodeResult?.location) {
			customLocation = geocodeResult.location;
		} else {
			// Geocoding failed or wasn't performed - use fallback parsing
			const parsed = parseAddress(customAddress);
			const formattedAddr = formatParsedAddress(parsed);

			customLocation = {
				name: customName,
				address: {
					street: parsed.street || customAddress,
					city: parsed.city || '',
					state: parsed.state,
					postalCode: parsed.postalCode,
					country: parsed.country || '',
					formatted: formattedAddr || customAddress || customName
				},
				geo: nearCityLocation || cityLocation || { latitude: 0, longitude: 0 }
			};
		}

		if (selectedKind === 'activity') {
			const activity: Activity = {
				id: generateActivityId(),
				name: customName,
				category: 'other',
				location: customLocation,
				description: customNotes || undefined,
				startTime: scheduledTime || undefined
			};
			onAddActivity(activity);
		} else if (selectedKind === 'food') {
			const venue: FoodVenue = {
				id: generateFoodVenueId(),
				name: customName,
				venueType: 'other',
				location: customLocation,
				notes: customNotes || undefined,
				scheduledTime: scheduledTime || undefined
			};
			onAddFoodVenue(venue);
		} else if (selectedKind === 'stay' && onAddStay && stayCheckIn && stayCheckOut) {
			const stay: Stay = {
				id: generateStayId(),
				type: stayType,
				name: customName,
				location: customLocation,
				checkIn: stayCheckIn,
				checkOut: stayCheckOut,
				notes: customNotes || undefined
			};
			onAddStay(stay);
		}

		onclose();
	}

	function resetKindSelection() {
		activitySearchQuery = '';
		foodSearchQuery = '';
		staySearchQuery = '';
		selectedActivity = null;
		selectedFoodVenue = null;
		selectedStay = null;
		showCustomForm = false;
	}

	async function handleAddressBlur() {
		// Clear previous results if address is too short or empty
		if (!customAddress.trim() || customAddress.length < 5) {
			geocodeResult = null;
			geocodeError = null;
			return;
		}

		isGeocoding = true;
		geocodeError = null;

		try {
			const result = await geocodeAddress(customAddress);
			geocodeResult = result;
			if (!result) {
				// Parse the address to provide better feedback
				const parsed = parseAddress(customAddress);
				if (parsed.city) {
					geocodeError = `Could not verify address. Using "${parsed.city}" as the city.`;
				} else {
					geocodeError = 'Address not found. Location features may be limited.';
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Geocoding failed';
			// Try to parse even on error
			const parsed = parseAddress(customAddress);
			if (parsed.city) {
				geocodeError = `${message}. Using "${parsed.city}" as the city.`;
			} else {
				geocodeError = `${message}. Location features may be limited.`;
			}
			geocodeResult = null;
		} finally {
			isGeocoding = false;
		}
	}

	const kindOptions = [
		{ value: 'activity' as const, label: 'Activity', icon: 'attraction' },
		{ value: 'food' as const, label: 'Food', icon: 'restaurant' },
		{ value: 'stay' as const, label: 'Stay', icon: 'hotel' },
		{ value: 'transport' as const, label: 'Transport', icon: 'flight' }
	];

	const stayTypeOptions: { value: StayType; label: string }[] = [
		{ value: 'hotel', label: 'Hotel' },
		{ value: 'airbnb', label: 'Airbnb' },
		{ value: 'vrbo', label: 'VRBO' },
		{ value: 'hostel', label: 'Hostel' },
		{ value: 'custom', label: 'Other' }
	];

	const getIconForKind = (kind: 'activity' | 'food' | 'stay' | 'transport') => {
		if (kind === 'activity') return 'attraction';
		if (kind === 'food') return 'restaurant';
		if (kind === 'transport') return 'flight';
		return 'hotel';
	};

	const getButtonLabel = (kind: 'activity' | 'food' | 'stay' | 'transport') => {
		if (kind === 'activity') return 'Activity';
		if (kind === 'food') return 'Food';
		if (kind === 'transport') return 'Transport';
		return 'Stay';
	};

	// Transport handlers
	function handleTransportKindSelect(kind: 'flight' | 'train' | 'bus') {
		showTransportKindModal = false;
		if (kind === 'flight') {
			showFlightSearchModal = true;
		}
		// Train/bus search removed - users should use manual transport entry
	}

	function handleAddFlight(leg: TransportLeg) {
		showFlightSearchModal = false;
		onAddTransport?.(leg);
		onclose();
	}

	// Validation for stay
	const canAddStay = $derived(
		selectedKind === 'stay' && stayCheckIn && stayCheckOut && stayCheckIn <= stayCheckOut
	);
</script>

<Modal {isOpen} title="Add to Day" {onclose}>
	<div class="add-item-modal">
		<!-- Kind Selection -->
		<div class="kind-selector">
			{#each kindOptions as option}
				{#if option.value === 'stay' && !onAddStay}
					<!-- Skip stay if no handler -->
				{:else if option.value === 'transport' && !onAddTransport}
					<!-- Skip transport if no handler -->
				{:else}
					<button
						type="button"
						class="kind-option"
						class:selected={selectedKind === option.value}
						onclick={() => {
							selectedKind = option.value;
							resetKindSelection();
							// Set default dates when switching to stay
							if (option.value === 'stay') {
								setDefaultStayDates();
							}
							// Open transport kind modal when selecting transport
							if (option.value === 'transport') {
								showTransportKindModal = true;
							}
						}}
					>
						<Icon name={option.icon} size={20} />
						<span>{option.label}</span>
					</button>
				{/if}
			{/each}
		</div>

		<!-- City/Location Field (required for non-transport searches) -->
		{#if selectedKind !== 'transport'}
			<div class="near-city-field">
				<span class="label" id="near-city-label">Search near <span class="required">*</span></span>
				<div class="city-field">
					<SearchAutocomplete
						placeholder="Search for a city..."
						searchFn={searchCities}
						renderItem={(city) => ({
							name: city.name,
							subtitle: city.formatted || `${city.state ? `${city.state}, ` : ''}${city.country}`,
							icon: 'location'
						})}
						getItemId={(city) => city.id}
						onSelect={selectNearCity}
						bind:value={nearCitySearchValue}
						bind:selectedItem={selectedNearCity}
					/>
					{#if nearCityLocation}
						<button
							type="button"
							class="clear-city-btn"
							onclick={clearNearCity}
							title="Clear city to search elsewhere"
						>
							<Icon name="close" size={16} />
						</button>
					{/if}
				</div>
				{#if !nearCityLocation}
					<span class="field-hint">Select a city to enable search</span>
				{/if}
			</div>
		{/if}

		<!-- Search -->
		<div class="search-section">
			{#if selectedKind === 'activity'}
				{#if nearCityLocation}
					<SearchAutocomplete
						placeholder="Search attractions, tours, museums..."
						searchFn={searchActivities}
						renderItem={(item) => ({
							name: item.name,
							subtitle: item.location.address.formatted,
							icon: 'attraction'
						})}
						getItemId={(item) => item.id}
						onSelect={selectActivity}
						bind:value={activitySearchQuery}
						bind:selectedItem={selectedActivity}
					/>
				{:else}
					<div class="search-disabled">Select a city above to search for activities</div>
				{/if}
			{:else if selectedKind === 'food'}
				{#if nearCityLocation}
					<SearchAutocomplete
						placeholder="Search restaurants, cafes, bars..."
						searchFn={searchFoodVenues}
						renderItem={(item) => ({
							name: item.name,
							subtitle: `${item.venueType} • ${item.location.address.formatted}`,
							icon: 'restaurant'
						})}
						getItemId={(item) => item.id}
						onSelect={selectFoodVenue}
						bind:value={foodSearchQuery}
						bind:selectedItem={selectedFoodVenue}
					/>
				{:else}
					<div class="search-disabled">Select a city above to search for food venues</div>
				{/if}
			{:else if selectedKind === 'stay'}
				{#if nearCityLocation}
					<SearchAutocomplete
						placeholder="Search hotels, airbnbs, hostels..."
						searchFn={searchStays}
						renderItem={(item) => ({
							name: item.name,
							subtitle: `${item.type} • ${item.location.address.formatted}`,
							icon: 'hotel'
						})}
						getItemId={(item) => item.id}
						onSelect={selectStay}
						bind:value={staySearchQuery}
						bind:selectedItem={selectedStay}
					/>
				{:else}
					<div class="search-disabled">Select a city above to search for stays</div>
				{/if}
			{:else if selectedKind === 'transport'}
				<div class="transport-prompt">
					<p>Select a transport type to add flights, trains, or intercity buses to your itinerary.</p>
					<Button onclick={() => (showTransportKindModal = true)}>
						<Icon name="flight" size={16} />
						Choose Transport Type
					</Button>
				</div>
			{/if}

			{#if selectedKind !== 'transport'}
				<button type="button" class="custom-toggle" onclick={() => (showCustomForm = !showCustomForm)}>
					{showCustomForm ? 'Search instead' : "Can't find it? Add custom entry"}
				</button>
			{/if}
		</div>

		{#if showCustomForm}
			<!-- Custom Entry Form -->
			<div class="custom-form">
				<Input label="Name" placeholder="Enter name" bind:value={customName} required />
				<div class="address-field">
					<Input
						label="Address (optional)"
						placeholder="Enter address"
						bind:value={customAddress}
						onblur={handleAddressBlur}
					/>
					{#if isGeocoding}
						<span class="geocoding-status loading">Looking up address...</span>
					{:else if geocodeResult}
						<span class="geocoding-status success">✓ {geocodeResult.location.address.formatted}</span>
					{:else if geocodeError}
						<span class="geocoding-status error">{geocodeError}</span>
					{/if}
				</div>

				{#if selectedKind === 'stay'}
					<div class="stay-type-selector">
						<span class="label" id="stay-type-label">Type of Stay</span>
						<div class="stay-type-options" role="group" aria-labelledby="stay-type-label">
							{#each stayTypeOptions as option}
								<button
									type="button"
									class="stay-type-option"
									class:selected={stayType === option.value}
									onclick={() => (stayType = option.value)}
								>
									{option.label}
								</button>
							{/each}
						</div>
					</div>
					<div class="date-row">
						<div class="date-field">
							<label class="label" for="custom-checkin">Check-in</label>
							<input type="date" id="custom-checkin" class="input" bind:value={stayCheckIn} required />
						</div>
						<div class="date-field">
							<label class="label" for="custom-checkout">Check-out</label>
							<input type="date" id="custom-checkout" class="input" bind:value={stayCheckOut} min={stayCheckIn} required />
						</div>
					</div>
				{:else}
					<div class="time-field">
						<label class="label" for="custom-time">Scheduled Time (optional)</label>
						<input type="time" id="custom-time" class="input" bind:value={scheduledTime} />
					</div>
				{/if}

				<Input label="Notes (optional)" placeholder="Any additional details" bind:value={customNotes} />

				<div class="form-actions">
					<Button variant="secondary" onclick={onclose}>Cancel</Button>
					<Button
						onclick={addCustomItem}
						disabled={!customName.trim() || (selectedKind === 'stay' && (!stayCheckIn || !stayCheckOut))}
					>
						Add {getButtonLabel(selectedKind)}
					</Button>
				</div>
			</div>
		{:else if selectedItem}
			<!-- Selected Item Options -->
			<div class="selected-options">
				<div class="selected-preview">
					<Icon name={getIconForKind(selectedKind)} size={20} />
					<div class="selected-info">
						<span class="selected-name">{selectedItem.name}</span>
						<span class="selected-address">{selectedItem.location.address.formatted}</span>
						{#if selectedKind === 'stay' && selectedStay}
							<Badge size="sm">{selectedStay.type}</Badge>
							{#if selectedStay.pricePerNight}
								<span class="selected-price">{selectedStay.currency === 'EUR' ? '€' : selectedStay.currency === 'JPY' ? '¥' : '$'}{selectedStay.pricePerNight}/night</span>
							{/if}
						{/if}
					</div>
				</div>

				{#if selectedKind === 'stay'}
					<div class="date-row">
						<div class="date-field">
							<label class="label" for="stay-checkin">Check-in</label>
							<input type="date" id="stay-checkin" class="input" bind:value={stayCheckIn} required />
						</div>
						<div class="date-field">
							<label class="label" for="stay-checkout">Check-out</label>
							<input type="date" id="stay-checkout" class="input" bind:value={stayCheckOut} min={stayCheckIn} required />
						</div>
					</div>
				{:else}
					<div class="time-field">
						<label class="label" for="scheduled-time">Scheduled Time (optional)</label>
						<input type="time" id="scheduled-time" class="input" bind:value={scheduledTime} />
					</div>
				{/if}

				<div class="form-actions">
					<Button variant="secondary" onclick={onclose}>Cancel</Button>
					<Button
						onclick={addSelectedItem}
						disabled={selectedKind === 'stay' && !canAddStay}
					>
						Add to Day
					</Button>
				</div>
			</div>
		{/if}
	</div>
</Modal>

<!-- Transport Sub-Modals -->
<TransportKindModal
	isOpen={showTransportKindModal}
	onclose={() => (showTransportKindModal = false)}
	onSelectKind={handleTransportKindSelect}
/>

<FlightSearchModal
	isOpen={showFlightSearchModal}
	onclose={() => (showFlightSearchModal = false)}
	onAddFlight={handleAddFlight}
	defaultDate={selectedDate}
/>

<style>
	.add-item-modal {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-height: 300px;
	}

	.kind-selector {
		display: flex;
		gap: var(--space-2);
	}

	.kind-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-3);
		background: var(--surface-secondary);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
		}

		&.selected {
			border-color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 95%);
		}

		& span {
			font-size: 0.875rem;
			font-weight: 500;
		}
	}

	.search-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.custom-toggle {
		background: none;
		border: none;
		color: var(--color-primary);
		font-size: 0.875rem;
		cursor: pointer;
		text-decoration: underline;
		text-align: left;
		padding: 0;

		&:hover {
			opacity: 0.8;
		}
	}

	.custom-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.selected-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border-color);
	}

	.selected-preview {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3);
		background: color-mix(in oklch, var(--color-success), transparent 90%);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-md);
	}

	.selected-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.selected-name {
		font-weight: 600;
	}

	.selected-address {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.selected-price {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.time-field,
	.date-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.date-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.stay-type-selector {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.stay-type-options {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.stay-type-option {
		padding: var(--space-2) var(--space-3);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		color: var(--text-primary);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
		}

		&.selected {
			border-color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 90%);
			color: var(--text-primary);
		}
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
	}

	.transport-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--surface-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		text-align: center;

		& p {
			margin: 0;
			font-size: 0.875rem;
			color: var(--text-secondary);
		}
	}

	.address-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.geocoding-status {
		font-size: 0.75rem;
		padding-left: var(--space-1);
	}

	.geocoding-status.loading {
		color: var(--text-secondary);
	}

	.geocoding-status.success {
		color: var(--color-success);
	}

	.geocoding-status.error {
		color: var(--color-warning);
	}

	.near-city-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border-color);
	}

	.city-field {
		display: flex;
		gap: var(--space-2);
		align-items: flex-start;
	}

	.city-field :global(.search-autocomplete) {
		flex: 1;
	}

	.clear-city-btn {
		padding: var(--space-2);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		&:hover {
			background: var(--surface-hover);
			color: var(--text-primary);
		}
	}

	.required {
		color: var(--color-error);
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.search-disabled {
		padding: var(--space-4);
		background: var(--surface-secondary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}
</style>
