<script lang="ts">
	import type { Activity, FoodVenue, Stay, StayType, DailyItemKind, Location, GeoLocation } from '$lib/types/travel';
	import { fakeAttractionAdapter } from '$lib/adapters/attractions/fakeAdapter';
	import { fakeFoodAdapter } from '$lib/adapters/food/fakeAdapter';
	import { fakeLodgingAdapter } from '$lib/adapters/lodging/fakeAdapter';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';
	import { generateActivityId, generateFoodVenueId, generateStayId } from '$lib/utils/ids';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAddActivity: (activity: Activity) => void;
		onAddFoodVenue: (venue: FoodVenue) => void;
		onAddStay?: (stay: Stay) => void;
		cityLocation?: GeoLocation;
		/** The date of the selected day (for default check-in) */
		selectedDate?: string;
		/** The default check-out date (end of city, span, or trip) */
		defaultCheckOutDate?: string;
	}

	let { isOpen, onclose, onAddActivity, onAddFoodVenue, onAddStay, cityLocation, selectedDate, defaultCheckOutDate }: Props = $props();

	let selectedKind = $state<'activity' | 'food' | 'stay'>('activity');
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

	// Derived: whichever item is currently selected based on kind
	const selectedItem = $derived.by(() => {
		if (selectedKind === 'activity') return selectedActivity;
		if (selectedKind === 'food') return selectedFoodVenue;
		if (selectedKind === 'stay') return selectedStay;
		return null;
	});

	// For custom entries
	let customName = $state('');
	let customAddress = $state('');
	let customNotes = $state('');
	let showCustomForm = $state(false);

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
		} else {
			// Set default dates when modal opens
			setDefaultStayDates();
		}
	});

	// Search function for activities
	async function searchActivities(query: string): Promise<Activity[]> {
		const location: Location | undefined = cityLocation
			? {
					name: 'Search Location',
					address: { street: '', city: '', country: '', formatted: '' },
					geo: cityLocation
				}
			: undefined;

		return fakeAttractionAdapter.search({
			query,
			location,
			limit: 10
		});
	}

	// Search function for food venues
	async function searchFoodVenues(query: string): Promise<FoodVenue[]> {
		const location: Location | undefined = cityLocation
			? {
					name: 'Search Location',
					address: { street: '', city: '', country: '', formatted: '' },
					geo: cityLocation
				}
			: undefined;

		return fakeFoodAdapter.search({
			query,
			location,
			limit: 10
		});
	}

	// Search function for stays
	async function searchStays(query: string): Promise<Stay[]> {
		return fakeLodgingAdapter.search({
			query,
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

		const customLocation: Location = {
			name: customName,
			address: {
				street: customAddress,
				city: '',
				country: '',
				formatted: customAddress || customName
			},
			geo: cityLocation || { latitude: 0, longitude: 0 }
		};

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

	const kindOptions = [
		{ value: 'activity' as const, label: 'Activity', icon: 'attraction' },
		{ value: 'food' as const, label: 'Food', icon: 'restaurant' },
		{ value: 'stay' as const, label: 'Stay', icon: 'hotel' }
	];

	const stayTypeOptions: { value: StayType; label: string }[] = [
		{ value: 'hotel', label: 'Hotel' },
		{ value: 'airbnb', label: 'Airbnb' },
		{ value: 'vrbo', label: 'VRBO' },
		{ value: 'hostel', label: 'Hostel' },
		{ value: 'custom', label: 'Other' }
	];

	const getIconForKind = (kind: 'activity' | 'food' | 'stay') => {
		if (kind === 'activity') return 'attraction';
		if (kind === 'food') return 'restaurant';
		return 'hotel';
	};

	const getButtonLabel = (kind: 'activity' | 'food' | 'stay') => {
		if (kind === 'activity') return 'Activity';
		if (kind === 'food') return 'Food';
		return 'Stay';
	};

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
				{#if option.value !== 'stay' || onAddStay}
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
						}}
					>
						<Icon name={option.icon} size={20} />
						<span>{option.label}</span>
					</button>
				{/if}
			{/each}
		</div>

		<!-- Search -->
		<div class="search-section">
			{#if selectedKind === 'activity'}
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
			{:else if selectedKind === 'food'}
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
			{:else if selectedKind === 'stay'}
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
			{/if}

			<button type="button" class="custom-toggle" onclick={() => (showCustomForm = !showCustomForm)}>
				{showCustomForm ? 'Search instead' : "Can't find it? Add custom entry"}
			</button>
		</div>

		{#if showCustomForm}
			<!-- Custom Entry Form -->
			<div class="custom-form">
				<Input label="Name" placeholder="Enter name" bind:value={customName} required />
				<Input label="Address (optional)" placeholder="Enter address" bind:value={customAddress} />

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
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
		}

		&.selected {
			border-color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 90%);
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
</style>
