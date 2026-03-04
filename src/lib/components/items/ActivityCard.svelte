<script lang="ts">
	import type { Activity } from '$lib/types/travel';
	import { formatTime, formatDuration } from '$lib/utils/dates';
	import { getActivityCategoryLabel, getCurrencySymbol } from '$lib/utils/labels';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BusinessHours from '$lib/components/places/BusinessHours.svelte';
	import TagList from '$lib/components/places/TagList.svelte';
	import CategoryTagList from '$lib/components/places/CategoryTagList.svelte';
	import ItemNotes from './ItemNotes.svelte';
	import { openInMaps } from '$lib/utils/cardHelpers';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { openSafeUrl } from '$lib/utils/url';

	interface Props {
		activity: Activity;
		/** The date this activity is scheduled for (YYYY-MM-DD) - used for showing hours */
		scheduledDate?: string;
		/** Notes specific to this item on this day */
		itemNotes?: string;
		isEditing?: boolean;
		onclick?: () => void;
		onNotesChange?: (notes: string) => void;
		onEntryFeeChange?: (entryFee: number | undefined) => void;
	}

	let { 
		activity, 
		scheduledDate,
		itemNotes = '',
		isEditing = false, 
		onclick,
		onNotesChange,
		onEntryFeeChange
	}: Props = $props();

	// Get resolved map app from settings
	const mapApp = $derived(settingsStore.getConcreteMapApp(settingsStore.userSettings.preferredMapApp));

	// Get time format preference (12h vs 24h)
	const use24h = $derived(settingsStore.userSettings.timeFormat === '24h');

	const categoryLabel = $derived(getActivityCategoryLabel(activity.category));

	// Get effective entry fee (user override or API data)
	const effectiveEntryFee = $derived(
		activity.userOverrides?.entryFee ?? activity.entryFee
	);

	// Price display - prefer entryFee, fallback to price
	const priceDisplay = $derived.by(() => {
		const price = effectiveEntryFee ?? activity.price;
		if (price === undefined) return null;
		if (price === 0) return 'Free';
		return `${getCurrencySymbol(activity.currency || '')}${price}`;
	});

	// Price level display ($-$$$$)
	const priceLevelDisplay = $derived.by(() => {
		if (!activity.priceLevel) return null;
		return '$'.repeat(activity.priceLevel);
	});

	// State for inline entry fee editing
	let editingEntryFee = $state(false);
	let entryFeeInput = $state('');

	function startEditEntryFee() {
		editingEntryFee = true;
		entryFeeInput = effectiveEntryFee !== undefined ? String(effectiveEntryFee) : '';
	}

	function saveEntryFee() {
		editingEntryFee = false;
		if (entryFeeInput.trim() === '') {
			onEntryFeeChange?.(undefined);
		} else {
			const value = parseFloat(entryFeeInput);
			if (!isNaN(value) && value >= 0) {
				onEntryFeeChange?.(value);
			}
		}
	}

	function cancelEditEntryFee() {
		editingEntryFee = false;
	}

	function handleEntryFeeKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveEntryFee();
		} else if (event.key === 'Escape') {
			cancelEditEntryFee();
		}
	}

	const timeDisplay = $derived.by(() => {
		if (!activity.startTime) return null;
		const start = formatTime(activity.startTime, use24h);
		if (activity.endTime) {
			return `${start} - ${formatTime(activity.endTime, use24h)}`;
		}
		return start;
	});

	// Check if has user overrides
	const hasOverrides = $derived(
		activity.userOverrides && Object.keys(activity.userOverrides).length > 0
	);

	// Get effective opening hours (user override or API data)
	const effectiveHours = $derived(
		activity.userOverrides?.openingHours || activity.openingHours
	);

	// Get effective tags
	const effectiveTags = $derived(
		activity.userOverrides?.tags || activity.tags || []
	);

	// Get effective category tags (from API, user can override)
	const effectiveCategoryTags = $derived(
		activity.userOverrides?.categoryTags || activity.categoryTags || []
	);

	function handleOpenInMaps() {
		openInMaps(activity.location, mapApp);
	}

	// Title click handler - open website if available
	function handleTitleClick() {
		const url = activity.website || activity.apiPageUrl;
		if (url) {
			openSafeUrl(url, '_blank');
		} else if (onclick) {
			onclick();
		}
	}

	const hasTitleLink = $derived(!!activity.website || !!activity.apiPageUrl || !!onclick);
