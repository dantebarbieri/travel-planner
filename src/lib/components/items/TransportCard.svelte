<script lang="ts">
	import type { TransportLeg } from '$lib/types/travel';
	import { formatTime, formatDuration, formatDateShort, formatDistance, getTimezoneAbbreviation, getTimezoneOffset, calculateRealDuration, parseISODate } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { getDirectionsUrl } from '$lib/services/mapService';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';

	interface Props {
		leg: TransportLeg;
		isDeparture?: boolean;
		isArrival?: boolean;
		isEditing?: boolean;
		onclick?: () => void;
	}

	let { leg, isDeparture = false, isArrival = false, isEditing = false, onclick }: Props = $props();

	// Get resolved distance unit from settings - use $derived.by for explicit dependency tracking
	const distanceUnit = $derived.by(() => {
		const unit = settingsStore.userSettings.distanceUnit;
		return settingsStore.getConcreteDistanceUnit(unit);
	});

	// Get resolved map app from settings
	const mapApp = $derived(settingsStore.getConcreteMapApp(settingsStore.userSettings.preferredMapApp));

	// Get time format preference (12h vs 24h)
	const use24h = $derived(settingsStore.userSettings.timeFormat === '24h');

	const modeIcon = $derived.by(() => {
		const iconMap: Record<string, string> = {
			flight: 'flight',
			ground_transit: 'transit',
			car: 'car',
			taxi: 'taxi',
			rideshare: 'taxi',
			ferry: 'transit',
			walking: 'walking',
			biking: 'bike',
			car_rental: 'car',
			// Legacy modes (for backwards compatibility)
			train: 'transit',
			bus: 'transit',
			subway: 'transit'
		};
		return iconMap[leg.mode] || 'car';
	});

	const modeLabel = $derived.by(() => {
		// For ground_transit, use the sub-type label
		if (leg.mode === 'ground_transit' && leg.groundTransitSubType) {
			const subTypeLabels: Record<string, string> = {
				train: 'Train',
				bus: 'Bus',
				metro: 'Metro',
				tram: 'Tram',
				coach: 'Coach'
			};
			return subTypeLabels[leg.groundTransitSubType] || 'Transit';
		}
		
		const labels: Record<string, string> = {
			flight: 'Flight',
			ground_transit: 'Transit',
			car: 'Drive',
			taxi: 'Taxi',
			rideshare: 'Rideshare',
			ferry: 'Ferry',
			walking: 'Walk',
			biking: 'Bike',
			car_rental: 'Rental Car',
			// Legacy modes (for backwards compatibility)
			train: 'Train',
			bus: 'Bus',
			subway: 'Subway'
		};
		return labels[leg.mode] || 'Transport';
	});

	const priceDisplay = $derived.by(() => {
		if (!leg.price) return null;
		const symbol = leg.currency === 'EUR' ? '€' : leg.currency === 'JPY' ? '¥' : '$';
		return `${symbol}${leg.price}`;
	});

	const isFlight = $derived(leg.mode === 'flight');
	const isCarRental = $derived(leg.mode === 'car_rental');
	const isLongDistance = $derived(['flight', 'ground_transit', 'ferry'].includes(leg.mode) || ['train', 'bus'].includes(leg.mode));

	// Timezone info for departure
	const departureTimezone = $derived(leg.origin.timezone || 'UTC');
	const departureTzAbbr = $derived.by(() => {
		if (!leg.origin.timezone) return null;
		const date = leg.departureDate ? parseISODate(leg.departureDate) : undefined;
		return getTimezoneAbbreviation(leg.origin.timezone, date);
	});
	const departureTzOffset = $derived.by(() => {
		if (!leg.origin.timezone) return null;
		const date = leg.departureDate ? parseISODate(leg.departureDate) : undefined;
		return getTimezoneOffset(leg.origin.timezone, date);
	});

	// Timezone info for arrival
	const arrivalTimezone = $derived(leg.destination.timezone || 'UTC');
	const arrivalTzAbbr = $derived.by(() => {
		if (!leg.destination.timezone) return null;
		const date = leg.arrivalDate ? parseISODate(leg.arrivalDate) : leg.departureDate ? parseISODate(leg.departureDate) : undefined;
		return getTimezoneAbbreviation(leg.destination.timezone, date);
	});
	const arrivalTzOffset = $derived.by(() => {
		if (!leg.destination.timezone) return null;
		const date = leg.arrivalDate ? parseISODate(leg.arrivalDate) : leg.departureDate ? parseISODate(leg.departureDate) : undefined;
		return getTimezoneOffset(leg.destination.timezone, date);
	});

	// Calculate real duration accounting for timezone changes
	const realDuration = $derived.by(() => {
		if (!leg.departureTime || !leg.arrivalTime || !leg.departureDate) return leg.duration;
		if (!leg.origin.timezone || !leg.destination.timezone) return leg.duration;

		const arrivalDate = leg.arrivalDate || leg.departureDate;
		return calculateRealDuration(
			leg.departureTime,
			leg.origin.timezone,
			leg.arrivalTime,
			leg.destination.timezone,
			leg.departureDate,
			arrivalDate
		);
	});

	// Are timezones different?
	const timezonesAreDifferent = $derived(
		leg.origin.timezone &&
		leg.destination.timezone &&
		leg.origin.timezone !== leg.destination.timezone
	);

	function openDirections() {
		window.open(getDirectionsUrl(leg.origin, leg.destination, 'driving', mapApp), '_blank');
	}

	// Display helpers for car rental
	const vehicleTypeLabel = $derived.by(() => {
		if (!leg.vehicleType) return null;
		const labels: Record<string, string> = {
			economy: 'Economy',
			compact: 'Compact',
			midsize: 'Midsize',
			fullsize: 'Full Size',
			sedan: 'Sedan',
			suv: 'SUV',
			minivan: 'Minivan',
			sports_car: 'Sports Car',
			convertible: 'Convertible',
			truck: 'Truck',
			luxury: 'Luxury',
			van: 'Van'
		};
		return labels[leg.vehicleType] || leg.vehicleType;
	});

	const rentalDays = $derived.by(() => {
		if (!leg.departureDate || !leg.arrivalDate) return null;
		const start = new Date(leg.departureDate);
		const end = new Date(leg.arrivalDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays || 1;
	});

	const totalCost = $derived.by(() => {
		if (!leg.dailyRate || !rentalDays) return null;
		return leg.dailyRate * rentalDays;
	});
</script>

<div class="item-card" data-kind={isFlight ? 'flight' : isCarRental ? 'rental' : 'transport'}>
	<div class="card-header">
		<div class="card-icon">
			<Icon name={modeIcon} size={18} />
		</div>
		<div class="card-badges">
			{#if isDeparture && !isCarRental}
				<Badge variant="warning" size="sm">Departure</Badge>
			{/if}
			{#if isArrival && !isCarRental}
				<Badge variant="success" size="sm">Arrival</Badge>
			{/if}
			{#if isCarRental && isDeparture}
				<Badge variant="info" size="sm">Pickup</Badge>
			{/if}
			{#if isCarRental && isArrival}
				<Badge variant="success" size="sm">Return</Badge>
			{/if}
			<Badge size="sm">{modeLabel}</Badge>
			{#if leg.carrier && !isCarRental}
				<Badge variant="info" size="sm">{leg.carrier}</Badge>
			{/if}
			{#if isCarRental && leg.rentalCompany}
				<Badge variant="info" size="sm">{leg.rentalCompany.name}</Badge>
			{/if}
		</div>
	</div>

	<div class="card-content">
		{#if isCarRental}
			<!-- Car Rental view -->
			<div class="rental-info">
				{#if isDeparture}
					<div class="rental-location">
						<span class="rental-label">Pickup</span>
						<span class="rental-name">{leg.pickupLocation?.name || leg.origin.name}</span>
						{#if leg.departureTime}
							<span class="rental-time">{formatTime(leg.departureTime, use24h)}</span>
						{/if}
					</div>
				{:else if isArrival}
					<div class="rental-location">
						<span class="rental-label">Return</span>
						<span class="rental-name">{leg.returnLocation?.name || leg.destination.name}</span>
						{#if leg.arrivalTime}
							<span class="rental-time">{formatTime(leg.arrivalTime, use24h)}</span>
						{/if}
					</div>
				{:else}
					<div class="rental-location">
						<span class="rental-label">Pickup</span>
						<span class="rental-name">{leg.pickupLocation?.name || leg.origin.name}</span>
					</div>
					<div class="rental-arrow">→</div>
					<div class="rental-location">
						<span class="rental-label">Return</span>
						<span class="rental-name">{leg.returnLocation?.name || leg.destination.name}</span>
					</div>
				{/if}

				{#if vehicleTypeLabel || leg.vehicleTags}
					<div class="rental-vehicle">
						{#if vehicleTypeLabel}
							<Badge size="sm">{vehicleTypeLabel}</Badge>
						{/if}
						{#if leg.vehicleTags?.isElectric}
							<Badge size="sm" variant="success">EV</Badge>
						{/if}
						{#if leg.vehicleTags?.isHybrid}
							<Badge size="sm" variant="success">Hybrid</Badge>
						{/if}
						{#if leg.vehicleTags?.transmission === 'automatic'}
							<Badge size="sm">Auto</Badge>
						{/if}
						{#if leg.vehicleTags?.transmission === 'manual'}
							<Badge size="sm">Manual</Badge>
						{/if}
						{#if leg.vehicleTags?.seatCount}
							<Badge size="sm">{leg.vehicleTags.seatCount} seats</Badge>
						{/if}
						{#if leg.vehicleTags?.baggageCapacity}
							<Badge size="sm">{leg.vehicleTags.baggageCapacity} bags</Badge>
						{/if}
					</div>
				{/if}
			</div>

			{#if leg.bookingReference || leg.dailyRate}
				<div class="rental-details">
					{#if leg.bookingReference}
						<div class="detail-item">
							<span class="detail-label">Confirmation</span>
							<span class="detail-value booking-ref">{leg.bookingReference}</span>
						</div>
					{/if}
					{#if leg.dailyRate && rentalDays}
						<div class="detail-item">
							<span class="detail-label">Cost</span>
							<span class="detail-value">
								{#if leg.currency === 'EUR'}€{:else if leg.currency === 'JPY'}¥{:else}${/if}{leg.dailyRate}/day × {rentalDays} days = 
								<strong>{#if leg.currency === 'EUR'}€{:else if leg.currency === 'JPY'}¥{:else}${/if}{totalCost}</strong>
							</span>
						</div>
					{/if}
				</div>
			{/if}
		{:else if isDeparture || isArrival}
			<!-- Focused view: emphasize the relevant airport -->
			<div class="focused-route">
				{#if isDeparture}
					<div class="primary-point">
						<span class="primary-label">From</span>
						<span class="primary-name">{leg.origin.name}</span>
						{#if leg.departureTime}
							<span class="primary-time">
								{formatTime(leg.departureTime, use24h)}
								{#if departureTzAbbr}
									<span class="timezone" title={departureTzOffset || ''}>{departureTzAbbr}</span>
								{/if}
							</span>
						{/if}
					</div>
					<div class="secondary-point">
						<span class="secondary-label">To</span>
						<span class="secondary-name">{leg.destination.name}</span>
					</div>
				{:else}
					<div class="primary-point">
						<span class="primary-label">To</span>
						<span class="primary-name">{leg.destination.name}</span>
						{#if leg.arrivalTime}
							<span class="primary-time">
								{formatTime(leg.arrivalTime, use24h)}
								{#if arrivalTzAbbr}
									<span class="timezone" title={arrivalTzOffset || ''} class:different={timezonesAreDifferent}>{arrivalTzAbbr}</span>
								{/if}
							</span>
						{/if}
					</div>
					<div class="secondary-point">
						<span class="secondary-label">From</span>
						<span class="secondary-name">{leg.origin.name}</span>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Full route view (non-flight or unknown state) -->
			<div class="route">
				<div class="route-point">
					<span class="route-name">{leg.origin.name}</span>
					{#if leg.departureTime}
						<span class="route-time">
							{formatTime(leg.departureTime, use24h)}
							{#if departureTzAbbr}
								<span class="timezone" title={departureTzOffset || ''}>{departureTzAbbr}</span>
							{/if}
						</span>
					{/if}
				</div>
				<div class="route-line">
					<span class="route-duration">
						{#if realDuration}
							{formatDuration(realDuration)}
						{/if}
					</span>
				</div>
				<div class="route-point">
					<span class="route-name">{leg.destination.name}</span>
					{#if leg.arrivalTime}
						<span class="route-time">
							{formatTime(leg.arrivalTime, use24h)}
							{#if arrivalTzAbbr}
								<span class="timezone" title={arrivalTzOffset || ''} class:different={timezonesAreDifferent}>{arrivalTzAbbr}</span>
							{/if}
						</span>
					{/if}
				</div>
			</div>
		{/if}

		<div class="card-details">
			<div class="meta-row">
				{#if isFlight && leg.flightNumber}
					<span class="flight-number">{leg.flightNumber}</span>
				{/if}
				{#if leg.distance}
					<span class="distance">{formatDistance(leg.distance, distanceUnit)}</span>
				{/if}
				{#if priceDisplay}
					<span class="price">{priceDisplay}</span>
				{/if}
			</div>

			{#if isFlight}
				<div class="flight-details">
					{#if leg.terminal}
						<span>Terminal {leg.terminal}</span>
					{/if}
					{#if leg.gate}
						<span>Gate {leg.gate}</span>
					{/if}
					{#if leg.seats && leg.seats.length > 0}
						<span class="seats-info">
							{#each leg.seats as seat, i}
								{#if i > 0}, {/if}
								{seat.row}{seat.seat}{#if seat.position} ({seat.position}){/if}{#if seat.passenger} - {seat.passenger}{/if}
							{/each}
						</span>
					{:else if leg.seatInfo}
						<span>Seat {leg.seatInfo}</span>
					{/if}
				</div>
			{/if}

			{#if leg.bookingReference}
				<div class="booking-ref">
					Confirmation: <strong>{leg.bookingReference}</strong>
				</div>
			{/if}

			{#if leg.notes}
				<div class="notes">
					{leg.notes}
				</div>
			{/if}

			{#if !isLongDistance}
				<button type="button" class="directions-link" onclick={openDirections}>
					Get directions
				</button>
			{/if}
		</div>
	</div>

</div>

<style>
	.item-card {
		position: relative;
		background: color-mix(in oklch, var(--item-color, var(--color-kind-transport)), var(--item-bg-mix, white) var(--item-bg-mix-amount, 90%));
		border-left: 4px solid var(--item-color, var(--color-kind-transport));
		border-radius: var(--radius-md);
		padding: var(--space-3);

		&[data-kind='flight'] {
			--item-color: var(--color-kind-flight);
		}
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-2);
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--item-color, var(--color-kind-transport));
		color: var(--text-inverse);
		border-radius: var(--radius-md);
	}

	.card-badges {
		display: flex;
		gap: var(--space-1);
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.route {
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
		font-weight: 600;
		font-size: 0.875rem;
	}

	.route-time {
		font-size: 0.75rem;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.timezone {
		font-size: 0.625rem;
		color: var(--text-tertiary);
		cursor: help;
		padding: 1px 3px;
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);

		&.different {
			color: var(--color-warning);
			background: color-mix(in oklch, var(--color-warning), transparent 90%);
		}
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
		background: var(--surface-primary);
		padding: 2px 6px;
		font-size: 0.75rem;
		color: var(--text-secondary);
		z-index: 1;
	}

	.card-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.meta-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-size: 0.875rem;
	}

	.flight-number {
		font-weight: 600;
		color: var(--text-primary);
	}

	.distance {
		color: var(--text-secondary);
	}

	.price {
		font-weight: 600;
		color: var(--text-primary);
	}

	.flight-details {
		display: flex;
		gap: var(--space-3);
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.booking-ref {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.notes {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-style: italic;
		padding: var(--space-2);
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
	}

	.seats-info {
		font-weight: 500;
	}

	.directions-link {
		display: inline-block;
		background: none;
		border: none;
		padding: 0;
		font-size: 0.75rem;
		color: var(--color-primary);
		cursor: pointer;
		text-decoration: underline;

		&:hover {
			color: var(--color-primary-dark);
		}
	}

	/* Focused route view (departure/arrival) */
	.focused-route {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.primary-point {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.primary-label {
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.primary-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.primary-time {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.secondary-point {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding-top: var(--space-1);
		border-top: 1px dashed var(--border-color);
	}

	.secondary-label {
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.secondary-name {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	/* Car Rental Styles */
	.item-card[data-kind='rental'] {
		--item-color: oklch(55% 0.15 200);
	}

	.rental-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.rental-location {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.rental-label {
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.rental-name {
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--text-primary);
	}

	.rental-time {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.rental-arrow {
		font-size: 1rem;
		color: var(--text-tertiary);
		padding: var(--space-1) 0;
	}

	.rental-vehicle {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		padding-top: var(--space-2);
	}

	.rental-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border-color);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.detail-label {
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
	}

	.detail-value {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.detail-value.booking-ref {
		font-family: var(--font-mono, monospace);
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: 0.05em;
	}
</style>
