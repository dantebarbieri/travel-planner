<script lang="ts">
	import type { Activity } from '$lib/types/travel';
	import { formatTime, formatDuration } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { getMapsUrl } from '$lib/services/mapService';

	interface Props {
		activity: Activity;
		isEditing?: boolean;
		onclick?: () => void;
	}

	let { activity, isEditing = false, onclick }: Props = $props();

	const categoryLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			sightseeing: 'Sightseeing',
			museum: 'Museum',
			tour: 'Tour',
			outdoor: 'Outdoor',
			entertainment: 'Entertainment',
			shopping: 'Shopping',
			wellness: 'Wellness',
			nightlife: 'Nightlife',
			sports: 'Sports',
			other: 'Activity'
		};
		return labels[activity.category] || 'Activity';
	});

	const priceDisplay = $derived.by(() => {
		if (activity.price === undefined) return null;
		if (activity.price === 0) return 'Free';
		const symbol = activity.currency === 'EUR' ? '€' : activity.currency === 'JPY' ? '¥' : '$';
		return `${symbol}${activity.price}`;
	});

	const timeDisplay = $derived.by(() => {
		if (!activity.startTime) return null;
		const start = formatTime(activity.startTime);
		if (activity.endTime) {
			return `${start} - ${formatTime(activity.endTime)}`;
		}
		return start;
	});

	function openInMaps() {
		window.open(getMapsUrl(activity.location), '_blank');
	}

	function openWebsite() {
		if (activity.website) {
			window.open(activity.website, '_blank');
		}
	}
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
		</div>
	</div>

	<div class="card-content">
		<button type="button" class="card-title-btn" onclick={onclick} disabled={!onclick}>
			<h3 class="card-title">{activity.name}</h3>
		</button>

		{#if activity.description}
			<p class="description">{activity.description}</p>
		{/if}

		<div class="card-details">
			<button type="button" class="location-link" onclick={openInMaps} title="Open in Maps">
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
				{#if priceDisplay}
					<span class="price" class:free={activity.price === 0}>{priceDisplay}</span>
				{/if}
			</div>

			{#if activity.openingHours}
				<div class="hours-info">
					<Icon name="time" size={12} />
					<span>Check hours for today</span>
				</div>
			{/if}

			{#if activity.website}
				<button type="button" class="website-link" onclick={openWebsite}>
					Visit website
				</button>
			{/if}
		</div>
	</div>

</div>

<style>
	.item-card {
		position: relative;
		background: color-mix(in oklch, var(--item-color, var(--color-kind-activity)), var(--item-bg-mix, white) var(--item-bg-mix-amount, 90%));
		border-left: 4px solid var(--item-color, var(--color-kind-activity));
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
		background: var(--item-color, var(--color-kind-activity));
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

	.duration {
		color: var(--text-tertiary);
	}

	.price {
		font-weight: 600;
		color: var(--text-primary);

		&.free {
			color: var(--color-success);
		}
	}

	.hours-info {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.website-link {
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
</style>
