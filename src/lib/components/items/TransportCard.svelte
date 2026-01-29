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

	const modeIcon = $derived.by(() => {
		const iconMap: Record<string, string> = {
			flight: 'flight',
			train: 'transit',
			bus: 'transit',
			car: 'car',
			taxi: 'taxi',
			rideshare: 'taxi',
			ferry: 'transit',
			subway: 'transit',
			walking: 'walking',
			biking: 'bike'
		};
		return iconMap[leg.mode] || 'car';
	});

	const modeLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			flight: 'Flight',
			train: 'Train',
			bus: 'Bus',
			car: 'Drive',
			taxi: 'Taxi',
			rideshare: 'Rideshare',
			ferry: 'Ferry',
			subway: 'Subway',
			walking: 'Walk',
			biking: 'Bike'
		};
		return labels[leg.mode] || 'Transport';
	});

	const priceDisplay = $derived.by(() => {
		if (!leg.price) return null;
		const symbol = leg.currency === 'EUR' ? '€' : leg.currency === 'JPY' ? '¥' : '$';
		return `${symbol}${leg.price}`;
	});

	const isFlight = $derived(leg.mode === 'flight');
	const isLongDistance = $derived(['flight', 'train', 'bus', 'ferry'].includes(leg.mode));

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
</script>

<div class="item-card" data-kind={isFlight ? 'flight' : 'transport'}>
	<div class="card-header">
		<div class="card-icon">
			<Icon name={modeIcon} size={18} />
		</div>
		<div class="card-badges">
			{#if isDeparture}
				<Badge variant="warning" size="sm">Departure</Badge>
			{/if}
			{#if isArrival}
				<Badge variant="success" size="sm">Arrival</Badge>
			{/if}
			<Badge size="sm">{modeLabel}</Badge>
			{#if leg.carrier}
				<Badge variant="info" size="sm">{leg.carrier}</Badge>
			{/if}
		</div>
	</div>

	<div class="card-content">
		{#if isDeparture || isArrival}
			<!-- Focused view: emphasize the relevant airport -->
			<div class="focused-route">
				{#if isDeparture}
					<div class="primary-point">
						<span class="primary-label">From</span>
						<span class="primary-name">{leg.origin.name}</span>
						{#if leg.departureTime}
							<span class="primary-time">
								{formatTime(leg.departureTime)}
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
								{formatTime(leg.arrivalTime)}
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
							{formatTime(leg.departureTime)}
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
							{formatTime(leg.arrivalTime)}
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
</style>
