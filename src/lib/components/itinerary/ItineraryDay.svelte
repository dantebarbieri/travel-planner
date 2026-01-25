<script lang="ts">
	import type {
		ItineraryDay,
		City,
		Stay,
		Activity,
		FoodVenue,
		TransportLeg,
		ColorScheme,
		WeatherCondition,
		DailyItem
	} from '$lib/types/travel';
	import { formatDate, formatDayOfWeek } from '$lib/utils/dates';
	import DayHeader from './DayHeader.svelte';
	import ItemList from './ItemList.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		day: ItineraryDay;
		cities: City[];
		stays: Stay[];
		activities: Activity[];
		foodVenues: FoodVenue[];
		transportLegs: TransportLeg[];
		colorScheme: ColorScheme;
		weather?: WeatherCondition;
		isEditing?: boolean;
		onAddItem?: () => void;
		onReorder?: (items: DailyItem[]) => void;
		onItemClick?: (item: DailyItem) => void;
		onRemoveItem?: (itemId: string) => void;
	}

	let {
		day,
		cities,
		stays,
		activities,
		foodVenues,
		transportLegs,
		colorScheme,
		weather,
		isEditing = false,
		onAddItem,
		onReorder,
		onItemClick,
		onRemoveItem
	}: Props = $props();

	const dayCities = $derived(cities.filter((c) => day.cityIds.includes(c.id)));
	const cityNames = $derived(dayCities.map((c) => c.name).join(' - ') || 'No city assigned');

	const sortedItems = $derived([...day.items].sort((a, b) => a.sortOrder - b.sortOrder));
</script>

<article class="itinerary-day" data-day-id={day.id}>
	<DayHeader
		dayNumber={day.dayNumber}
		date={day.date}
		title={day.title}
		cityName={cityNames}
		{weather}
	/>

	<div class="day-content">
		{#if sortedItems.length > 0}
			<ItemList
				items={sortedItems}
				{stays}
				{activities}
				{foodVenues}
				{transportLegs}
				{colorScheme}
				{isEditing}
				{onReorder}
				{onItemClick}
				{onRemoveItem}
			/>
		{:else}
			<div class="empty-state">
				<p class="empty-text">No activities planned for this day</p>
				{#if isEditing && onAddItem}
					<Button variant="secondary" size="sm" onclick={onAddItem}>
						<Icon name="add" size={16} />
						Add activity
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if isEditing && sortedItems.length > 0 && onAddItem}
		<div class="day-footer">
			<Button variant="ghost" size="sm" onclick={onAddItem}>
				<Icon name="add" size={16} />
				Add item
			</Button>
		</div>
	{/if}
</article>

<style>
	.itinerary-day {
		container-type: inline-size;
		container-name: day;
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-4);
		overflow: hidden;
	}

	.day-content {
		padding: var(--space-4);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-8) var(--space-4);
		text-align: center;
	}

	.empty-text {
		color: var(--text-tertiary);
		margin: 0;
	}

	.day-footer {
		padding: var(--space-2) var(--space-4);
		border-top: 1px solid var(--border-color);
		background: var(--surface-secondary);
	}

	@container day (min-width: 600px) {
		.day-content {
			padding: var(--space-6);
		}
	}
</style>
