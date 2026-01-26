<script lang="ts">
	import type { Activity, FoodVenue, DailyItemKind, Location, GeoLocation } from '$lib/types/travel';
	import { fakeAttractionAdapter } from '$lib/adapters/attractions/fakeAdapter';
	import { fakeFoodAdapter } from '$lib/adapters/food/fakeAdapter';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
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
	let searchQuery = $state('');
	let searchResults = $state<(Activity | FoodVenue)[]>([]);
	let isSearching = $state(false);
	let selectedItem = $state<Activity | FoodVenue | null>(null);
	let scheduledTime = $state('');

	// For custom entries
	let customName = $state('');
	let customAddress = $state('');
	let customNotes = $state('');
	let showCustomForm = $state(false);

	$effect(() => {
		if (!isOpen) {
			// Reset state when modal closes
			selectedKind = 'activity';
			searchQuery = '';
			searchResults = [];
			selectedItem = null;
			scheduledTime = '';
			customName = '';
			customAddress = '';
			customNotes = '';
			showCustomForm = false;
		}
	});

	async function search() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}

		isSearching = true;
		try {
			const location: Location | undefined = cityLocation
				? {
						name: 'Search Location',
						address: { street: '', city: '', country: '', formatted: '' },
						geo: cityLocation
					}
				: undefined;

			if (selectedKind === 'activity') {
				searchResults = await fakeAttractionAdapter.search({
					query: searchQuery,
					location,
					limit: 10
				});
			} else {
				searchResults = await fakeFoodAdapter.search({
					query: searchQuery,
					location,
					limit: 10
				});
			}
		} catch (error) {
			console.error('Search failed:', error);
			searchResults = [];
		} finally {
			isSearching = false;
		}
	}

	function selectItem(item: Activity | FoodVenue) {
		selectedItem = item;
		showCustomForm = false;
	}

	function addSelectedItem() {
		if (!selectedItem) return;

		if (selectedKind === 'activity') {
			const activity = selectedItem as Activity;
			onAddActivity({
				...activity,
				startTime: scheduledTime || undefined
			});
		} else {
			const venue = selectedItem as FoodVenue;
			onAddFoodVenue({
				...venue,
				scheduledTime: scheduledTime || undefined
			});
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

	function isActivity(item: Activity | FoodVenue): item is Activity {
		return 'category' in item;
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
						searchResults = [];
						selectedItem = null;
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
			<div class="search-input-row">
				<Input
					placeholder={selectedKind === 'activity' ? 'Search attractions, tours...' : 'Search restaurants, cafes...'}
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && search()}
				/>
				<Button onclick={search} disabled={isSearching}>
					<Icon name="search" size={16} />
				</Button>
			</div>

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
		{:else}
			<!-- Search Results -->
			{#if isSearching}
				<div class="loading">Searching...</div>
			{:else if searchResults.length > 0}
				<div class="results-list">
					{#each searchResults as result (result.id)}
						<button
							type="button"
							class="result-item"
							class:selected={selectedItem?.id === result.id}
							onclick={() => selectItem(result)}
						>
							<div class="result-info">
								<span class="result-name">{result.name}</span>
								<span class="result-address">{result.location.address.formatted}</span>
								{#if isActivity(result)}
									<Badge size="sm">{result.category}</Badge>
								{:else}
									<Badge size="sm">{result.venueType}</Badge>
								{/if}
							</div>
							{#if selectedItem?.id === result.id}
								<Icon name="check" size={16} />
							{/if}
						</button>
					{/each}
				</div>

				{#if selectedItem}
					<div class="selected-options">
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
			{:else if searchQuery}
				<div class="no-results">
					<p>No results found for "{searchQuery}"</p>
					<button type="button" class="custom-toggle" onclick={() => (showCustomForm = true)}>
						Add as custom entry
					</button>
				</div>
			{/if}
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

	.search-input-row {
		display: flex;
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

	.results-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-height: 250px;
		overflow-y: auto;
	}

	.result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
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
	}

	.result-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.result-name {
		font-weight: 500;
	}

	.result-address {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.selected-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border-color);
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

	.loading,
	.no-results {
		text-align: center;
		padding: var(--space-8);
		color: var(--text-secondary);
	}

	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);

		& p {
			margin: 0;
		}
	}
</style>
