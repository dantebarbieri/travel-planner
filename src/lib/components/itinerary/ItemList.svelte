<script lang="ts">
	import type {
		DailyItem,
		Stay,
		Activity,
		FoodVenue,
		TransportLeg,
		ColorScheme
	} from '$lib/types/travel';
	import { isStayItem, isActivityItem, isFoodItem, isTransportItem } from '$lib/types/travel';
	import StayCard from '$lib/components/items/StayCard.svelte';
	import ActivityCard from '$lib/components/items/ActivityCard.svelte';
	import FoodCard from '$lib/components/items/FoodCard.svelte';
	import TransportCard from '$lib/components/items/TransportCard.svelte';
	import TravelMargin from '$lib/components/travel/TravelMargin.svelte';

	interface Props {
		items: DailyItem[];
		stays: Stay[];
		activities: Activity[];
		foodVenues: FoodVenue[];
		transportLegs: TransportLeg[];
		colorScheme: ColorScheme;
		isEditing?: boolean;
		onReorder?: (items: DailyItem[]) => void;
		onItemClick?: (item: DailyItem) => void;
		onRemoveItem?: (itemId: string) => void;
	}

	let {
		items,
		stays,
		activities,
		foodVenues,
		transportLegs,
		colorScheme,
		isEditing = false,
		onReorder,
		onItemClick,
		onRemoveItem
	}: Props = $props();

	function getStay(id: string): Stay | undefined {
		return stays.find((s) => s.id === id);
	}

	function getActivity(id: string): Activity | undefined {
		return activities.find((a) => a.id === id);
	}

	function getFoodVenue(id: string): FoodVenue | undefined {
		return foodVenues.find((f) => f.id === id);
	}

	function getTransportLeg(id: string): TransportLeg | undefined {
		return transportLegs.find((t) => t.id === id);
	}

	function getItemLocation(item: DailyItem) {
		if (isStayItem(item)) {
			return getStay(item.stayId)?.location;
		}
		if (isActivityItem(item)) {
			return getActivity(item.activityId)?.location;
		}
		if (isFoodItem(item)) {
			return getFoodVenue(item.foodVenueId)?.location;
		}
		if (isTransportItem(item)) {
			const leg = getTransportLeg(item.transportLegId);
			return leg?.destination;
		}
		return undefined;
	}

	function getItemColor(item: DailyItem): string {
		if (colorScheme.mode === 'by-stay' && isStayItem(item) && colorScheme.stayColors) {
			return colorScheme.stayColors[item.stayId] || colorScheme.kindColors.stay;
		}
		return colorScheme.kindColors[item.kind] || colorScheme.kindColors.activity;
	}
</script>

<div class="item-list">
	{#each items as item, index (item.id)}
		{@const prevItem = index > 0 ? items[index - 1] : null}
		{@const prevLocation = prevItem ? getItemLocation(prevItem) : null}
		{@const currentLocation = getItemLocation(item)}

		{#if index > 0 && prevLocation && currentLocation}
			<TravelMargin
				fromLocation={prevLocation}
				toLocation={currentLocation}
				selectedMode={item.travelMode || 'driving'}
				estimates={item.travelFromPrevious ? [item.travelFromPrevious] : []}
			/>
		{/if}

		<div class="item-wrapper" style="--item-color: {getItemColor(item)}">
			{#if isStayItem(item)}
				{@const stay = getStay(item.stayId)}
				{#if stay}
					<StayCard
						{stay}
						isCheckIn={item.isCheckIn}
						isCheckOut={item.isCheckOut}
						{isEditing}
						onclick={() => onItemClick?.(item)}
						onRemove={() => onRemoveItem?.(item.id)}
					/>
				{/if}
			{:else if isActivityItem(item)}
				{@const activity = getActivity(item.activityId)}
				{#if activity}
					<ActivityCard
						{activity}
						{isEditing}
						onclick={() => onItemClick?.(item)}
						onRemove={() => onRemoveItem?.(item.id)}
					/>
				{/if}
			{:else if isFoodItem(item)}
				{@const venue = getFoodVenue(item.foodVenueId)}
				{#if venue}
					<FoodCard
						{venue}
						mealSlot={item.mealSlot}
						{isEditing}
						onclick={() => onItemClick?.(item)}
						onRemove={() => onRemoveItem?.(item.id)}
					/>
				{/if}
			{:else if isTransportItem(item)}
				{@const leg = getTransportLeg(item.transportLegId)}
				{#if leg}
					<TransportCard
						{leg}
						{isEditing}
						onclick={() => onItemClick?.(item)}
						onRemove={() => onRemoveItem?.(item.id)}
					/>
				{/if}
			{/if}
		</div>
	{/each}
</div>

<style>
	.item-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.item-wrapper {
		--item-color: var(--color-gray-300);
	}
</style>
