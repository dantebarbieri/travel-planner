<script lang="ts">
	import type { TransportLeg, Airline, FlightSearchResult, Location } from '$lib/types/travel';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';
	import { fakeFlightAdapter } from '$lib/adapters/transport/flightAdapter';
	import { generateTransportId } from '$lib/utils/ids';
	import { formatDuration } from '$lib/utils/dates';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAddFlight: (leg: TransportLeg) => void;
		defaultDate?: string;
	}

	let { isOpen, onclose, onAddFlight, defaultDate = '' }: Props = $props();

	let airlineSearchValue = $state('');
	let selectedAirline = $state<Airline | null>(null);
	let flightNumber = $state('');
	let departureDate = $state('');
	let isSearching = $state(false);
	let searchResult = $state<FlightSearchResult | null>(null);
	let searchError = $state('');

	// Custom entry fields (when flight not found)
	let showCustomForm = $state(false);
	let customDepartureTime = $state('');
	let customArrivalTime = $state('');
	let customArrivalDate = $state('');
	let customOrigin = $state('');
	let customDestination = $state('');

	async function searchAirlines(query: string): Promise<Airline[]> {
		return fakeFlightAdapter.searchAirlines(query);
	}

	async function searchFlight() {
		if (!selectedAirline || !flightNumber || !departureDate) return;
		isSearching = true;
		searchError = '';
		searchResult = null;
		try {
			const result = await fakeFlightAdapter.getFlightDetails(
				selectedAirline.code,
				flightNumber,
				departureDate
			);
			if (result) {
				searchResult = result;
				showCustomForm = false;
			} else {
				searchError = 'Flight not found. You can enter the details manually below.';
				showCustomForm = true;
				customArrivalDate = departureDate;
			}
		} finally {
			isSearching = false;
		}
	}

	function buildCustomLocation(name: string): Location {
		return {
			name,
			address: { street: '', city: '', country: '', formatted: name },
			geo: { latitude: 0, longitude: 0 }
		};
	}

	function addFlight() {
		const airlineCode = selectedAirline?.code || '';
		const airlineName = selectedAirline?.name || airlineSearchValue;

		if (searchResult) {
			// Use search result data
			const leg: TransportLeg = {
				id: generateTransportId(),
				mode: 'flight',
				carrier: searchResult.airline,
				flightNumber: `${searchResult.airlineCode}${searchResult.flightNumber}`,
				origin: searchResult.origin,
				destination: searchResult.destination,
				departureDate: searchResult.departureDate,
				departureTime: searchResult.departureTime,
				arrivalDate: searchResult.arrivalDate,
				arrivalTime: searchResult.arrivalTime,
				duration: searchResult.duration,
				price: searchResult.price,
				currency: searchResult.currency
			};
			onAddFlight(leg);
		} else if (showCustomForm && customOrigin && customDestination) {
			// Use custom entry data
			const leg: TransportLeg = {
				id: generateTransportId(),
				mode: 'flight',
				carrier: airlineName,
				flightNumber: `${airlineCode}${flightNumber}`,
				origin: buildCustomLocation(customOrigin),
				destination: buildCustomLocation(customDestination),
				departureDate: departureDate,
				departureTime: customDepartureTime || undefined,
				arrivalDate: customArrivalDate || departureDate,
				arrivalTime: customArrivalTime || undefined
			};
			onAddFlight(leg);
		}
		onclose();
	}

	// Reset on close
	$effect(() => {
		if (!isOpen) {
			airlineSearchValue = '';
			selectedAirline = null;
			flightNumber = '';
			departureDate = defaultDate;
			searchResult = null;
			searchError = '';
			showCustomForm = false;
			customDepartureTime = '';
			customArrivalTime = '';
			customArrivalDate = '';
			customOrigin = '';
			customDestination = '';
		} else {
			departureDate = defaultDate;
		}
	});

	const canSearch = $derived(selectedAirline && flightNumber && departureDate);
	const canAddFromSearch = $derived(searchResult !== null);
	const canAddFromCustom = $derived(
		showCustomForm && customOrigin.trim() && customDestination.trim() && departureDate
	);
	const canAdd = $derived(canAddFromSearch || canAddFromCustom);
</script>

