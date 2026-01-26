<script lang="ts">
	import type { Stay } from '$lib/types/travel';
	import { formatDateShort } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { getMapsUrl } from '$lib/services/mapService';

	interface Props {
		stay: Stay;
		isCheckIn?: boolean;
		isCheckOut?: boolean;
		isEditing?: boolean;
		onclick?: () => void;
	}

	let { stay, isCheckIn = false, isCheckOut = false, isEditing = false, onclick }: Props = $props();

	const stayTypeLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			hotel: 'Hotel',
			airbnb: 'Airbnb',
			vrbo: 'VRBO',
			hostel: 'Hostel',
			custom: 'Accommodation'
		};
		return labels[stay.type] || 'Stay';
	});

	const priceDisplay = $derived.by(() => {
		if (!stay.pricePerNight) return null;
		const symbol = stay.currency === 'EUR' ? '€' : stay.currency === 'JPY' ? '¥' : '$';
		return `${symbol}${stay.pricePerNight}/night`;
	});

	function openInMaps() {
		window.open(getMapsUrl(stay.location), '_blank');
	}
</script>

<div class="item-card" data-kind="stay">
	<div class="card-header">
		<div class="card-icon">
			<Icon name="hotel" size={18} />
		</div>
		<div class="card-badges">
			{#if isCheckIn}
				<Badge variant="success" size="sm">Check-in</Badge>
			{/if}
			{#if isCheckOut}
				<Badge variant="warning" size="sm">Check-out</Badge>
			{/if}
			<Badge size="sm">{stayTypeLabel}</Badge>
		</div>
	</div>

	<div class="card-content">
		<button type="button" class="card-title-btn" onclick={onclick} disabled={!onclick}>
			<h3 class="card-title">{stay.name}</h3>
		</button>

		<div class="card-details">
			<button type="button" class="location-link" onclick={openInMaps} title="Open in Maps">
				<Icon name="location" size={14} />
				<span class="truncate">{stay.location.address.formatted}</span>
			</button>

			<div class="meta-row">
				{#if priceDisplay}
					<span class="price">{priceDisplay}</span>
				{/if}
				<span class="dates">
					{formatDateShort(stay.checkIn)} - {formatDateShort(stay.checkOut)}
				</span>
			</div>

			{#if stay.amenities && stay.amenities.length > 0}
				<div class="amenities">
					{#each stay.amenities.slice(0, 4) as amenity}
						<span class="amenity">{amenity}</span>
					{/each}
					{#if stay.amenities.length > 4}
						<span class="amenity-more">+{stay.amenities.length - 4}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>

</div>

<style>
	.item-card {
		position: relative;
		background: color-mix(in oklch, var(--item-color, var(--color-kind-stay)), white 90%);
		border-left: 4px solid var(--item-color, var(--color-kind-stay));
		border-radius: var(--radius-md);
		padding: var(--space-3);
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
		background: var(--item-color, var(--color-kind-stay));
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
		gap: var(--space-2);
	}

	.card-title-btn {
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		font: inherit;

		&:disabled {
			cursor: default;
		}

		&:hover:not(:disabled) .card-title {
			color: var(--color-primary);
		}
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		transition: color var(--transition-fast);
	}

	.card-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.location-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		background: none;
		border: none;
		padding: 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
		cursor: pointer;
		max-width: 100%;

		&:hover {
			color: var(--color-primary);
		}
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: 0.875rem;
	}

	.price {
		font-weight: 600;
		color: var(--text-primary);
	}

	.dates {
		color: var(--text-secondary);
	}

	.amenities {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.amenity {
		font-size: 0.75rem;
		padding: 2px 6px;
		background: var(--surface-primary);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
	}

	.amenity-more {
		font-size: 0.75rem;
		padding: 2px 6px;
		color: var(--text-tertiary);
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
