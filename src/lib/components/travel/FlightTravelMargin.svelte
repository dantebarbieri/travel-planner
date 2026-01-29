<script lang="ts">
	import { formatDuration, formatTimezoneChange, getTimezoneAbbreviation, calculateRealDuration } from '$lib/utils/dates';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		/** Flight duration in minutes (fallback if times not provided) */
		duration?: number;
		/** Origin timezone (IANA format, e.g., "America/Los_Angeles") */
		originTimezone?: string;
		/** Destination timezone (IANA format, e.g., "America/New_York") */
		destTimezone?: string;
		/** Departure date (YYYY-MM-DD) */
		departureDate?: string;
		/** Departure time (HH:MM) for real duration calculation */
		departureTime?: string;
		/** Arrival time (HH:MM) for real duration calculation */
		arrivalTime?: string;
		/** Arrival date (YYYY-MM-DD) for real duration calculation */
		arrivalDate?: string;
		/** Origin airport code (IATA) for Google Flights link */
		originCode?: string;
		/** Destination airport code (IATA) for Google Flights link */
		destCode?: string;
		/** Flight number for tracking link */
		flightNumber?: string;
	}

	let { 
		duration, 
		originTimezone, 
		destTimezone, 
		departureDate,
		departureTime,
		arrivalTime,
		arrivalDate,
		originCode,
		destCode,
		flightNumber
	}: Props = $props();

	// Calculate real duration if we have all the time info, otherwise use provided duration
	const realDuration = $derived.by(() => {
		if (departureTime && arrivalTime && departureDate && originTimezone && destTimezone) {
			const arrDate = arrivalDate || departureDate;
			return calculateRealDuration(
				departureTime,
				originTimezone,
				arrivalTime,
				destTimezone,
				departureDate,
				arrDate
			);
		}
		return duration;
	});

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
	const hasContent = $derived(realDuration || timezoneChange);

	// Generate Google Flights URL
	const googleFlightsUrl = $derived.by(() => {
		if (!originCode || !destCode || !departureDate) return null;
		// Format: https://www.google.com/travel/flights?q=flights%20from%20SFO%20to%20JFK%20on%202024-01-15
		const query = encodeURIComponent(`flights from ${originCode} to ${destCode} on ${departureDate}`);
		return `https://www.google.com/travel/flights?q=${query}`;
	});

	// Alternative: FlightRadar24 link if we have flight number
	const flightTrackerUrl = $derived.by(() => {
		if (!flightNumber) return null;
		// Remove spaces and make uppercase
		const cleanedNumber = flightNumber.replace(/\s+/g, '').toUpperCase();
		return `https://www.flightradar24.com/data/flights/${cleanedNumber.toLowerCase()}`;
	});

	// Prefer flight tracker if available, otherwise Google Flights
	const linkUrl = $derived(flightTrackerUrl || googleFlightsUrl);
</script>

{#if hasContent}
	{#if linkUrl}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<a 
			href={linkUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="flight-travel-margin clickable"
		>
			<div class="flight-info">
				<Icon name="flight" size={16} />
				<div class="flight-details">
					{#if realDuration}
						<span class="flight-duration">{formatDuration(realDuration)} flight</span>
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
				<Icon name="externalLink" size={12} />
			</div>
			<div class="connector-line"></div>
		</a>
	{:else}
		<div class="flight-travel-margin">
			<div class="flight-info">
				<Icon name="flight" size={16} />
				<div class="flight-details">
					{#if realDuration}
						<span class="flight-duration">{formatDuration(realDuration)} flight</span>
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
{/if}

<style>
	.flight-travel-margin {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2) 0;
		text-decoration: none;
	}

	.flight-travel-margin.clickable {
		cursor: pointer;
	}

	.flight-travel-margin.clickable:hover .flight-info {
		background: color-mix(in oklch, var(--color-kind-flight), transparent 80%);
		border-color: color-mix(in oklch, var(--color-kind-flight), transparent 50%);
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
		transition: background 0.15s, border-color 0.15s;
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
