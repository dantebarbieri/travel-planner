<script lang="ts">
	import type {
		TransportLeg,
		Location,
		VehicleType,
		VehicleTags,
		RentalCompany,
		TransmissionType
	} from '$lib/types/travel';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { generateItemId } from '$lib/utils/ids';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onAdd: (leg: TransportLeg) => void;
		defaultDate?: string;
		defaultLocation?: Location;
	}

	let { isOpen, onclose, onAdd, defaultDate = '', defaultLocation }: Props = $props();

	// Form state
	let pickupDate = $state(defaultDate);
	let pickupTime = $state('10:00');
	let returnDate = $state('');
	let returnTime = $state('10:00');

	// Location state
	let pickupLocationName = $state(defaultLocation?.name || '');
	let pickupLocationAddress = $state(defaultLocation?.address.formatted || '');
	let returnLocationName = $state('');
	let returnLocationAddress = $state('');
	let returnSameAsPickup = $state(true);

	// Company state
	let rentalCompanyName = $state('');
	let rentalCompanyCode = $state('');
	let bookingReference = $state('');

	// Vehicle state
	let vehicleType = $state<VehicleType>('midsize');
	let isElectric = $state(false);
	let isHybrid = $state(false);
	let transmission = $state<TransmissionType>('automatic');
	let seatCount = $state<number | undefined>(5);
	let baggageCapacity = $state<number | undefined>(2);
	let hasGPS = $state(false);
	let hasChildSeat = $state(false);

	// Pricing
	let dailyRate = $state<number | undefined>(undefined);
	let currency = $state('USD');

	// Notes
	let notes = $state('');

	const vehicleTypeOptions: Array<{ value: VehicleType; label: string }> = [
		{ value: 'economy', label: 'Economy' },
		{ value: 'compact', label: 'Compact' },
		{ value: 'midsize', label: 'Midsize' },
		{ value: 'fullsize', label: 'Full Size' },
		{ value: 'sedan', label: 'Sedan' },
		{ value: 'suv', label: 'SUV' },
		{ value: 'minivan', label: 'Minivan' },
		{ value: 'sports_car', label: 'Sports Car' },
		{ value: 'convertible', label: 'Convertible' },
		{ value: 'truck', label: 'Truck' },
		{ value: 'luxury', label: 'Luxury' },
		{ value: 'van', label: 'Van' }
	];

	const rentalCompanies: RentalCompany[] = [
		{ name: 'Enterprise', code: 'ENTERPRISE' },
		{ name: 'Hertz', code: 'HERTZ' },
		{ name: 'Avis', code: 'AVIS' },
		{ name: 'Budget', code: 'BUDGET' },
		{ name: 'National', code: 'NATIONAL' },
		{ name: 'Alamo', code: 'ALAMO' },
		{ name: 'Dollar', code: 'DOLLAR' },
		{ name: 'Thrifty', code: 'THRIFTY' },
		{ name: 'Sixt', code: 'SIXT' },
		{ name: 'Europcar', code: 'EUROPCAR' }
	];

	// Validation
	const canSubmit = $derived(
		pickupDate &&
			pickupTime &&
			returnDate &&
			pickupLocationName &&
			(returnSameAsPickup || returnLocationName) &&
			new Date(returnDate) >= new Date(pickupDate)
	);

	function createPickupLocation(): Location {
		return {
			name: pickupLocationName,
			address: {
				street: '',
				city: '',
				country: '',
				formatted: pickupLocationAddress
			}
		};
	}

	function createReturnLocation(): Location {
		if (returnSameAsPickup) {
			return createPickupLocation();
		}
		return {
			name: returnLocationName,
			address: {
				street: '',
				city: '',
				country: '',
				formatted: returnLocationAddress
			}
		};
	}

	function handleSubmit() {
		if (!canSubmit) return;

		const vehicleTags: VehicleTags = {
			isElectric,
			isHybrid,
			transmission,
			seatCount,
			baggageCapacity,
			hasGPS,
			hasChildSeat
		};

		const rentalCompany: RentalCompany | undefined = rentalCompanyName
			? {
					name: rentalCompanyName,
					code: rentalCompanyCode || undefined
				}
			: undefined;

		const leg: TransportLeg = {
			id: generateItemId(),
			mode: 'car_rental',
			origin: createPickupLocation(),
			destination: createReturnLocation(),
			departureDate: pickupDate,
			departureTime: pickupTime,
			arrivalDate: returnDate,
			arrivalTime: returnTime,
			pickupLocation: createPickupLocation(),
			returnLocation: createReturnLocation(),
			rentalCompany,
			vehicleType,
			vehicleTags,
			bookingReference: bookingReference || undefined,
			dailyRate,
			currency,
			notes: notes || undefined
		};

		onAdd(leg);
		resetForm();
	}

	function resetForm() {
		pickupDate = defaultDate;
		pickupTime = '10:00';
		returnDate = '';
		returnTime = '10:00';
		pickupLocationName = defaultLocation?.name || '';
		pickupLocationAddress = defaultLocation?.address.formatted || '';
		returnLocationName = '';
		returnLocationAddress = '';
		returnSameAsPickup = true;
		rentalCompanyName = '';
		rentalCompanyCode = '';
		bookingReference = '';
		vehicleType = 'midsize';
		isElectric = false;
		isHybrid = false;
		transmission = 'automatic';
		seatCount = 5;
		baggageCapacity = 2;
		hasGPS = false;
		hasChildSeat = false;
		dailyRate = undefined;
		currency = 'USD';
		notes = '';
	}

	function handleClose() {
		resetForm();
		onclose();
	}

	function selectCompany(company: RentalCompany) {
		rentalCompanyName = company.name;
		rentalCompanyCode = company.code || '';
	}
