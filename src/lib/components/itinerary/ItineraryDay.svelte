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
		DailyItem,
		TravelMode,
		StaySegment
	} from '$lib/types/travel';
	import type { DayUnitResolution } from '$lib/utils/units';
	import DayHeader from './DayHeader.svelte';
	import ItemList from './ItemList.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getSegmentForDay, getDayBackgroundColor } from '$lib/utils/colors';
	import { isToday, isPast } from '$lib/utils/dates';

	interface Props {
		day: ItineraryDay;
		cities: City[];
		stays: Stay[];
		activities: Activity[];
		foodVenues: FoodVenue[];
		transportLegs: TransportLeg[];
		colorScheme: ColorScheme;
		/** Pre-computed stay segments for by-stay coloring */
		staySegments?: StaySegment[];
		/** Whether this day has a city but no lodging booked */
		hasMissingLodging?: boolean;
		weatherList?: WeatherCondition[];
		weatherLoading?: boolean;
		weatherError?: boolean;
		isEditing?: boolean;
		/** Resolved unit information for this day */
		unitResolution?: DayUnitResolution;
		onAddItem?: () => void;
		onReorder?: (items: DailyItem[]) => void;
		onItemClick?: (item: DailyItem) => void;
		onRemoveItem?: (itemId: string) => void;
		onRemoveEntireStay?: (stayId: string) => void;
		onRemoveEntireTransport?: (transportLegId: string) => void;
		onMoveItem?: (itemId: string) => void;
		onDuplicateItem?: (itemId: string) => void;
		onTravelModeChange?: (itemId: string, mode: TravelMode) => void;
	}

	let {
		day,
		cities,
		stays,
		activities,
		foodVenues,
		transportLegs,
		colorScheme,
		staySegments = [],
		hasMissingLodging = false,
		weatherList = [],
		weatherLoading = false,
		weatherError = false,
		isEditing = false,
		unitResolution,
		onAddItem,
		onReorder,
		onItemClick,
		onRemoveItem,
		onRemoveEntireStay,
		onRemoveEntireTransport,
		onMoveItem,
		onDuplicateItem,
		onTravelModeChange
	}: Props = $props();

	// Check if this day is today or in the past
	const isDayToday = $derived(isToday(day.date));
	const isDayPast = $derived(isPast(day.date));

	const dayCities = $derived(cities.filter((c) => day.cityIds.includes(c.id)));

	// Determine if this is a transition day (leaving one city, arriving at another)
	// Check if any city's end date matches today (leaving) and another city's start date matches (arriving)
	const transitionInfo = $derived.by(() => {
		if (dayCities.length !== 2) return null;

		const [city1, city2] = dayCities;
		// If city1 ends today and city2 starts today, it's a transition from city1 to city2
		if (city1.endDate === day.date && city2.startDate === day.date) {
			return { from: city1, to: city2 };
		}
		// If city2 ends today and city1 starts today, it's a transition from city2 to city1
		if (city2.endDate === day.date && city1.startDate === day.date) {
			return { from: city2, to: city1 };
		}
		return null;
	});

	const cityNames = $derived.by(() => {
		if (dayCities.length === 0) return 'No city assigned';
		if (transitionInfo) {
			return `${transitionInfo.from.name} → ${transitionInfo.to.name}`;
		}
		if (dayCities.length === 1) {
			return dayCities[0].name;
		}
		// Multiple cities but not a clear transition - use ampersand
		return dayCities.map((c) => c.name).join(' & ');
	});

	const sortedItems = $derived([...day.items].sort((a, b) => a.sortOrder - b.sortOrder));

	// The primary city for this day (used for inferred stay coloring)
	// For transition days, use the destination city; otherwise use the first city
	const primaryCityId = $derived.by(() => {
		if (transitionInfo) return transitionInfo.to.id;
		if (dayCities.length > 0) return dayCities[0].id;
		return undefined;
	});

	// Get the stay segment for this day (for by-stay coloring)
	const daySegment = $derived.by(() => {
		if (staySegments.length === 0) return undefined;
		return getSegmentForDay(staySegments, day.dayNumber - 1);
	});

	// Get the day background color (for by-stay mode when day is homogeneous)
	const dayBgColor = $derived.by(() => {
		return getDayBackgroundColor(colorScheme, staySegments, day.dayNumber - 1);
	});

	// Style string for the day container
	const dayStyle = $derived.by(() => {
		const styles: string[] = [];
		if (dayBgColor) {
			styles.push(`--day-bg-color: ${dayBgColor}`);
		}
		if (hasMissingLodging) {
			styles.push(`--day-warning: var(--color-warning)`);
		}
		return styles.length > 0 ? styles.join('; ') : undefined;
	});
</script>

<article
	class="itinerary-day"
	class:has-day-color={!!dayBgColor}
	class:has-missing-lodging={hasMissingLodging}
	class:is-today={isDayToday}
	class:is-past={isDayPast}
	data-day-id={day.id}
	data-color-mode={colorScheme.mode}
	style={dayStyle}
>
	<DayHeader
		dayNumber={day.dayNumber}
		date={day.date}
		title={day.title}
		cityName={cityNames}
		{hasMissingLodging}
		{weatherList}
		{weatherLoading}
		{weatherError}
		isToday={isDayToday}
		{unitResolution}
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
				cityId={primaryCityId}
				segmentId={daySegment?.id}
				distanceUnit={unitResolution?.distanceUnit}
				{isEditing}
				{onReorder}
				{onItemClick}
				{onRemoveItem}
				{onRemoveEntireStay}
				{onRemoveEntireTransport}
				{onMoveItem}
				{onDuplicateItem}
				{onTravelModeChange}
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

	{#if isEditing && onAddItem}
		<div class="day-footer">
			<Button variant="secondary" size="sm" onclick={onAddItem}>
				<Icon name="add" size={16} />
				Add activity
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

	/* Day with assigned stay color in by-stay mode */
	.itinerary-day.has-day-color {
		background: color-mix(in oklch, var(--day-bg-color), var(--surface-primary) 85%);
		border-color: color-mix(in oklch, var(--day-bg-color), var(--border-color) 70%);
	}

	/* Day with missing lodging warning */
	.itinerary-day.has-missing-lodging {
		border-color: var(--color-warning);
		border-width: 2px;
	}

	
	.itinerary-day.is-past {
		opacity: 0.6;
	}

	/* Today indicator - accent bar at top */
	.itinerary-day.is-today {
		position: relative;
		border-color: var(--color-primary);

		&::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 3px;
			background: var(--color-primary);
			border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		}
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