<Modal {isOpen} title="Add Flight" {onclose} size="md">
	<div class="flight-search-form">
		<div class="search-row">
			<div class="search-field airline-field">
				<SearchAutocomplete
					placeholder="Search airlines..."
					searchFn={searchAirlines}
					renderItem={(item) => ({ name: item.name, subtitle: item.code, icon: 'flight' })}
					getItemId={(item) => item.code}
					onSelect={(item) => {
						selectedAirline = item;
					}}
					bind:value={airlineSearchValue}
					bind:selectedItem={selectedAirline}
				/>
			</div>
			<div class="search-field flight-number-field">
				<Input label="Flight #" placeholder="e.g. 123" bind:value={flightNumber} />
			</div>
		</div>

		<div class="date-row">
			<div class="date-field">
				<label class="label" for="flight-date">Departure Date</label>
				<input type="date" id="flight-date" class="input" bind:value={departureDate} />
			</div>
			<div class="search-button-container">
				<Button onclick={searchFlight} disabled={!canSearch || isSearching}>
					{isSearching ? 'Searching...' : 'Search Flight'}
				</Button>
			</div>
		</div>

		{#if searchError}
			<div class="search-error">
				<Icon name="warning" size={16} />
				<span>{searchError}</span>
			</div>
		{/if}

		{#if searchResult}
			<div class="flight-result">
				<div class="result-header">
					<Icon name="flight" size={20} />
					<span class="result-airline">{searchResult.airline}</span>
					<Badge size="sm">{searchResult.airlineCode}{searchResult.flightNumber}</Badge>
				</div>
				<div class="result-route">
					<div class="route-point">
						<span class="route-name">{searchResult.origin.name}</span>
						<span class="route-time">{searchResult.departureTime}</span>
					</div>
					<div class="route-line">
						<span class="route-duration">{formatDuration(searchResult.duration)}</span>
					</div>
					<div class="route-point">
						<span class="route-name">{searchResult.destination.name}</span>
						<span class="route-time">{searchResult.arrivalTime}</span>
						{#if searchResult.arrivalDate !== searchResult.departureDate}
							<span class="route-next-day">+1</span>
						{/if}
					</div>
				</div>
				{#if searchResult.price}
					<div class="result-price">
						{searchResult.currency === 'EUR' ? '€' : searchResult.currency === 'JPY' ? '¥' : '$'}{searchResult.price}
					</div>
				{/if}
			</div>
		{/if}

		{#if showCustomForm}
			<div class="custom-form">
				<p class="custom-form-hint">Enter flight details manually:</p>
				<div class="custom-row">
					<Input label="Origin Airport/City" placeholder="e.g. SFO or San Francisco" bind:value={customOrigin} />
					<Input label="Destination Airport/City" placeholder="e.g. JFK or New York" bind:value={customDestination} />
				</div>
				<div class="custom-row">
					<div class="time-field">
						<label class="label" for="custom-departure-time">Departure Time</label>
						<input type="time" id="custom-departure-time" class="input" bind:value={customDepartureTime} />
					</div>
					<div class="time-field">
						<label class="label" for="custom-arrival-time">Arrival Time</label>
						<input type="time" id="custom-arrival-time" class="input" bind:value={customArrivalTime} />
					</div>
					<div class="date-field">
						<label class="label" for="custom-arrival-date">Arrival Date</label>
						<input type="date" id="custom-arrival-date" class="input" bind:value={customArrivalDate} min={departureDate} />
					</div>
				</div>
			</div>
		{/if}

		<div class="form-actions">
			<Button variant="secondary" onclick={onclose}>Cancel</Button>
			<Button onclick={addFlight} disabled={!canAdd}>Add Flight</Button>
		</div>
	</div>
</Modal>

<style>
	.flight-search-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.search-row {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-3);
	}

	.date-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-3);
		align-items: end;
	}

	.date-field,
	.time-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.search-button-container {
		padding-bottom: 2px;
	}

	.search-error {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		background: color-mix(in oklch, var(--color-warning), transparent 90%);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.flight-result {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: color-mix(in oklch, var(--color-success), transparent 92%);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-md);
	}

	.result-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.result-airline {
		font-weight: 600;
		flex: 1;
	}

	.result-route {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.route-point {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.route-name {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.route-time {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.route-next-day {
		font-size: 0.625rem;
		color: var(--color-warning);
		font-weight: 600;
	}

	.route-line {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-width: 60px;

		&::before {
			content: '';
			position: absolute;
			left: 0;
			right: 0;
			height: 2px;
			background: var(--border-color);
		}

		&::after {
			content: '';
			position: absolute;
			right: 0;
			width: 0;
			height: 0;
			border-left: 6px solid var(--border-color);
			border-top: 4px solid transparent;
			border-bottom: 4px solid transparent;
		}
	}

	.route-duration {
		background: color-mix(in oklch, var(--color-success), transparent 92%);
		padding: 2px 6px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		z-index: 1;
	}

	.result-price {
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.custom-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.custom-form-hint {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.custom-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-3);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border-color);
	}
</style>