</script>

<div class="item-card" data-kind="activity">
	<div class="card-header">
		<div class="card-icon">
			<Icon name="attraction" size={18} />
		</div>
		<div class="card-badges">
			<Badge size="sm">{categoryLabel}</Badge>
			{#if activity.bookingRequired}
				<Badge variant="warning" size="sm">Booking required</Badge>
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
			title={activity.website ? 'Open website' : activity.apiPageUrl ? 'View on map' : undefined}
		>
			<h3 class="card-title">
				{activity.name}
				{#if activity.website || activity.apiPageUrl}
					<Icon name="externalLink" size={12} />
				{/if}
			</h3>
		</button>

		{#if activity.description}
			<p class="description">{activity.description}</p>
		{/if}

		<div class="card-details">
			<button type="button" class="location-link" onclick={handleOpenInMaps} title="Open in Maps">
				<Icon name="location" size={14} />
				<span class="truncate">{activity.location.address.formatted}</span>
			</button>

			<div class="meta-row">
				{#if timeDisplay}
					<span class="time">
						<Icon name="time" size={14} />
						{timeDisplay}
					</span>
				{/if}
				{#if activity.duration}
					<span class="duration">{formatDuration(activity.duration)}</span>
				{/if}
				{#if isEditing && onEntryFeeChange}
					{#if editingEntryFee}
						<span class="entry-fee-edit">
							<span class="currency-symbol">$</span>
							<input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								bind:value={entryFeeInput}
								onkeydown={handleEntryFeeKeydown}
								onblur={saveEntryFee}
								class="entry-fee-input"
							/>
						</span>
					{:else}
						<button type="button" class="price editable" onclick={startEditEntryFee} title="Click to edit entry fee">
							{#if priceDisplay}
								{priceDisplay}
							{:else}
								<span class="not-set">Entry fee not set</span>
							{/if}
							<Icon name="edit" size={10} />
						</button>
					{/if}
				{:else if priceDisplay}
					<span class="price" class:free={effectiveEntryFee === 0 || activity.price === 0}>
						{priceDisplay}
					</span>
				{:else if priceLevelDisplay}
					<span class="price-level">{priceLevelDisplay}</span>
				{/if}
				{#if activity.rating}
					<span class="rating">★ {activity.rating.toFixed(1)}</span>
				{/if}
			</div>

			{#if effectiveHours && scheduledDate}
				<BusinessHours hours={effectiveHours} date={scheduledDate} />
			{/if}

			{#if effectiveCategoryTags.length > 0}
				<CategoryTagList tags={effectiveCategoryTags} />
			{/if}

			{#if effectiveTags.length > 0}
				<TagList tags={effectiveTags} />
			{/if}

			{#if activity.confirmationNumber}
				<div class="confirmation">
					<Icon name="ticket" size={12} />
					Confirmation: <strong>{activity.confirmationNumber}</strong>
				</div>
			{/if}
		</div>

		<ItemNotes 
			notes={itemNotes} 
			placeholder="Add notes (tips, what to see...)"
			{isEditing}
			onSave={onNotesChange}
		/>
	</div>

</div>

<style>
	.description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.duration {
		color: var(--text-tertiary);
	}

	.price.free {
		color: var(--color-success);
	}

	.price.editable {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-sm);
		padding: 2px 6px;
		cursor: pointer;
		font: inherit;
		font-weight: 600;
		color: var(--text-primary);

		&:hover {
			border-color: var(--color-primary);
			background: var(--surface-secondary);
		}
	}

	.not-set {
		font-weight: 400;
		color: var(--text-tertiary);
		font-style: italic;
		background: transparent;
	}

	.price.editable .not-set {
		color: var(--text-tertiary);
	}

	.entry-fee-edit {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	.currency-symbol {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.entry-fee-input {
		width: 60px;
		padding: 2px 4px;
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-sm);
		font: inherit;
		font-size: 0.875rem;
		background: var(--surface-primary);
		color: var(--text-primary);

		&:focus {
			outline: none;
			box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-primary), transparent 70%);
		}
	}
</style>
