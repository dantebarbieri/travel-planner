<script lang="ts">
	import type { TransportLeg, TrainBusSearchResult, Location } from '$lib/types/travel';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { fakeTrainBusAdapter } from '$lib/adapters/transport/trainBusAdapter';
	import { generateTransportId } from '$lib/utils/ids';
	import { formatDuration } from '$lib/utils/dates';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAddTransport: (leg: TransportLeg) => void;
		mode: 'train' | 'bus';
		cityLocation?: Location;
		defaultDate?: string;
	}

	let { isOpen, onclose, onAddTransport, mode, cityLocation, defaultDate = '' }: Props = $props();

	let searchQuery = $state('');
	let departureDate = $state('');
	let isSearching = $state(false);
	let searchResults = $state<TrainBusSearchResult[]>([]);
	let selectedRoute = $state<TrainBusSearchResult | null>(null);
	let searchError = $state('');

	// Custom entry fields
	let showCustomForm = $state(false);
	let customCarrier = $state('');
	let customRouteNumber = $state('');
	let customOrigin = $state('');
	let customDestination = $state('');
	let customDepartureTime = $state('');
	let customArrivalTime = $state('');
	let customArrivalDate = $state('');

	const modeLabel = $derived(mode === 'train' ? 'Train' : 'Bus');

	async function searchRoutes() {
		if (!departureDate) return;
		isSearching = true;
		searchError = '';
		searchResults = [];
		selectedRoute = null;
		try {
			const results = await fakeTrainBusAdapter.searchRoutes({
				query: searchQuery,
				origin: cityLocation,
				departureDate,
				mode
			});
			if (results.length > 0) {
				searchResults = results;
			} else {
				searchError = `No ${mode} routes found. You can enter the details manually below.`;
				showCustomForm = true;
				customArrivalDate = departureDate;
			}
		} finally {
			isSearching = false;
		}
	}

	function selectRoute(route: TrainBusSearchResult) {
		selectedRoute = route;
		showCustomForm = false;
	}

	function buildCustomLocation(name: string): Location {
		return {
			name,
			address: { street: '', city: '', country: '', formatted: name },
			geo: { latitude: 0, longitude: 0 }
		};
	}

	function addTransport() {
		if (selectedRoute) {
			const leg: TransportLeg = {
				id: generateTransportId(),
				mode: mode,
				carrier: selectedRoute.carrier,
				trainNumber: mode === 'train' ? selectedRoute.routeNumber : undefined,
				origin: selectedRoute.origin,
				destination: selectedRoute.destination,
				departureDate: selectedRoute.departureDate,
				departureTime: selectedRoute.departureTime,
				arrivalDate: selectedRoute.arrivalDate,
				arrivalTime: selectedRoute.arrivalTime,
				duration: selectedRoute.duration,
				price: selectedRoute.price,
				currency: selectedRoute.currency
			};
			onAddTransport(leg);
		} else if (showCustomForm && customOrigin && customDestination && customCarrier) {
			const leg: TransportLeg = {
				id: generateTransportId(),
				mode: mode,
				carrier: customCarrier,
				trainNumber: mode === 'train' && customRouteNumber ? customRouteNumber : undefined,
				origin: buildCustomLocation(customOrigin),
				destination: buildCustomLocation(customDestination),
				departureDate: departureDate,
				departureTime: customDepartureTime || undefined,
				arrivalDate: customArrivalDate || departureDate,
				arrivalTime: customArrivalTime || undefined
			};
			onAddTransport(leg);
		}
		onclose();
	}

	// Reset on close
	$effect(() => {
		if (!isOpen) {
			searchQuery = '';
			departureDate = defaultDate;
			searchResults = [];
			selectedRoute = null;
			searchError = '';
			showCustomForm = false;
			customCarrier = '';
			customRouteNumber = '';
			customOrigin = '';
			customDestination = '';
			customDepartureTime = '';
			customArrivalTime = '';
			customArrivalDate = '';
		} else {
			departureDate = defaultDate;
		}
	});

	const canSearch = $derived(departureDate);
	const canAddFromSelection = $derived(selectedRoute !== null);
	const canAddFromCustom = $derived(
		showCustomForm && customOrigin.trim() && customDestination.trim() && customCarrier.trim() && departureDate
	);
	const canAdd = $derived(canAddFromSelection || canAddFromCustom);
</script>

