<script lang="ts">
	import type { Stay } from '$lib/types/travel';
	import { formatDateShort, formatTime } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ItemNotes from './ItemNotes.svelte';
	import { getMapsUrl } from '$lib/services/mapService';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { openSafeUrl } from '$lib/utils/url';

	interface Props {
		stay: Stay;
		isCheckIn?: boolean;
		isCheckOut?: boolean;
		/** Notes specific to this item on this day */
		itemNotes?: string;
		isEditing?: boolean;
		onclick?: () => void;
		onNotesChange?: (notes: string) => void;
		onCheckInTimeChange?: (time: string) => void;
		onCheckOutTimeChange?: (time: string) => void;
	}

	let { 
		stay, 
		isCheckIn = false, 
		isCheckOut = false, 
		itemNotes = '',
		isEditing = false, 
		onclick,
		onNotesChange,
		onCheckInTimeChange,
		onCheckOutTimeChange
	}: Props = $props();

	// Get resolved map app from settings
	const mapApp = $derived(settingsStore.getConcreteMapApp(settingsStore.userSettings.preferredMapApp));

	// Get time format preference (12h vs 24h)
	const use24h = $derived(settingsStore.userSettings.timeFormat === '24h');

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

	// Get effective check-in/out times (user override or API data)
	const effectiveCheckInTime = $derived(
		stay.userOverrides?.checkInTime || stay.checkInTime
	);
	const effectiveCheckOutTime = $derived(
		stay.userOverrides?.checkOutTime || stay.checkOutTime
	);

	// Check if has user overrides
	const hasOverrides = $derived(
		stay.userOverrides && Object.keys(stay.userOverrides).length > 0
	);

	// Format check-in/out time display
	const checkInTimeDisplay = $derived.by(() => {
		if (!effectiveCheckInTime) return null;
		return formatTime(effectiveCheckInTime, use24h);
	});

	const checkOutTimeDisplay = $derived.by(() => {
		if (!effectiveCheckOutTime) return null;
		return formatTime(effectiveCheckOutTime, use24h);
	});

	function openInMaps() {
		window.open(getMapsUrl(stay.location, mapApp), '_blank');
	}

	// Title click handler - open website if available
	function handleTitleClick() {
		// For Airbnb/VRBO, prefer listing URL
		let url = stay.website;
		if (stay.type === 'airbnb' && 'listingUrl' in stay && stay.listingUrl) {
			url = stay.listingUrl;
		} else if (stay.type === 'vrbo' && 'listingUrl' in stay && stay.listingUrl) {
			url = stay.listingUrl;
		}

		if (url) {
			openSafeUrl(url, '_blank');
		} else if (onclick) {
			onclick();
		}
	}

	const hasTitleLink = $derived(
		!!stay.website ||
		(stay.type === 'airbnb' && 'listingUrl' in stay && !!stay.listingUrl) ||
		(stay.type === 'vrbo' && 'listingUrl' in stay && !!stay.listingUrl) ||
		!!onclick
	);
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
			title={stay.website ? 'Open website' : undefined}
		>
			<h3 class="card-title">
				{stay.name}
				{#if hasTitleLink}
					<Icon name="externalLink" size={12} />
				{/if}
			</h3>
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

			<!-- Check-in/out times - always show on check-in/out cards -->
			{#if isCheckIn || isCheckOut}
				<div class="times-row">
					{#if isCheckIn}
						<div class="check-time-item">
							<Icon name="time" size={12} />
							<span class="check-time-label">Check-in:</span>
							{#if isEditing}
								<input
									type="time"
									class="time-input"
									value={effectiveCheckInTime || ''}
									onchange={(e) => onCheckInTimeChange?.(e.currentTarget.value)}
									placeholder="HH:MM"
								/>
							{:else}
								<span class="check-time-value" class:not-set={!checkInTimeDisplay}>
									{checkInTimeDisplay || 'Not set'}
								</span>
							{/if}
						</div>
					{/if}
					{#if isCheckOut}
						<div class="check-time-item">
							<Icon name="time" size={12} />
							<span class="check-time-label">Check-out:</span>
							{#if isEditing}
								<input
									type="time"
									class="time-input"
									value={effectiveCheckOutTime || ''}
									onchange={(e) => onCheckOutTimeChange?.(e.currentTarget.value)}
									placeholder="HH:MM"
								/>
							{:else}
								<span class="check-time-value" class:not-set={!checkOutTimeDisplay}>
									{checkOutTimeDisplay || 'Not set'}
								</span>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if stay.confirmationNumber}
				<div class="confirmation">
					<Icon name="ticket" size={12} />
					Confirmation: <strong>{stay.confirmationNumber}</strong>
				</div>
			{/if}

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

		<ItemNotes 
			notes={itemNotes} 
			placeholder="Add notes (room preferences, requests...)"
			{isEditing}
			onSave={onNotesChange}
		/>
	</div>

</div>

<style>
	.item-card {
		position: relative;
		background: color-mix(in oklch, var(--item-color, var(--color-kind-stay)), var(--item-bg-mix, white) var(--item-bg-mix-amount, 90%));
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

	.times-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding: var(--space-2);
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
	}

	.check-time-item {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.check-time-label {
		font-weight: 500;
	}

	.check-time-value {
		color: var(--text-primary);
		font-weight: 600;
	}

	.check-time-value.not-set {
		color: var(--text-tertiary);
		font-weight: 400;
		font-style: italic;
	}

	.time-input {
		padding: 2px 6px;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		background: var(--surface-primary);
		color: var(--text-primary);
		font-family: inherit;
		width: 90px;

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}
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
</style>
