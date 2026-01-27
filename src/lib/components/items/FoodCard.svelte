<script lang="ts">
	import type { FoodVenue, MealType } from '$lib/types/travel';
	import { formatTime } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { getMapsUrl } from '$lib/services/mapService';

	interface Props {
		venue: FoodVenue;
		mealSlot?: MealType;
		isEditing?: boolean;
		onclick?: () => void;
	}

	let { venue, mealSlot, isEditing = false, onclick }: Props = $props();

	const mealLabel = $derived.by(() => {
		const labels: Record<MealType, string> = {
			breakfast: 'Breakfast',
			brunch: 'Brunch',
			lunch: 'Lunch',
			tea: 'Tea',
			dinner: 'Dinner',
			dessert: 'Dessert',
			drinks: 'Drinks'
		};
		return mealSlot ? labels[mealSlot] : null;
	});

	const venueTypeLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			restaurant: 'Restaurant',
			cafe: 'Café',
			bar: 'Bar',
			bakery: 'Bakery',
			street_food: 'Street Food',
			food_market: 'Food Market',
			fine_dining: 'Fine Dining',
			fast_food: 'Fast Food',
			other: 'Food'
		};
		return labels[venue.venueType] || 'Restaurant';
	});

	const priceLevel = $derived.by(() => {
		if (!venue.priceLevel) return null;
		return '$'.repeat(venue.priceLevel);
	});

	const timeDisplay = $derived.by(() => {
		if (!venue.scheduledTime) return null;
		return formatTime(venue.scheduledTime);
	});

	function openInMaps() {
		window.open(getMapsUrl(venue.location), '_blank');
	}

	function openMenu() {
		if (venue.menuUrl) {
			window.open(venue.menuUrl, '_blank');
		}
	}
</script>

<div class="item-card" data-kind="food">
	<div class="card-header">
		<div class="card-icon">
			<Icon name="restaurant" size={18} />
		</div>
		<div class="card-badges">
			{#if mealLabel}
				<Badge variant="info" size="sm">{mealLabel}</Badge>
			{/if}
			<Badge size="sm">{venueTypeLabel}</Badge>
			{#if venue.reservationRequired}
				<Badge variant="warning" size="sm">Reservation</Badge>
			{/if}
		</div>
	</div>

	<div class="card-content">
		<button type="button" class="card-title-btn" onclick={onclick} disabled={!onclick}>
			<h3 class="card-title">{venue.name}</h3>
		</button>

		{#if venue.cuisineTypes && venue.cuisineTypes.length > 0}
			<div class="cuisines">
				{venue.cuisineTypes.join(' · ')}
			</div>
		{/if}

		<div class="card-details">
			<button type="button" class="location-link" onclick={openInMaps} title="Open in Maps">
				<Icon name="location" size={14} />
				<span class="truncate">{venue.location.address.formatted}</span>
			</button>

			<div class="meta-row">
				{#if timeDisplay}
					<span class="time">
						<Icon name="time" size={14} />
						{timeDisplay}
					</span>
				{/if}
				{#if priceLevel}
					<span class="price-level">{priceLevel}</span>
				{/if}
				{#if venue.estimatedCost}
					<span class="estimated-cost">~${venue.estimatedCost}</span>
				{/if}
				{#if venue.rating}
					<span class="rating">★ {venue.rating}</span>
				{/if}
			</div>

			<div class="action-links">
				{#if venue.menuUrl}
					<button type="button" class="link-btn" onclick={openMenu}>
						View menu
					</button>
				{/if}
				{#if venue.reservationUrl}
					<a href={venue.reservationUrl} target="_blank" rel="noopener noreferrer" class="link-btn">
						Make reservation
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.item-card {
		position: relative;
		background: color-mix(in oklch, var(--item-color, var(--color-kind-food)), var(--item-bg-mix, white) var(--item-bg-mix-amount, 90%));
		border-left: 4px solid var(--item-color, var(--color-kind-food));
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
		background: var(--item-color, var(--color-kind-food));
		color: white;
		border-radius: var(--radius-md);
	}

	.card-badges {
		display: flex;
		flex-wrap: wrap;
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
		color: var(--text-primary);

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

	.cuisines {
		font-size: 0.875rem;
		color: var(--text-secondary);
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
		flex-wrap: wrap;
		gap: var(--space-3);
		font-size: 0.875rem;
	}

	.time {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--text-secondary);
	}

	.price-level {
		font-weight: 600;
		color: var(--color-success);
	}

	.estimated-cost {
		color: var(--text-secondary);
	}

	.rating {
		color: var(--color-warning);
		font-weight: 500;
	}

	.action-links {
		display: flex;
		gap: var(--space-3);
	}

	.link-btn {
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
</style>
