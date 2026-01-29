<script lang="ts">
	import { formatDuration, formatTimezoneChange, getTimezoneAbbreviation } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		/** Flight duration in minutes */
		duration?: number;
		/** Origin timezone (IANA format, e.g., "America/Los_Angeles") */
		originTimezone?: string;
		/** Destination timezone (IANA format, e.g., "America/New_York") */
		destTimezone?: string;
		/** Departure date for DST-aware calculations */
		departureDate?: string;
	}

	let { duration, originTimezone, destTimezone, departureDate }: Props = $props();

	// Calculate timezone change string
	const timezoneChange = $derived.by(() => {
		if (!originTimezone || !destTimezone) return null;
		const date = departureDate ? new Date(departureDate) : undefined;
		return formatTimezoneChange(originTimezone, destTimezone, date);
	});

	// Get timezone abbreviations for display
	const originTzAbbr = $derived.by(() => {
		if (!originTimezone) return null;
		const date = departureDate ? new Date(departureDate) : undefined;
		return getTimezoneAbbreviation(originTimezone, date);
	});

	const destTzAbbr = $derived.by(() => {
		if (!destTimezone) return null;
		const date = departureDate ? new Date(departureDate) : undefined;
		return getTimezoneAbbreviation(destTimezone, date);
	});

	// Only show if we have duration or timezone change to display
	const hasContent = $derived(duration || timezoneChange);
</script>

{#if hasContent}
	<div class="flight-travel-margin">
		<div class="flight-info">
			<Icon name="flight" size={16} />
			<div class="flight-details">
				{#if duration}
					<span class="flight-duration">{formatDuration(duration)} flight</span>
				{/if}
				{#if timezoneChange}
					<span class="timezone-change">
						{timezoneChange} timezone
						{#if originTzAbbr && destTzAbbr}
							<span class="timezone-labels">({originTzAbbr} → {destTzAbbr})</span>
						{/if}
					</span>
				{/if}
			</div>
		</div>
		<div class="connector-line"></div>
	</div>
{/if}

<style>
	.flight-travel-margin {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2) 0;
	}

	.flight-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		background: color-mix(in oklch, var(--color-kind-flight), transparent 90%);
		border: 1px solid color-mix(in oklch, var(--color-kind-flight), transparent 70%);
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.flight-details {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		line-height: 1.3;
	}

	.flight-duration {
		font-weight: 500;
		color: var(--text-primary);
	}

	.timezone-change {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-warning);
		font-size: 0.6875rem;
	}

	.timezone-labels {
		color: var(--text-tertiary);
		font-size: 0.625rem;
	}

	.connector-line {
		width: 2px;
		height: var(--space-3);
		background: var(--border-color);
	}

	@container day (max-width: 600px) {
		.flight-travel-margin {
			display: none;
		}
	}
</style>
