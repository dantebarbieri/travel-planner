<script lang="ts">
	import type { TransportLeg, TransportMode, GroundTransitSubType, Location } from '$lib/types/travel';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { generateItemId } from '$lib/utils/ids';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAdd: (leg: TransportLeg) => void;
		/** The transport mode being added */
		mode: TransportMode;
		/** For ground_transit, the specific sub-type */
		subType?: GroundTransitSubType;
		defaultDate?: string;
	}

	let { isOpen, onclose, onAdd, mode, subType, defaultDate = '' }: Props = $props();

	// Form state
	// svelte-ignore state_referenced_locally
	let departureDate = $state(defaultDate);
	let departureTime = $state('');
	let arrivalDate = $state('');
	let arrivalTime = $state('');

	// Location state
	let originName = $state('');
	let originAddress = $state('');
	let destinationName = $state('');
	let destinationAddress = $state('');

	// Transport details
	let carrier = $state(''); // e.g., Amtrak, Greyhound
	let routeNumber = $state(''); // e.g., train number, bus route
	let bookingReference = $state('');
	let price = $state<number | undefined>(undefined);
	let currency = $state('USD');
	let notes = $state('');

	// Labels based on mode
	const modeLabels = $derived.by(() => {
		const labels: Record<string, { title: string; carrier: string; route: string; icon: string }> = {
			ground_transit: { title: 'Add Transit', carrier: 'Operator', route: 'Route/Train #', icon: 'transit' },
			car: { title: 'Add Drive', carrier: '', route: '', icon: 'car' },
			taxi: { title: 'Add Taxi', carrier: 'Company', route: '', icon: 'taxi' },
			rideshare: { title: 'Add Rideshare', carrier: 'Service', route: '', icon: 'taxi' },
			ferry: { title: 'Add Ferry', carrier: 'Operator', route: 'Route/Ferry #', icon: 'transit' },
			walking: { title: 'Add Walk', carrier: '', route: '', icon: 'walking' },
			biking: { title: 'Add Bike', carrier: '', route: '', icon: 'bike' }
		};
		return labels[mode] || { title: 'Add Transport', carrier: 'Carrier', route: 'Route', icon: 'car' };
	});

	const subTypeLabels: Record<string, string> = {
		train: 'Train',
		bus: 'Bus',
		metro: 'Metro',
		tram: 'Tram',
		coach: 'Coach'
	};

	const modalTitle = $derived.by(() => {
		if (mode === 'ground_transit' && subType) {
			return `Add ${subTypeLabels[subType] || 'Transit'}`;
		}
		return modeLabels.title;
	});

	// Validation
	const canSubmit = $derived(
		departureDate && originName && destinationName
	);

	function createLocation(name: string, address: string): Location {
		return {
			name,
			address: {
				street: '',
				city: '',
				country: '',
				formatted: address
			},
			geo: { latitude: 0, longitude: 0 }
		};
	}

	function handleSubmit() {
		if (!canSubmit) return;

		const leg: TransportLeg = {
			id: generateItemId(),
			mode: mode,
			groundTransitSubType: mode === 'ground_transit' ? subType : undefined,
			origin: createLocation(originName, originAddress),
			destination: createLocation(destinationName, destinationAddress),
			departureDate,
			departureTime: departureTime || undefined,
			arrivalDate: arrivalDate || departureDate,
			arrivalTime: arrivalTime || undefined,
			carrier: carrier || undefined,
			transitNumber: routeNumber || undefined,
			bookingReference: bookingReference || undefined,
			price: price,
			currency: price ? currency : undefined,
			notes: notes || undefined
		};

		onAdd(leg);
		resetForm();
	}

	function resetForm() {
		departureDate = defaultDate;
		departureTime = '';
		arrivalDate = '';
		arrivalTime = '';
		originName = '';
		originAddress = '';
		destinationName = '';
		destinationAddress = '';
		carrier = '';
		routeNumber = '';
		bookingReference = '';
		price = undefined;
		currency = 'USD';
		notes = '';
	}

	function handleClose() {
		resetForm();
		onclose();
	}

	// Show carrier/route fields for applicable modes
	const showCarrierField = $derived(['ground_transit', 'taxi', 'rideshare', 'ferry'].includes(mode));
	const showRouteField = $derived(['ground_transit', 'ferry'].includes(mode));
</script>