</script>

<Modal {isOpen} title="Add Car Rental" onclose={handleClose} size="lg">
	<form class="car-rental-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<!-- Dates Section -->
		<section class="form-section">
			<h3 class="section-title">Rental Period</h3>
			<div class="date-row">
				<div class="form-field">
					<label class="label" for="pickup-date">Pickup Date</label>
					<input
						type="date"
						id="pickup-date"
						class="input"
						bind:value={pickupDate}
						required
					/>
				</div>
				<div class="form-field">
					<label class="label" for="pickup-time">Pickup Time</label>
					<input
						type="time"
						id="pickup-time"
						class="input"
						bind:value={pickupTime}
						required
					/>
				</div>
			</div>
			<div class="date-row">
				<div class="form-field">
					<label class="label" for="return-date">Return Date</label>
					<input
						type="date"
						id="return-date"
						class="input"
						bind:value={returnDate}
						min={pickupDate}
						required
					/>
				</div>
				<div class="form-field">
					<label class="label" for="return-time">Return Time</label>
					<input
						type="time"
						id="return-time"
						class="input"
						bind:value={returnTime}
						required
					/>
				</div>
			</div>
		</section>

		<!-- Locations Section -->
		<section class="form-section">
			<h3 class="section-title">Pickup Location</h3>
			<div class="form-field">
				<label class="label" for="pickup-name">Location Name</label>
				<Input
					id="pickup-name"
					placeholder="e.g., LAX Airport, Downtown Office"
					bind:value={pickupLocationName}
				/>
			</div>
			<div class="form-field">
				<label class="label" for="pickup-address">Address (optional)</label>
				<Input
					id="pickup-address"
					placeholder="Full address"
					bind:value={pickupLocationAddress}
				/>
			</div>

			<div class="checkbox-row">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={returnSameAsPickup} />
					<span>Return to same location</span>
				</label>
			</div>

			{#if !returnSameAsPickup}
				<h3 class="section-title">Return Location</h3>
				<div class="form-field">
					<label class="label" for="return-name">Location Name</label>
					<Input
						id="return-name"
						placeholder="e.g., SFO Airport"
						bind:value={returnLocationName}
					/>
				</div>
				<div class="form-field">
					<label class="label" for="return-address">Address (optional)</label>
					<Input
						id="return-address"
						placeholder="Full address"
						bind:value={returnLocationAddress}
					/>
				</div>
			{/if}
		</section>

		<!-- Rental Company Section -->
		<section class="form-section">
			<h3 class="section-title">Rental Company</h3>
			<div class="company-grid">
				{#each rentalCompanies as company}
					<button
						type="button"
						class="company-chip"
						class:selected={rentalCompanyName === company.name}
						onclick={() => selectCompany(company)}
					>
						{company.name}
					</button>
				{/each}
			</div>
			<div class="form-field">
				<label class="label" for="company-name">Or enter custom company</label>
				<Input
					id="company-name"
					placeholder="Company name"
					bind:value={rentalCompanyName}
				/>
			</div>
			<div class="form-field">
				<label class="label" for="booking-ref">Confirmation Number</label>
				<Input
					id="booking-ref"
					placeholder="e.g., ABC123XYZ"
					bind:value={bookingReference}
				/>
			</div>
		</section>

		<!-- Vehicle Section -->
		<section class="form-section">
			<h3 class="section-title">Vehicle</h3>
			<div class="form-field">
				<label class="label" for="vehicle-type">Vehicle Type</label>
				<select id="vehicle-type" class="input" bind:value={vehicleType}>
					{#each vehicleTypeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="tags-grid">
				<label class="tag-checkbox">
					<input type="checkbox" bind:checked={isElectric} />
					<span class="tag-label"><Icon name="lightning" size={14} /> EV</span>
				</label>
				<label class="tag-checkbox">
					<input type="checkbox" bind:checked={isHybrid} />
					<span class="tag-label">Hybrid</span>
				</label>
				<label class="tag-checkbox">
					<input type="checkbox" bind:checked={hasGPS} />
					<span class="tag-label"><Icon name="location" size={14} /> GPS</span>
				</label>
				<label class="tag-checkbox">
					<input type="checkbox" bind:checked={hasChildSeat} />
					<span class="tag-label">Child Seat</span>
				</label>
			</div>

			<div class="inline-fields">
				<div class="form-field">
					<label class="label" for="transmission">Transmission</label>
					<select id="transmission" class="input" bind:value={transmission}>
						<option value="automatic">Automatic</option>
						<option value="manual">Manual</option>
					</select>
				</div>
				<div class="form-field">
					<label class="label" for="seats">Seats</label>
					<input
						type="number"
						id="seats"
						class="input"
						min="1"
						max="15"
						bind:value={seatCount}
					/>
				</div>
				<div class="form-field">
					<label class="label" for="baggage">Large Bags</label>
					<input
						type="number"
						id="baggage"
						class="input"
						min="0"
						max="10"
						bind:value={baggageCapacity}
					/>
				</div>
			</div>
		</section>

		<!-- Pricing Section -->
		<section class="form-section">
			<h3 class="section-title">Pricing (Optional)</h3>
			<div class="inline-fields">
				<div class="form-field">
					<label class="label" for="daily-rate">Daily Rate</label>
					<input
						type="number"
						id="daily-rate"
						class="input"
						min="0"
						step="0.01"
						placeholder="0.00"
						bind:value={dailyRate}
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
					placeholder="Additional notes about this rental..."
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
				Add Car Rental
			</Button>
		</div>
	</form>
</Modal>

<style>
	.car-rental-form {
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

	.inline-fields {
		grid-template-columns: repeat(3, 1fr);
	}

	.checkbox-row {
		margin-top: var(--space-2);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.company-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.company-chip {
		padding: var(--space-1) var(--space-2);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--text-primary);
		cursor: pointer;
		transition: all var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary);
		}

		&.selected {
			background: var(--color-primary);
			border-color: var(--color-primary);
			color: white;
		}
	}

	.tags-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.tag-checkbox {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		cursor: pointer;

		input {
			display: none;
		}

		.tag-label {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			padding: var(--space-1) var(--space-2);
			background: var(--surface-secondary);
			border: 1px solid var(--border-color);
			border-radius: var(--radius-sm);
			font-size: 0.75rem;
			transition: all var(--transition-fast);
		}

		input:checked + .tag-label {
			background: oklch(90% 0.1 145);
			border-color: oklch(65% 0.15 145);
			color: oklch(35% 0.1 145);
		}
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
