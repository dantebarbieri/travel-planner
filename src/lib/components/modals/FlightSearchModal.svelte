<script lang="ts">
	import type { TransportLeg, Airline, FlightSearchResult, Location } from '$lib/types/travel';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchAutocomplete from '$lib/components/search/SearchAutocomplete.svelte';
	import { flightAdapter } from '$lib/adapters/transport/flightAdapter';
	import { searchAirports, type AirportSearchResult } from '$lib/adapters/airports/airportAdapter';
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
	let customOriginSearch = $state('');
	let customDestinationSearch = $state('');
	let selectedCustomOrigin = $state<AirportSearchResult | null>(null);
	let selectedCustomDestination = $state<AirportSearchResult | null>(null);

	// Time inputs for when route is found but no times (adsbdb doesn't provide times)
	let foundRouteDepartureTime = $state('');
	let foundRouteArrivalTime = $state('');
	let foundRouteArrivalDate = $state('');

	// Route editing state - allows user to correct wrong route data
	let isEditingRoute = $state(false);
	let editedOriginSearch = $state('');
	let editedDestinationSearch = $state('');
	let selectedEditedOrigin = $state<AirportSearchResult | null>(null);
	let selectedEditedDestination = $state<AirportSearchResult | null>(null);

	async function searchAirlines(query: string): Promise<Airline[]> {
		return flightAdapter.searchAirlines(query);
	}

	async function searchAirportsAsync(query: string): Promise<AirportSearchResult[]> {
		// Wrap sync function to match SearchAutocomplete interface
		return Promise.resolve(searchAirports(query, 10));
	}

	async function searchFlight() {
		if (!selectedAirline || !flightNumber || !departureDate) return;
		isSearching = true;
		searchError = '';
		searchResult = null;
		isEditingRoute = false;
		try {
			const result = await flightAdapter.getFlightDetails(
				selectedAirline.code,
				flightNumber,
				departureDate
			);
			if (result) {
				searchResult = result;
				showCustomForm = false;
				// Initialize time inputs for found route
				foundRouteDepartureTime = result.departureTime || '';
				foundRouteArrivalTime = result.arrivalTime || '';
				foundRouteArrivalDate = result.arrivalDate || departureDate;
				// Initialize edit search fields with found values (for display)
				editedOriginSearch = result.origin.name;
				editedDestinationSearch = result.destination.name;
				selectedEditedOrigin = null;
				selectedEditedDestination = null;
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

	function startEditingRoute() {
		isEditingRoute = true;
	}

	function useCustomRoute() {
		// User confirmed the edited route - use selected airport locations if available
		showCustomForm = true;
		selectedCustomOrigin = selectedEditedOrigin;
		selectedCustomDestination = selectedEditedDestination;
		customOriginSearch = editedOriginSearch;
		customDestinationSearch = editedDestinationSearch;
		customDepartureTime = foundRouteDepartureTime;
		customArrivalTime = foundRouteArrivalTime;
		customArrivalDate = foundRouteArrivalDate;
		searchResult = null;
		isEditingRoute = false;
	}

	function addFlight() {
		const airlineCode = selectedAirline?.code || '';
		const airlineName = selectedAirline?.name || airlineSearchValue;

		if (searchResult && !isEditingRoute) {
			// Use search result data with user-provided times if needed
			const leg: TransportLeg = {
				id: generateTransportId(),
				mode: 'flight',
				carrier: searchResult.airline,
				flightNumber: `${searchResult.airlineCode}${searchResult.flightNumber}`,
				origin: searchResult.origin,
				destination: searchResult.destination,
				departureDate: departureDate,
				departureTime: searchResult.departureTime || foundRouteDepartureTime || undefined,
				arrivalDate: searchResult.arrivalDate || foundRouteArrivalDate || departureDate,
				arrivalTime: searchResult.arrivalTime || foundRouteArrivalTime || undefined,
				duration: searchResult.duration,
				price: searchResult.price,
				currency: searchResult.currency
			};
			onAddFlight(leg);
		} else if (showCustomForm) {
			// Use custom entry data - prefer selected airports with coords, fallback to text
			const originLocation = selectedCustomOrigin?.location || buildCustomLocation(customOriginSearch);
			const destLocation = selectedCustomDestination?.location || buildCustomLocation(customDestinationSearch);
			
			if (!customOriginSearch && !selectedCustomOrigin) return;
			if (!customDestinationSearch && !selectedCustomDestination) return;

			const leg: TransportLeg = {
				id: generateTransportId(),
				mode: 'flight',
				carrier: airlineName,
				flightNumber: `${airlineCode}${flightNumber}`,
				origin: originLocation,
				destination: destLocation,
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
			customOriginSearch = '';
			customDestinationSearch = '';
			selectedCustomOrigin = null;
			selectedCustomDestination = null;
			foundRouteDepartureTime = '';
			foundRouteArrivalTime = '';
			foundRouteArrivalDate = '';
			isEditingRoute = false;
			editedOriginSearch = '';
			editedDestinationSearch = '';
			selectedEditedOrigin = null;
			selectedEditedDestination = null;
		} else {
			departureDate = defaultDate;
		}
	});

	// Whether the found route has times from the API
	const routeHasTimes = $derived(searchResult?.departureTime != null);

	const canSearch = $derived(selectedAirline && flightNumber && departureDate);
	const canAddFromSearch = $derived(
		searchResult !== null && !isEditingRoute && (routeHasTimes || foundRouteDepartureTime.trim() !== '')
	);
	const canAddFromCustom = $derived(
		showCustomForm && 
		(selectedCustomOrigin || customOriginSearch.trim()) && 
		(selectedCustomDestination || customDestinationSearch.trim()) && 
		departureDate
	);
	const canAdd = $derived(canAddFromSearch || canAddFromCustom);
</script>

<Modal {isOpen} title="Add Flight" {onclose} size="md">
	<div class="flight-search-form">
		<div class="search-row">
			<div class="search-field airline-field">
				<SearchAutocomplete
					placeholder="Enter airline code (e.g., UA, DL, AA)"
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

		{#if searchResult && !isEditingRoute}
			<div class="flight-result">
				<div class="result-header">
					<Icon name="flight" size={20} />
					<span class="result-airline">{searchResult.airline}</span>
					<Badge size="sm">{searchResult.airlineCode}{searchResult.flightNumber}</Badge>
				</div>
				<div class="result-route">
					<div class="route-point">
						<span class="route-name">{searchResult.origin.name}</span>
						{#if searchResult.departureTime}
							<span class="route-time">{searchResult.departureTime}</span>
						{/if}
					</div>
					<div class="route-line">
						{#if searchResult.duration}
							<span class="route-duration">{formatDuration(searchResult.duration)}</span>
						{:else}
							<span class="route-duration">→</span>
						{/if}
					</div>
					<div class="route-point">
						<span class="route-name">{searchResult.destination.name}</span>
						{#if searchResult.arrivalTime}
							<span class="route-time">{searchResult.arrivalTime}</span>
							{#if searchResult.arrivalDate && searchResult.arrivalDate !== searchResult.departureDate}
								<span class="route-next-day">+1</span>
							{/if}
						{/if}
					</div>
				</div>

				<div class="verify-warning">
					<Icon name="warning" size={14} />
					<span>Please verify this route is correct. Airlines may reuse flight numbers for different routes.</span>
					<button type="button" class="edit-route-link" onclick={startEditingRoute}>
						Wrong route? Edit
					</button>
				</div>

				{#if searchResult.price}
					<div class="result-price">
						{searchResult.currency === 'EUR' ? '€' : searchResult.currency === 'JPY' ? '¥' : '$'}{searchResult.price}
					</div>
				{/if}

				{#if !routeHasTimes}
					<div class="time-inputs">
						<p class="time-inputs-hint">Enter flight times:</p>
						<div class="time-inputs-row">
							<div class="time-field">
								<label class="label" for="found-departure-time">Departure Time</label>
								<input type="time" id="found-departure-time" class="input" bind:value={foundRouteDepartureTime} />
							</div>
							<div class="time-field">
								<label class="label" for="found-arrival-time">Arrival Time</label>
								<input type="time" id="found-arrival-time" class="input" bind:value={foundRouteArrivalTime} />
							</div>
							<div class="date-field">
								<label class="label" for="found-arrival-date">Arrival Date</label>
								<input type="date" id="found-arrival-date" class="input" bind:value={foundRouteArrivalDate} min={departureDate} />
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if isEditingRoute && searchResult}
			<div class="route-edit-form">
				<p class="route-edit-hint">
					<Icon name="warning" size={14} />
					Enter the correct airports for {searchResult.airlineCode}{searchResult.flightNumber}:
				</p>
				<div class="custom-row">
					<div class="airport-field">
						<SearchAutocomplete
							label="Origin Airport"
							placeholder="Search airports (e.g., AUS, Austin)"
							searchFn={searchAirportsAsync}
							renderItem={(item) => ({ name: item.displayName, subtitle: item.iata, icon: 'flight' })}
							getItemId={(item) => item.iata}
							onSelect={(item) => { selectedEditedOrigin = item; }}
							bind:value={editedOriginSearch}
							bind:selectedItem={selectedEditedOrigin}
						/>
					</div>
					<div class="airport-field">
						<SearchAutocomplete
							label="Destination Airport"
							placeholder="Search airports (e.g., SFO, San Francisco)"
							searchFn={searchAirportsAsync}
							renderItem={(item) => ({ name: item.displayName, subtitle: item.iata, icon: 'flight' })}
							getItemId={(item) => item.iata}
							onSelect={(item) => { selectedEditedDestination = item; }}
							bind:value={editedDestinationSearch}
							bind:selectedItem={selectedEditedDestination}
						/>
					</div>
				</div>
				<div class="time-inputs-row">
					<div class="time-field">
						<label class="label" for="edit-departure-time">Departure Time</label>
						<input type="time" id="edit-departure-time" class="input" bind:value={foundRouteDepartureTime} />
					</div>
					<div class="time-field">
						<label class="label" for="edit-arrival-time">Arrival Time</label>
						<input type="time" id="edit-arrival-time" class="input" bind:value={foundRouteArrivalTime} />
					</div>
					<div class="date-field">
						<label class="label" for="edit-arrival-date">Arrival Date</label>
						<input type="date" id="edit-arrival-date" class="input" bind:value={foundRouteArrivalDate} min={departureDate} />
					</div>
				</div>
				<div class="route-edit-actions">
					<Button variant="secondary" onclick={() => isEditingRoute = false}>Cancel</Button>
					<Button onclick={useCustomRoute} disabled={!(selectedEditedOrigin || editedOriginSearch.trim()) || !(selectedEditedDestination || editedDestinationSearch.trim())}>
						Use This Route
					</Button>
				</div>
			</div>
		{/if}

		{#if showCustomForm}
			<div class="custom-form">
				<p class="custom-form-hint">Enter flight details manually:</p>
				<div class="custom-row">
					<div class="airport-field">
						<SearchAutocomplete
							label="Origin Airport"
							placeholder="Search airports (e.g., SFO, San Francisco)"
							searchFn={searchAirportsAsync}
							renderItem={(item) => ({ name: item.displayName, subtitle: item.iata, icon: 'flight' })}
							getItemId={(item) => item.iata}
							onSelect={(item) => { selectedCustomOrigin = item; }}
							bind:value={customOriginSearch}
							bind:selectedItem={selectedCustomOrigin}
						/>
					</div>
					<div class="airport-field">
						<SearchAutocomplete
							label="Destination Airport"
							placeholder="Search airports (e.g., JFK, New York)"
							searchFn={searchAirportsAsync}
							renderItem={(item) => ({ name: item.displayName, subtitle: item.iata, icon: 'flight' })}
							getItemId={(item) => item.iata}
							onSelect={(item) => { selectedCustomDestination = item; }}
							bind:value={customDestinationSearch}
							bind:selectedItem={selectedCustomDestination}
						/>
					</div>
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

	.verify-warning {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: color-mix(in oklch, var(--color-warning), transparent 92%);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.edit-route-link {
		background: none;
		border: none;
		padding: 0;
		color: var(--color-primary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: underline;

		&:hover {
			color: var(--color-primary-dark);
		}
	}

	.route-edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: color-mix(in oklch, var(--color-warning), transparent 95%);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius-md);
	}

	.route-edit-hint {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.875rem;
		color: var(--text-primary);
		margin: 0;
	}

	.route-edit-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		padding-top: var(--space-2);
	}

	.time-inputs {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-top: var(--space-3);
		border-top: 1px dashed var(--border-color);
		margin-top: var(--space-2);
	}

	.time-inputs-hint {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.time-inputs-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
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

	.airport-field {
		min-width: 200px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border-color);
	}
</style>
