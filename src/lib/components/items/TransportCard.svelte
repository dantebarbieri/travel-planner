<script lang="ts">
	import type { TransportLeg } from '$lib/types/travel';
	import { formatTime, formatDuration, formatDateShort } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { getDirectionsUrl } from '$lib/services/mapService';

	interface Props {
		leg: TransportLeg;
		isEditing?: boolean;
		onclick?: () => void;
		onRemove?: () => void;
	}

	let { leg, isEditing = false, onclick, onRemove }: Props = $props();

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

	function openDirections() {
		window.open(getDirectionsUrl(leg.origin, leg.destination, 'driving'), '_blank');
	}
</script>

<div class="item-card" data-kind={isFlight ? 'flight' : 'transport'}>
	<div class="card-header">
		<div class="card-icon">
			<Icon name={modeIcon} size={18} />
		</div>
		<div class="card-badges">
			<Badge size="sm">{modeLabel}</Badge>
			{#if leg.carrier}
				<Badge variant="info" size="sm">{leg.carrier}</Badge>
			{/if}
		</div>
	</div>

	<div class="card-content">
		<div class="route">
			<div class="route-point">
				<span class="route-name">{leg.origin.name}</span>
				{#if leg.departureTime}
					<span class="route-time">{formatTime(leg.departureTime)}</span>
				{/if}
			</div>
			<div class="route-line">
				<span class="route-duration">
					{#if leg.duration}
						{formatDuration(leg.duration)}
					{/if}
				</span>
			</div>
			<div class="route-point">
				<span class="route-name">{leg.destination.name}</span>
				{#if leg.arrivalTime}
					<span class="route-time">{formatTime(leg.arrivalTime)}</span>
				{/if}
			</div>
		</div>

		<div class="card-details">
			<div class="meta-row">
				{#if isFlight && leg.flightNumber}
					<span class="flight-number">{leg.flightNumber}</span>
				{/if}
				{#if leg.distance}
					<span class="distance">{leg.distance} km</span>
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
					{#if leg.seatInfo}
						<span>Seat {leg.seatInfo}</span>
					{/if}
				</div>
			{/if}

			{#if leg.bookingReference}
				<div class="booking-ref">
					Confirmation: <strong>{leg.bookingReference}</strong>
				</div>
			{/if}

			{#if !isLongDistance}
				<button type="button" class="directions-link" onclick={openDirections}>
					Get directions
				</button>
			{/if}
		</div>
	</div>

	{#if isEditing && onRemove}
		<button type="button" class="remove-btn" onclick={onRemove} title="Remove">
			<Icon name="close" size={16} />
		</button>
	{/if}
</div>

<style>
	.item-card {
		position: relative;
		background: color-mix(in oklch, var(--item-color, var(--color-kind-transport)), white 90%);
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
		color: white;
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

	.remove-btn {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		cursor: pointer;

		&:hover {
			background: var(--color-error);
			border-color: var(--color-error);
			color: white;
		}
	}
</style>