<Modal {isOpen} title={modalTitle} onclose={handleClose}>
	<form class="transport-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<!-- Date/Time Section -->
		<section class="form-section">
			<h3 class="section-title">When</h3>
			<div class="date-row">
				<div class="form-field">
					<label class="label" for="departure-date">Departure Date</label>
					<input
						type="date"
						id="departure-date"
						class="input"
						bind:value={departureDate}
						required
					/>
				</div>
				<div class="form-field">
					<label class="label" for="departure-time">Departure Time</label>
					<input
						type="time"
						id="departure-time"
						class="input"
						bind:value={departureTime}
					/>
				</div>
			</div>
			<div class="date-row">
				<div class="form-field">
					<label class="label" for="arrival-date">Arrival Date</label>
					<input
						type="date"
						id="arrival-date"
						class="input"
						bind:value={arrivalDate}
						min={departureDate}
					/>
				</div>
				<div class="form-field">
					<label class="label" for="arrival-time">Arrival Time</label>
					<input
						type="time"
						id="arrival-time"
						class="input"
						bind:value={arrivalTime}
					/>
				</div>
			</div>
		</section>

		<!-- Locations Section -->
		<section class="form-section">
			<h3 class="section-title">From</h3>
			<div class="form-field">
				<label class="label" for="origin-name">Station / Location Name</label>
				<Input
					id="origin-name"
					placeholder="e.g., Penn Station, Union Station, Airport"
					bind:value={originName}
				/>
			</div>
			<div class="form-field">
				<label class="label" for="origin-address">Address (optional)</label>
				<Input
					id="origin-address"
					placeholder="Full address"
					bind:value={originAddress}
				/>
			</div>

			<h3 class="section-title">To</h3>
			<div class="form-field">
				<label class="label" for="dest-name">Station / Location Name</label>
				<Input
					id="dest-name"
					placeholder="e.g., 30th Street Station, Downtown"
					bind:value={destinationName}
				/>
			</div>
			<div class="form-field">
				<label class="label" for="dest-address">Address (optional)</label>
				<Input
					id="dest-address"
					placeholder="Full address"
					bind:value={destinationAddress}
				/>
			</div>
		</section>

		<!-- Transport Details Section -->
		{#if showCarrierField || showRouteField}
			<section class="form-section">
				<h3 class="section-title">Details</h3>
				{#if showCarrierField}
					<div class="form-field">
						<label class="label" for="carrier">{modeLabels.carrier}</label>
						<Input
							id="carrier"
							placeholder={mode === 'ground_transit' ? 'e.g., Amtrak, SNCF, Deutsche Bahn' : mode === 'rideshare' ? 'e.g., Uber, Lyft' : 'Company name'}
							bind:value={carrier}
						/>
					</div>
				{/if}
				{#if showRouteField}
					<div class="form-field">
						<label class="label" for="route">{modeLabels.route}</label>
						<Input
							id="route"
							placeholder="e.g., Acela 2151, NE Regional 188"
							bind:value={routeNumber}
						/>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Booking & Price Section -->
		<section class="form-section">
			<h3 class="section-title">Booking (Optional)</h3>
			<div class="form-field">
				<label class="label" for="booking-ref">Confirmation Number</label>
				<Input
					id="booking-ref"
					placeholder="e.g., ABC123XYZ"
					bind:value={bookingReference}
				/>
			</div>
			<div class="inline-fields">
				<div class="form-field">
					<label class="label" for="price">Price</label>
					<input
						type="number"
						id="price"
						class="input"
						min="0"
						step="0.01"
						placeholder="0.00"
						bind:value={price}
					/>
				</div>
				<div class="form-field">
					<label class="label" for="currency">Currency</label>
					<select id="currency" class="input" bind:value={currency}>
						<option value="USD">USD ($)</option>
						<option value="EUR">EUR (€)</option>
						<option value="GBP">GBP (£)</option>
						<option value="JPY">JPY (¥)</option>
						<option value="CAD">CAD ($)</option>
						<option value="AUD">AUD ($)</option>
						<option value="CHF">CHF</option>
					</select>
				</div>
			</div>
		</section>

		<!-- Notes Section -->
		<section class="form-section">
			<h3 class="section-title">Notes (Optional)</h3>
			<div class="form-field">
				<textarea
					class="input notes-input"
					placeholder="Platform info, seat preferences, tips..."
					bind:value={notes}
					rows="2"
				></textarea>
			</div>
		</section>

		<!-- Actions -->
		<div class="form-actions">
			<Button type="button" variant="secondary" onclick={handleClose}>
				Cancel
			</Button>
			<Button type="submit" disabled={!canSubmit}>
				<Icon name="add" size={16} />
				Add {mode === 'ground_transit' && subType ? subTypeLabels[subType] : modeLabels.title.replace('Add ', '')}
			</Button>
		</div>
	</form>
</Modal>

<style>
	.transport-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border-color);
	}

	.form-section:last-of-type {
		border-bottom: none;
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.input {
		padding: var(--space-2);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		background: var(--surface-primary);
		color: var(--text-primary);

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}
	}

	.notes-input {
		resize: vertical;
		min-height: 60px;
		font-family: inherit;
	}

	.date-row,
	.inline-fields {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border-color);
	}

	@media (max-width: 480px) {
		.date-row,
		.inline-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
