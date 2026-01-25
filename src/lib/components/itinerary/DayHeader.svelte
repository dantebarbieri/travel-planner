<script lang="ts">
	import type { WeatherCondition } from '$lib/types/travel';
	import { formatDate, formatDayOfWeek } from '$lib/utils/dates';
	import Badge from '$lib/components/ui/Badge.svelte';
	import WeatherBadge from '$lib/components/weather/WeatherBadge.svelte';

	interface Props {
		dayNumber: number;
		date: string;
		title?: string;
		cityName: string;
		weather?: WeatherCondition;
	}

	let { dayNumber, date, title, cityName, weather }: Props = $props();

	const dayOfWeek = $derived(formatDayOfWeek(date));
	const formattedDate = $derived(formatDate(date, { month: 'short', day: 'numeric' }));
</script>

<header class="day-header">
	<div class="day-info">
		<Badge>Day {dayNumber}</Badge>
		<div class="day-details">
			<h2 class="day-title">
				{#if title}
					{title}
				{:else}
					{cityName}
				{/if}
			</h2>
			<div class="day-meta">
				<span class="day-of-week">{dayOfWeek}</span>
				<span class="separator">·</span>
				<time class="date" datetime={date}>{formattedDate}</time>
				{#if title}
					<span class="separator">·</span>
					<span class="city-name">{cityName}</span>
				{/if}
			</div>
		</div>
	</div>
	{#if weather}
		<WeatherBadge {weather} />
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

	@container day (max-width: 500px) {
		.day-header {
			flex-direction: column;
			gap: var(--space-3);
		}
	}
</style>
