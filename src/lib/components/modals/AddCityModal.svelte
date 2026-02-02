<script lang="ts">
	import { cityAdapter, type CitySearchResult } from '$lib/adapters/cities';
	import type { City } from '$lib/types/travel';
	import { formatDate } from '$lib/utils/dates';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';

	interface Props {
		isOpen: boolean;
		/** Existing cities in the trip (for conflict detection) */
		existingCities: City[];
		/** Default start date for new city */
		defaultStartDate?: string;
		/** Default end date for new city */
		defaultEndDate?: string;
		/** Called when a city is added */
		onAdd: (cityData: Omit<City, 'id' | 'stays' | 'arrivalTransportId' | 'departureTransportId'>) => void;
		/** Called when modal is closed */
		onClose: () => void;
	}

	let {
		isOpen,
		existingCities,
		defaultStartDate = '',
		defaultEndDate = '',
		onAdd,
		onClose
	}: Props = $props();

	// Form state
	let citySearchValue = $state('');
	let selectedCity = $state<CitySearchResult | null>(null);
	let startDate = $state('');
	let endDate = $state('');

	// Reset form when modal opens
	$effect(() => {
		if (isOpen) {
			citySearchValue = '';
			selectedCity = null;
			startDate = defaultStartDate;
			endDate = defaultEndDate;
		}
	});

	// Search function for cities
	async function searchCities(query: string): Promise<CitySearchResult[]> {
		return cityAdapter.search(query, 10);
	}

	function selectCity(city: CitySearchResult) {
		selectedCity = city;
	}

	// Check for date conflicts with existing cities
	const dateConflict = $derived.by(() => {
		if (!startDate || !endDate) return null;

		const newStart = new Date(startDate);
		const newEnd = new Date(endDate);

		for (const city of existingCities) {
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

	function handleSubmit() {
		if (!selectedCity || !startDate || !endDate || dateConflict) return;

		onAdd({
			name: selectedCity.name,
			country: selectedCity.country,
			state: selectedCity.state,
			county: selectedCity.county,
			formatted: selectedCity.formatted,
			location: selectedCity.location,
			timezone: selectedCity.timezone,
			startDate,
			endDate
		});

		onClose();
	}

	function handleClose() {
		onClose();
	}
</script>

<Modal {isOpen} title="Add City" onclose={handleClose}>
	<form class="city-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<SearchAutocomplete
			label="City"
			placeholder="Search for a city..."
			searchFn={searchCities}
			renderItem={(city) => ({
				name: city.name,
				subtitle: city.formatted || `${city.state ? `${city.state}, ` : ''}${city.country}`,
				icon: 'location'
			})}
			getItemId={(city) => city.id}
			onSelect={selectCity}
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
					bind:value={startDate}
					required
				/>
			</div>
			<div class="form-field">
				<label class="label" for="city-end">End Date</label>
				<input
					type="date"
					id="city-end"
					class="input"
					bind:value={endDate}
					min={startDate}
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
			<Button variant="secondary" onclick={handleClose}>Cancel</Button>
			<Button type="submit" disabled={!selectedCity || !!dateConflict}>Add City</Button>
		</div>
	</form>
</Modal>

<style>
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

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>
