<script lang="ts">
	import type { WeatherCondition } from '$lib/types/travel';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		weather: WeatherCondition;
		temperatureUnit?: 'celsius' | 'fahrenheit';
		showDetails?: boolean;
	}

	let { weather, temperatureUnit = 'celsius', showDetails = false }: Props = $props();

	function convertTemp(celsius: number): number {
		if (temperatureUnit === 'fahrenheit') {
			return Math.round((celsius * 9) / 5 + 32);
		}
		return Math.round(celsius);
	}

	const tempUnit = $derived(temperatureUnit === 'fahrenheit' ? '°F' : '°C');

	const weatherIcon = $derived.by(() => {
		const iconMap: Record<string, string> = {
			sunny: 'sunny',
			partly_cloudy: 'cloudy',
			cloudy: 'cloudy',
			rain: 'rain',
			snow: 'cloudy',
			storm: 'rain',
			fog: 'cloudy'
		};
		return iconMap[weather.condition] || 'sunny';
	});

	const conditionLabel = $derived.by(() => {
		const labelMap: Record<string, string> = {
			sunny: 'Sunny',
			partly_cloudy: 'Partly Cloudy',
			cloudy: 'Cloudy',
			rain: 'Rain',
			snow: 'Snow',
			storm: 'Storm',
			fog: 'Foggy'
		};
		return labelMap[weather.condition] || weather.condition;
	});
</script>

<div class="weather-badge" class:show-details={showDetails}>
	<Icon name={weatherIcon} size={20} />
	<div class="weather-temps">
		<span class="temp-high">{convertTemp(weather.tempHigh)}{tempUnit}</span>
		<span class="temp-separator">/</span>
		<span class="temp-low">{convertTemp(weather.tempLow)}{tempUnit}</span>
	</div>
	{#if showDetails}
		<span class="condition">{conditionLabel}</span>
		{#if weather.precipitation && weather.precipitation > 20}
			<span class="precipitation">{weather.precipitation}%</span>
		{/if}
	{/if}
	{#if weather.isHistorical}
		<span class="historical-indicator" title="Historical average - forecast not available for this date">*</span>
	{/if}
</div>

<style>
	.weather-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.weather-temps {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.temp-high {
		font-weight: 600;
		color: var(--text-primary);
	}

	.temp-separator {
		color: var(--text-tertiary);
	}

	.temp-low {
		color: var(--text-secondary);
	}

	.condition {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}

	.precipitation {
		color: var(--color-info);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.historical-indicator {
		font-size: 0.875rem;
		color: var(--text-tertiary);
		cursor: help;
		margin-left: -2px;
	}

	.show-details {
		padding: var(--space-2) var(--space-3);
	}
</style>
