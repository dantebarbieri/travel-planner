<script lang="ts">
	import type { Location, TravelMode, TravelEstimate } from '$lib/types/travel';
	import { formatDuration, formatDistance } from '$lib/utils/dates';
	import { getDistanceBetweenLocations } from '$lib/services/geoService';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		fromLocation: Location;
		toLocation: Location;
		selectedMode?: TravelMode;
		estimates?: TravelEstimate[];
		onModeChange?: (mode: TravelMode) => void;
	}

	let {
		fromLocation,
		toLocation,
		selectedMode = 'driving',
		estimates = [],
		onModeChange
	}: Props = $props();

	const distance = $derived(getDistanceBetweenLocations(fromLocation, toLocation));

	const currentEstimate = $derived.by(() => {
		const found = estimates.find((e) => e.mode === selectedMode);
		if (found) return found;

		// Generate rough estimate if not provided
		const speeds: Record<TravelMode, number> = {
			driving: 35,
			walking: 5,
			transit: 25,
			bicycling: 15
		};
		const duration = Math.round((distance / speeds[selectedMode]) * 60);
		return {
			mode: selectedMode,
			duration,
			distance
		};
	});

	const modeIcon = $derived.by(() => {
		const icons: Record<TravelMode, string> = {
			driving: 'car',
			walking: 'walking',
			transit: 'transit',
			bicycling: 'bike'
		};
		return icons[selectedMode] || 'car';
	});

	let showSelector = $state(false);

	function selectMode(mode: TravelMode) {
		onModeChange?.(mode);
		showSelector = false;
	}

	const modes: TravelMode[] = ['driving', 'walking', 'transit', 'bicycling'];
</script>

<div class="travel-margin">
	<button
		type="button"
		class="travel-indicator"
		onclick={() => (showSelector = !showSelector)}
		title="Change travel mode"
	>
		<Icon name={modeIcon} size={16} />
		<span class="travel-info">
			<span class="duration">{formatDuration(currentEstimate.duration)}</span>
			<span class="distance">{formatDistance(currentEstimate.distance)}</span>
		</span>
	</button>

	{#if showSelector}
		<div class="mode-selector">
			{#each modes as mode}
				{@const estimate = estimates.find((e) => e.mode === mode)}
				{@const modeIconName =
					mode === 'driving'
						? 'car'
						: mode === 'walking'
							? 'walking'
							: mode === 'transit'
								? 'transit'
								: 'bike'}
				<button
					type="button"
					class="mode-option"
					class:selected={mode === selectedMode}
					onclick={() => selectMode(mode)}
				>
					<Icon name={modeIconName} size={16} />
					<span class="mode-label">{mode}</span>
					{#if estimate}
						<span class="mode-duration">{formatDuration(estimate.duration)}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<div class="connector-line"></div>
</div>

<style>
	.travel-margin {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2) 0;
	}

	.travel-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--text-secondary);
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			background: var(--surface-primary);
			border-color: var(--color-primary);
			color: var(--text-primary);
		}
	}

	.travel-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.2;
	}

	.duration {
		font-weight: 500;
		color: var(--text-primary);
	}

	.distance {
		color: var(--text-tertiary);
	}

	.mode-selector {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		z-index: var(--z-dropdown);
		display: flex;
		flex-direction: column;
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		min-width: 150px;
	}

	.mode-option {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-primary);
		text-transform: capitalize;

		&:hover {
			background: var(--surface-secondary);
		}

		&.selected {
			background: color-mix(in oklch, var(--color-primary), transparent 90%);
			color: var(--color-primary);
		}
	}

	.mode-label {
		flex: 1;
		text-align: left;
	}

	.mode-duration {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.connector-line {
		width: 2px;
		height: var(--space-3);
		background: var(--border-color);
	}

	@container day (max-width: 600px) {
		.travel-margin {
			display: none;
		}
	}
</style>
