<script lang="ts">
	import type { FoodVenue, MealType } from '$lib/types/travel';
	import { formatTime } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BusinessHours from '$lib/components/places/BusinessHours.svelte';
	import TagList from '$lib/components/places/TagList.svelte';
	import ItemNotes from './ItemNotes.svelte';
	import { getMapsUrl } from '$lib/services/mapService';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';

	interface Props {
		venue: FoodVenue;
		mealSlot?: MealType;
		/** The date this meal is scheduled for (YYYY-MM-DD) - used for showing hours */
		scheduledDate?: string;
		/** Notes specific to this item on this day */
		itemNotes?: string;
		isEditing?: boolean;
		onclick?: () => void;
		onNotesChange?: (notes: string) => void;
	}

	let { 
		venue, 
		mealSlot, 
		scheduledDate,
		itemNotes = '',
		isEditing = false, 
		onclick,
		onNotesChange
	}: Props = $props();

	// Get resolved map app from settings
	const mapApp = $derived(settingsStore.getConcreteMapApp(settingsStore.userSettings.preferredMapApp));

	// Get time format preference (12h vs 24h)
	const use24h = $derived(settingsStore.userSettings.timeFormat === '24h');

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

	// Get effective price level (user override or API data)
	const effectivePriceLevel = $derived(
		venue.userOverrides?.priceLevel || venue.priceLevel
	);

	const priceLevel = $derived.by(() => {
		if (!effectivePriceLevel) return null;
		return '$'.repeat(effectivePriceLevel);
	});

	const timeDisplay = $derived.by(() => {
		if (!venue.scheduledTime) return null;
		return formatTime(venue.scheduledTime, use24h);
	});

	// Check if has user overrides
	const hasOverrides = $derived(
		venue.userOverrides && Object.keys(venue.userOverrides).length > 0
	);

	// Get effective opening hours
	const effectiveHours = $derived(
		venue.userOverrides?.openingHours || venue.openingHours
	);

	// Debug: Log business hours data flow
	$effect(() => {
		console.log(`[FoodCard] ${venue.name}:`, {
			scheduledDate,
			hasOpeningHours: !!venue.openingHours,
			openingHours: venue.openingHours,
			effectiveHours,
			willRender: !!(effectiveHours && scheduledDate)
		});
	});

	// Get effective tags
	const effectiveTags = $derived(
		venue.userOverrides?.tags || venue.tags || []
	);

	function openInMaps() {
		window.open(getMapsUrl(venue.location, mapApp), '_blank');
	}

	function openMenu() {
		if (venue.menuUrl) {
			window.open(venue.menuUrl, '_blank');
		}
	}

	// Title click handler - open website if available
	function handleTitleClick() {
		const url = venue.website || venue.apiPageUrl;
		if (url) {
			window.open(url, '_blank');
		} else if (onclick) {
			onclick();
		}
	}

	const hasTitleLink = $derived(!!venue.website || !!venue.apiPageUrl || !!onclick);
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
			{#if hasOverrides}
				<Badge variant="info" size="sm" title="Some fields edited by you">Edited</Badge>
			{/if}
		</div>
	</div>

	<div class="card-content">
		<button 
			type="button" 
			class="card-title-btn" 
			onclick={handleTitleClick} 
			disabled={!hasTitleLink}
			title={venue.website ? 'Open website' : venue.apiPageUrl ? 'View on map' : undefined}
		>
			<h3 class="card-title">
				{venue.name}
				{#if venue.website || venue.apiPageUrl}
					<Icon name="externalLink" size={12} />
				{/if}
			</h3>
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
					<span class="rating">★ {venue.rating.toFixed(1)}</span>
				{/if}
			</div>

			{#if effectiveHours && scheduledDate}
				<BusinessHours hours={effectiveHours} date={scheduledDate} />
			{/if}

			{#if effectiveTags.length > 0}
				<TagList tags={effectiveTags} />
			{/if}

			{#if venue.reservationConfirmation}
				<div class="confirmation">
					<Icon name="ticket" size={12} />
					Reservation: <strong>{venue.reservationConfirmation}</strong>
				</div>
			{/if}

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

		<ItemNotes 
			notes={itemNotes} 
			placeholder="Add notes (what to order, dietary needs...)"
			{isEditing}
			onSave={onNotesChange}
		/>
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
		color: var(--text-inverse);
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
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
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

	.confirmation {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding: var(--space-1) var(--space-2);
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
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
