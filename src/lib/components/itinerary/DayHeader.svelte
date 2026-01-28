<script lang="ts">
	import type { WeatherCondition } from '$lib/types/travel';
	import { formatDate, formatDayOfWeek } from '$lib/utils/dates';
	import Badge from '$lib/components/ui/Badge.svelte';
	import WeatherBadge from '$lib/components/weather/WeatherBadge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';

	interface Props {
		dayNumber: number;
		date: string;
		title?: string;
		cityName: string;
		weather?: WeatherCondition;
		weatherList?: WeatherCondition[]; // For multiple cities
		/** Whether this day has a city but no lodging booked */
		hasMissingLodging?: boolean;
		/** Whether this day is today */
		isToday?: boolean;
		/** Country for location-based temperature unit resolution */
		tripCountry?: string;
	}

	let { dayNumber, date, title, cityName, weather, weatherList = [], hasMissingLodging = false, isToday = false, tripCountry }: Props = $props();

	const dayOfWeek = $derived(formatDayOfWeek(date));
	const formattedDate = $derived(formatDate(date, { month: 'short', day: 'numeric' }));

	// Use weatherList if provided, otherwise wrap single weather in array
	const allWeather = $derived(weatherList.length > 0 ? weatherList : weather ? [weather] : []);

	// Get resolved temperature unit from settings
	const temperatureUnit = $derived(
		settingsStore.getConcreteTemperatureUnit(
			settingsStore.userSettings.temperatureUnit,
			tripCountry
		)
	);
</script>

<header class="day-header" class:has-warning={hasMissingLodging}>
	<div class="day-info">
		<div class="day-badges">
			<Badge>Day {dayNumber}</Badge>
			{#if isToday}
				<Badge variant="primary">Today</Badge>
			{/if}
		</div>
		<div class="day-details">
			<h2 class="day-title">
				{#if title}
					{title}
				{:else}
					{cityName}
				{/if}
				{#if hasMissingLodging}
					<span class="lodging-warning" title="No lodging booked for this day">
						<Icon name="warning" size={18} />
					</span>
				{/if}
			</h2>
			<div class="day-meta">
				<span class="day-of-week">{dayOfWeek}</span>
				<span class="separator">·</span>
				<time class="date" datetime={date}>{formattedDate}</time>
				{#if title && cityName !== 'No city assigned'}
					<span class="separator">·</span>
					<span class="city-name">{cityName}</span>
				{/if}
			</div>
		</div>
	</div>
	{#if allWeather.length > 0}
		<div class="weather-section">
			{#each allWeather as w (w.location.name)}
				<WeatherBadge weather={w} {temperatureUnit} showDetails={allWeather.length === 1} />
			{/each}
		</div>
	{/if}
</header>

<style>
	.day-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--surface-secondary);
		border-bottom: 1px solid var(--border-color);
	}

	.day-info {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.day-badges {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		align-items: flex-start;
	}

	.day-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.day-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		line-height: 1.3;
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.lodging-warning {
		display: inline-flex;
		color: var(--color-warning);
		flex-shrink: 0;
	}

	.day-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.separator {
		color: var(--text-tertiary);
	}

	.day-of-week {
		font-weight: 500;
	}

	.city-name {
		color: var(--text-tertiary);
	}

	.weather-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	@container day (max-width: 500px) {
		.day-header {
			flex-direction: column;
			gap: var(--space-3);
		}

		.weather-section {
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
</style>
