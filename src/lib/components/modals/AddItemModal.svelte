<script lang="ts">
	import type { Activity, FoodVenue, DailyItemKind, Location, GeoLocation } from '$lib/types/travel';
	import { fakeAttractionAdapter } from '$lib/adapters/attractions/fakeAdapter';
	import { fakeFoodAdapter } from '$lib/adapters/food/fakeAdapter';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';
	import { generateActivityId, generateFoodVenueId } from '$lib/utils/ids';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAddActivity: (activity: Activity) => void;
		onAddFoodVenue: (venue: FoodVenue) => void;
		cityLocation?: GeoLocation;
	}

	let { isOpen, onclose, onAddActivity, onAddFoodVenue, cityLocation }: Props = $props();

	let selectedKind = $state<'activity' | 'food'>('activity');
	let activitySearchQuery = $state('');
	let foodSearchQuery = $state('');
	let selectedActivity = $state<Activity | null>(null);
	let selectedFoodVenue = $state<FoodVenue | null>(null);
	let scheduledTime = $state('');

	// Derived: whichever item is currently selected based on kind
	const selectedItem = $derived(selectedKind === 'activity' ? selectedActivity : selectedFoodVenue);

	// For custom entries
	let customName = $state('');
	let customAddress = $state('');
	let customNotes = $state('');
	let showCustomForm = $state(false);

	$effect(() => {
		if (!isOpen) {
			// Reset state when modal closes
			selectedKind = 'activity';
			activitySearchQuery = '';
			foodSearchQuery = '';
			selectedActivity = null;
			selectedFoodVenue = null;
			scheduledTime = '';
			customName = '';
			customAddress = '';
			customNotes = '';
			showCustomForm = false;
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

	function selectActivity(item: Activity) {
		selectedActivity = item;
		showCustomForm = false;
	}

	function selectFoodVenue(item: FoodVenue) {
		selectedFoodVenue = item;
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
		} else {
			const venue: FoodVenue = {
				id: generateFoodVenueId(),
				name: customName,
				venueType: 'other',
				location: customLocation,
				notes: customNotes || undefined,
				scheduledTime: scheduledTime || undefined
			};
			onAddFoodVenue(venue);
		}

		onclose();
	}

	const kindOptions = [
		{ value: 'activity' as const, label: 'Activity', icon: 'attraction' },
		{ value: 'food' as const, label: 'Food & Dining', icon: 'restaurant' }
	];
</script>

<Modal {isOpen} title="Add to Day" {onclose}>
	<div class="add-item-modal">
		<!-- Kind Selection -->
		<div class="kind-selector">
			{#each kindOptions as option}
				<button
					type="button"
					class="kind-option"
					class:selected={selectedKind === option.value}
					onclick={() => {
						selectedKind = option.value;
						activitySearchQuery = '';
						foodSearchQuery = '';
						selectedActivity = null;
						selectedFoodVenue = null;
						showCustomForm = false;
					}}
				>
					<Icon name={option.icon} size={20} />
					<span>{option.label}</span>
				</button>
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
			{:else}
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
				<Input label="Notes (optional)" placeholder="Any additional details" bind:value={customNotes} />
				<div class="time-field">
					<label class="label" for="custom-time">Scheduled Time (optional)</label>
					<input type="time" id="custom-time" class="input" bind:value={scheduledTime} />
				</div>
				<div class="form-actions">
					<Button variant="secondary" onclick={onclose}>Cancel</Button>
					<Button onclick={addCustomItem} disabled={!customName.trim()}>Add {selectedKind === 'activity' ? 'Activity' : 'Food'}</Button>
				</div>
			</div>
		{:else if selectedItem}
			<!-- Selected Item Options -->
			<div class="selected-options">
				<div class="selected-preview">
					<Icon name={selectedKind === 'activity' ? 'attraction' : 'restaurant'} size={20} />
					<div class="selected-info">
						<span class="selected-name">{selectedItem.name}</span>
						<span class="selected-address">{selectedItem.location.address.formatted}</span>
					</div>
				</div>
				<div class="time-field">
					<label class="label" for="scheduled-time">Scheduled Time (optional)</label>
					<input type="time" id="scheduled-time" class="input" bind:value={scheduledTime} />
				</div>
				<div class="form-actions">
					<Button variant="secondary" onclick={onclose}>Cancel</Button>
					<Button onclick={addSelectedItem}>Add to Day</Button>
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

	.time-field {
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
	}
</style>