<Modal {isOpen} title="Add {modeLabel}" {onclose} size="md">
	<div class="transport-search-form">
		<div class="search-row">
			<div class="search-field">
				<Input
					label="Search Routes"
					placeholder="Search by carrier, route, or destination..."
					bind:value={searchQuery}
				/>
			</div>
		</div>

		<div class="date-row">
			<div class="date-field">
				<label class="label" for="transport-date">Departure Date</label>
				<input type="date" id="transport-date" class="input" bind:value={departureDate} />
			</div>
			<div class="search-button-container">
				<Button onclick={searchRoutes} disabled={!canSearch || isSearching}>
					{isSearching ? 'Searching...' : 'Search Routes'}
				</Button>
			</div>
		</div>

		{#if searchError}
			<div class="search-error">
				<Icon name="warning" size={16} />
				<span>{searchError}</span>
			</div>
		{/if}

		{#if searchResults.length > 0}
			<div class="results-list">
				<p class="results-label">Select a route:</p>
				{#each searchResults as route}
					<button
						type="button"
						class="route-card"
						class:selected={selectedRoute === route}
						onclick={() => selectRoute(route)}
					>
						<div class="route-header">
							<span class="route-carrier">{route.carrier}</span>
							{#if route.routeNumber}
								<Badge size="sm">{route.routeNumber}</Badge>
							{/if}
							{#if route.routeName}
								<span class="route-name">{route.routeName}</span>
							{/if}
						</div>
						<div class="route-details">
							<div class="route-point">
								<span class="station-name">{route.origin.name}</span>
								<span class="route-time">{route.departureTime}</span>
							</div>
							<div class="route-arrow">
								<span class="route-duration">{formatDuration(route.duration)}</span>
							</div>
							<div class="route-point">
								<span class="station-name">{route.destination.name}</span>
								<span class="route-time">{route.arrivalTime}</span>
								{#if route.arrivalDate !== route.departureDate}
									<span class="next-day">+1</span>
								{/if}
							</div>
						</div>
						{#if route.price}
							<div class="route-price">
								{route.currency === 'EUR' ? '€' : route.currency === 'JPY' ? '¥' : '$'}{route.price}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		<button
			type="button"
			class="custom-toggle"
			onclick={() => {
				showCustomForm = !showCustomForm;
				if (showCustomForm) {
					selectedRoute = null;
					customArrivalDate = departureDate;
				}
			}}
		>
			{showCustomForm ? 'Search instead' : "Can't find it? Add custom entry"}
		</button>

		{#if showCustomForm}
			<div class="custom-form">
				<p class="custom-form-hint">Enter {modeLabel.toLowerCase()} details manually:</p>
				<div class="custom-row">
					<Input label="Carrier/Company" placeholder="e.g. Amtrak, Greyhound" bind:value={customCarrier} />
					{#if mode === 'train'}
						<Input label="Route/Train Number" placeholder="e.g. 101" bind:value={customRouteNumber} />
					{/if}
				</div>
				<div class="custom-row">
					<Input label="Origin Station" placeholder="e.g. Penn Station" bind:value={customOrigin} />
					<Input label="Destination Station" placeholder="e.g. Union Station" bind:value={customDestination} />
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
			<Button onclick={addTransport} disabled={!canAdd}>Add {modeLabel}</Button>
		</div>
	</div>
</Modal>

<style>
	.transport-search-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.search-row {
		display: flex;
		gap: var(--space-3);
	}

	.search-field {
		flex: 1;
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

	.results-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-height: 300px;
		overflow-y: auto;
	}

	.results-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin: 0;
	}

	.route-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--surface-secondary);
		border: 2px solid var(--border-color);
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
			border-color: var(--color-success);
			background: color-mix(in oklch, var(--color-success), transparent 92%);
		}
	}

	.route-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.route-carrier {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.route-name {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.route-details {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.route-point {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.station-name {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.route-time {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.next-day {
		font-size: 0.625rem;
		color: var(--color-warning);
		font-weight: 600;
	}

	.route-arrow {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-width: 40px;

		&::before {
			content: '';
			position: absolute;
			left: 0;
			right: 0;
			height: 1px;
			background: var(--border-color);
		}
	}

	.route-duration {
		background: var(--surface-secondary);
		padding: 2px 4px;
		font-size: 0.625rem;
		color: var(--text-tertiary);
		z-index: 1;
	}

	.route-card.selected .route-duration {
		background: color-mix(in oklch, var(--color-success), transparent 92%);
	}

	.route-price {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--text-primary);
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
