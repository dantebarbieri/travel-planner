<script lang="ts">
	import type {
		DailyItem,
		Stay,
		Activity,
		FoodVenue,
		TransportLeg,
		ColorScheme,
		TravelMode,
		CityId
	} from '$lib/types/travel';
	import { isStayItem, isActivityItem, isFoodItem, isTransportItem } from '$lib/types/travel';
	import type { StayBadgeState } from '$lib/utils/stayUtils';
	import StayCard from '$lib/components/items/StayCard.svelte';
	import ActivityCard from '$lib/components/items/ActivityCard.svelte';
	import FoodCard from '$lib/components/items/FoodCard.svelte';
	import TransportCard from '$lib/components/items/TransportCard.svelte';
	import TravelMargin from '$lib/components/travel/TravelMargin.svelte';
	import FlightTravelMargin from '$lib/components/travel/FlightTravelMargin.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
	import ContextMenuItem from '$lib/components/ui/ContextMenuItem.svelte';
	import { getItemColor as getItemColorUtil } from '$lib/utils/colors';

	interface Props {
		items: DailyItem[];
		stays: Stay[];
		activities: Activity[];
		foodVenues: FoodVenue[];
		transportLegs: TransportLeg[];
		colorScheme: ColorScheme;
		/** Pre-computed stay badges (check-in/check-out) */
		stayBadges?: Map<string, StayBadgeState>;
		cityId?: CityId;
		/** The stay segment ID for this day (used for by-stay coloring) */
		segmentId?: string;
		/** Resolved distance unit for this day's location */
		distanceUnit?: 'km' | 'miles';
		isEditing?: boolean;
		onReorder?: (items: DailyItem[]) => void;
		onItemClick?: (item: DailyItem) => void;
		onRemoveItem?: (itemId: string) => void;
		onRemoveEntireStay?: (stayId: string) => void;
		onRemoveEntireTransport?: (transportLegId: string) => void;
		onMoveItem?: (itemId: string) => void;
		onDuplicateItem?: (itemId: string) => void;
		onTravelModeChange?: (itemId: string, mode: TravelMode) => void;
		onStayCheckInTimeChange?: (stayId: string, time: string) => void;
		onStayCheckOutTimeChange?: (stayId: string, time: string) => void;
	}

	let {
		items,
		stays,
		activities,
		foodVenues,
		transportLegs,
		colorScheme,
		stayBadges,
		cityId,
		segmentId,
		distanceUnit = 'km',
		isEditing = false,
		onReorder,
		onItemClick,
		onRemoveItem,
		onRemoveEntireStay,
		onRemoveEntireTransport,
		onMoveItem,
		onDuplicateItem,
		onTravelModeChange,
		onStayCheckInTimeChange,
		onStayCheckOutTimeChange
	}: Props = $props();

	// Context menu state
	let contextMenuOpen = $state(false);
	let contextMenuX = $state(0);
	let contextMenuY = $state(0);
	let contextMenuItemId = $state<string | null>(null);

	// Drag and drop state
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

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
			if (!leg) return undefined;
			// Departure: use origin (where you're leaving from)
			// Arrival: use destination (where you're arriving to)
			return item.isDeparture ? leg.origin : leg.destination;
		}
		return undefined;
	}

	function getItemColor(item: DailyItem): string {
		const stayId = isStayItem(item) ? item.stayId : undefined;
		// For by-stay mode, all items on this day get the segment's color
		return getItemColorUtil(item.kind, stayId, colorScheme, cityId, segmentId);
	}

	// Drag and drop handlers
	function handleDragStart(event: DragEvent, index: number) {
		if (!isEditing) return;
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', index.toString());
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		if (!isEditing || draggedIndex === null) return;
		event.preventDefault();
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	// Helper to check if an item is a flight departure
	function isFlightDeparture(item: DailyItem): boolean {
		return isTransportItem(item) && 
			item.isDeparture === true && 
			getTransportLeg(item.transportLegId)?.mode === 'flight';
	}

	// Helper to check if an item is a flight arrival
	function isFlightArrival(item: DailyItem): boolean {
		return isTransportItem(item) && 
			item.isArrival === true && 
			getTransportLeg(item.transportLegId)?.mode === 'flight';
	}

	// Find the paired flight item (departure/arrival of same flight) in the same day's list
	function getFlightPair(item: DailyItem): { item: DailyItem; index: number } | null {
		if (!isTransportItem(item)) return null;
		const leg = getTransportLeg(item.transportLegId);
		if (!leg || leg.mode !== 'flight') return null;

		for (let i = 0; i < items.length; i++) {
			const other = items[i];
			if (other.id === item.id) continue;
			if (!isTransportItem(other)) continue;
			if (other.transportLegId !== item.transportLegId) continue;
			return { item: other, index: i };
		}
		return null;
	}

	// Check if a drop position would be between a flight pair (departure then arrival)
	function isDropBetweenFlightPair(dropIndex: number): boolean {
		if (dropIndex <= 0 || dropIndex >= items.length) return false;
		
		const before = items[dropIndex - 1];
		const after = items[dropIndex];
		
		if (!isTransportItem(before) || !isTransportItem(after)) return false;
		if (before.transportLegId !== after.transportLegId) return false;
		
		// Same flight - check if it's departure followed by arrival
		return isFlightDeparture(before) && isFlightArrival(after);
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		if (!isEditing || draggedIndex === null) return;
		event.preventDefault();

		const draggedItem = items[draggedIndex];
		const pair = getFlightPair(draggedItem);

		// === SAME-DAY FLIGHT: Move departure and arrival as a unit ===
		if (pair) {
			const isDraggingDeparture = isFlightDeparture(draggedItem);
			const departureIndex = isDraggingDeparture ? draggedIndex : pair.index;
			const arrivalIndex = isDraggingDeparture ? pair.index : draggedIndex;
			
			// Get the departure and arrival items
			const departureItem = items[departureIndex];
			const arrivalItem = items[arrivalIndex];
			
			// Calculate where to place the pair
			// The pair takes 2 slots, so adjust the drop index
			const newItems = [...items];
			
			// Remove both items (higher index first to preserve indices)
			const higherIdx = Math.max(departureIndex, arrivalIndex);
			const lowerIdx = Math.min(departureIndex, arrivalIndex);
			newItems.splice(higherIdx, 1);
			newItems.splice(lowerIdx, 1);
			
			// Adjust drop index based on what was removed
			let adjustedDrop = dropIndex;
			if (dropIndex > higherIdx) adjustedDrop -= 2;
			else if (dropIndex > lowerIdx) adjustedDrop -= 1;
			
			// Clamp to valid range (pair needs 2 slots)
			adjustedDrop = Math.max(0, Math.min(adjustedDrop, newItems.length));
			
			// Insert departure then arrival at the new position
			newItems.splice(adjustedDrop, 0, departureItem, arrivalItem);
			
			if (JSON.stringify(newItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
				onReorder?.(newItems);
			}
			
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		// === MULTI-DAY FLIGHT or NON-FLIGHT ITEM ===
		
		// Check if we're trying to drop between a flight pair - reject
		if (isDropBetweenFlightPair(dropIndex)) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		// Find lone departure (no pair on this day) - must stay last
		const loneDepartureIndex = items.findIndex(i => 
			isFlightDeparture(i) && !getFlightPair(i)
		);
		
		// Find lone arrival (no pair on this day) - must stay first
		const loneArrivalIndex = items.findIndex(i => 
			isFlightArrival(i) && !getFlightPair(i)
		);

		// If dragging a lone departure, it must stay at the end
		if (loneDepartureIndex === draggedIndex) {
			if (dropIndex !== items.length - 1) {
				draggedIndex = null;
				dragOverIndex = null;
				return;
			}
		}

		// If dragging a lone arrival, it must stay at the start
		if (loneArrivalIndex === draggedIndex) {
			if (dropIndex !== 0) {
				draggedIndex = null;
				dragOverIndex = null;
				return;
			}
		}

		// Can't drop after a lone departure (it must be last)
		if (loneDepartureIndex !== -1 && loneDepartureIndex !== draggedIndex) {
			if (dropIndex > loneDepartureIndex) {
				draggedIndex = null;
				dragOverIndex = null;
				return;
			}
		}

		// Can't drop before a lone arrival (it must be first)
		if (loneArrivalIndex !== -1 && loneArrivalIndex !== draggedIndex) {
			if (dropIndex <= loneArrivalIndex) {
				draggedIndex = null;
				dragOverIndex = null;
				return;
			}
		}

		// Perform the single-item move
		if (draggedIndex !== dropIndex) {
			const newItems = [...items];
			const [removed] = newItems.splice(draggedIndex, 1);
			newItems.splice(dropIndex, 0, removed);
			onReorder?.(newItems);
		}

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleModeChange(itemId: string, mode: TravelMode) {
		onTravelModeChange?.(itemId, mode);
	}

	// Context menu handlers
	function openContextMenu(e: MouseEvent, itemId: string) {
		e.preventDefault();
		e.stopPropagation();
		contextMenuX = e.clientX;
		contextMenuY = e.clientY;
		contextMenuItemId = itemId;
		contextMenuOpen = true;
	}

	function closeContextMenu() {
		contextMenuOpen = false;
		contextMenuItemId = null;
	}

	function handleRemoveFromMenu() {
		if (contextMenuItemId) {
			// Check if this is a stay item
			const item = items.find((i) => i.id === contextMenuItemId);
			if (item && isStayItem(item)) {
				// Show confirmation dialog for stay
				const stay = getStay(item.stayId);
				const stayName = stay?.name || 'this stay';
				const choice = confirm(
					`Would you like to remove just this instance of "${stayName}" from this day?\n\nClick "OK" to remove this instance only.\nClick "Cancel" to keep it.`
				);
				if (choice) {
					onRemoveItem?.(contextMenuItemId);
				}
			} else {
				onRemoveItem?.(contextMenuItemId);
			}
		}
		closeContextMenu();
	}

	function handleRemoveEntireStayFromMenu() {
		if (contextMenuItemId) {
			const item = items.find((i) => i.id === contextMenuItemId);
			if (item && isStayItem(item)) {
				const stay = getStay(item.stayId);
				const stayName = stay?.name || 'this stay';
				const confirmed = confirm(
					`Are you sure you want to remove "${stayName}" from ALL days of your trip?`
				);
				if (confirmed) {
					onRemoveEntireStay?.(item.stayId);
				}
			}
		}
		closeContextMenu();
	}

	function handleRemoveEntireTransportFromMenu() {
		if (contextMenuItemId) {
			const item = items.find((i) => i.id === contextMenuItemId);
			if (item && isTransportItem(item)) {
				const leg = getTransportLeg(item.transportLegId);
				const legName = leg?.carrier || 'this transport';
				const confirmed = confirm(
					`Are you sure you want to remove "${legName}" (both departure and arrival) from your trip?`
				);
				if (confirmed) {
					onRemoveEntireTransport?.(item.transportLegId);
				}
			}
		}
		closeContextMenu();
	}

	function handleMoveFromMenu() {
		if (contextMenuItemId) {
			onMoveItem?.(contextMenuItemId);
		}
		closeContextMenu();
	}

	function handleDuplicateFromMenu() {
		if (contextMenuItemId) {
			onDuplicateItem?.(contextMenuItemId);
		}
		closeContextMenu();
	}

	// Get the currently selected context menu item
	const contextMenuItem = $derived(contextMenuItemId ? items.find((i) => i.id === contextMenuItemId) : null);
	const isContextMenuItemStay = $derived(contextMenuItem ? isStayItem(contextMenuItem) : false);
	const isContextMenuItemTransport = $derived(contextMenuItem ? isTransportItem(contextMenuItem) : false);

	function getItemName(item: DailyItem): string {
		if (isStayItem(item)) {
			return getStay(item.stayId)?.name ?? 'Stay';
		}
		if (isActivityItem(item)) {
			return getActivity(item.activityId)?.name ?? 'Activity';
		}
		if (isFoodItem(item)) {
			return getFoodVenue(item.foodVenueId)?.name ?? 'Food';
		}
		if (isTransportItem(item)) {
			return getTransportLeg(item.transportLegId)?.carrier ?? 'Transport';
		}
		return 'Item';
	}

	// Filter items to display - hide duplicate stay bookends when there's nothing else
	const displayItems = $derived.by(() => {
		// Check if we should collapse duplicate stay bookends
		// Condition: all items are stays for the same stay, none are check-in/check-out
		if (items.length <= 1) return items;

		const allAreStays = items.every((item) => isStayItem(item));
		if (!allAreStays) return items;

		const stayItems = items.filter(isStayItem);
		const allSameStay = stayItems.every((item) => item.stayId === stayItems[0].stayId);
		const noneAreCheckInOut = stayItems.every((item) => !item.isCheckIn && !item.isCheckOut);

		if (allSameStay && noneAreCheckInOut) {
			// Only show the first stay item
			return [items[0]];
		}

		return items;
	});
</script>

<div class="item-list">
	{#each displayItems as item, index (item.id)}
		{@const prevItem = index > 0 ? displayItems[index - 1] : null}
		{@const prevLocation = prevItem ? getItemLocation(prevItem) : null}
		{@const currentLocation = getItemLocation(item)}
		{@const isDragging = draggedIndex === index}
		{@const isDragOver = dragOverIndex === index}
		{@const isSameLocation = prevLocation && currentLocation && 
			Math.abs(prevLocation.geo.latitude - currentLocation.geo.latitude) < 0.0001 && 
			Math.abs(prevLocation.geo.longitude - currentLocation.geo.longitude) < 0.0001}
		{@const prevIsFlight = prevItem && isTransportItem(prevItem) && 
			getTransportLeg(prevItem.transportLegId)?.mode === 'flight'}
		{@const currentIsFlight = isTransportItem(item) && 
			getTransportLeg(item.transportLegId)?.mode === 'flight'}
		{@const bothAreFlights = prevIsFlight && currentIsFlight}

		{#if index > 0 && prevLocation && currentLocation && !isSameLocation && !bothAreFlights}
			<TravelMargin
				fromLocation={prevLocation}
				toLocation={currentLocation}
				selectedMode={item.travelMode || 'driving'}
				{distanceUnit}
				{isEditing}
				onModeChange={(mode) => handleModeChange(item.id, mode)}
			/>
		{/if}

		<div
			class="item-wrapper"
			class:dragging={isDragging}
			class:drag-over={isDragOver}
			class:has-actions={isEditing}
			style="--item-color: {getItemColor(item)}"
			draggable={isEditing}
			ondragstart={(e) => handleDragStart(e, index)}
			ondragover={(e) => handleDragOver(e, index)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, index)}
			ondragend={handleDragEnd}
			oncontextmenu={(e) => isEditing && openContextMenu(e, item.id)}
			role={isEditing ? 'listitem' : undefined}
		>
			{#if isEditing}
				<div class="drag-handle" title="Drag to reorder">
					<Icon name="menu" size={16} />
				</div>
			{/if}
			<div class="item-content">
				{#if isStayItem(item)}
					{@const stay = getStay(item.stayId)}
					{@const badgeState = stayBadges?.get(item.id)}
					{#if stay}
						<StayCard
							{stay}
							isCheckIn={badgeState?.isCheckIn ?? item.isCheckIn}
							isCheckOut={badgeState?.isCheckOut ?? item.isCheckOut}
							{isEditing}
							onclick={() => onItemClick?.(item)}
							onCheckInTimeChange={(time) => onStayCheckInTimeChange?.(item.stayId, time)}
							onCheckOutTimeChange={(time) => onStayCheckOutTimeChange?.(item.stayId, time)}
						/>
					{/if}
				{:else if isActivityItem(item)}
					{@const activity = getActivity(item.activityId)}
					{#if activity}
						<ActivityCard
							{activity}
							{isEditing}
							onclick={() => onItemClick?.(item)}
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
						/>
					{/if}
				{:else if isTransportItem(item)}
					{@const leg = getTransportLeg(item.transportLegId)}
					{#if leg}
						<TransportCard
							{leg}
							isDeparture={item.isDeparture}
							isArrival={item.isArrival}
							{isEditing}
							onclick={() => onItemClick?.(item)}
						/>
						<!-- Show flight travel margin after flight departure if next item is arrival of same flight -->
						{#if item.isDeparture && leg.mode === 'flight' && items[index + 1]}
							{@const nextItem = items[index + 1]}
							{#if isTransportItem(nextItem) && nextItem.isArrival && nextItem.transportLegId === item.transportLegId}
								{@const originCode = leg.origin.name.match(/\(([A-Z]{3})\)/)?.[1]}
								{@const destCode = leg.destination.name.match(/\(([A-Z]{3})\)/)?.[1]}
								<FlightTravelMargin
									duration={leg.duration}
									originTimezone={leg.origin.timezone}
									destTimezone={leg.destination.timezone}
									departureDate={leg.departureDate}
									departureTime={leg.departureTime}
									arrivalTime={leg.arrivalTime}
									arrivalDate={leg.arrivalDate}
									{originCode}
									{destCode}
									flightNumber={leg.flightNumber}
								/>
							{/if}
						{/if}
					{/if}
				{/if}
			</div>
			{#if isEditing}
				<button
					type="button"
					class="more-button"
					title="More options"
					onclick={(e) => openContextMenu(e, item.id)}
				>
					<Icon name="more" size={16} />
				</button>
			{/if}
		</div>
	{/each}
</div>

<!-- Context Menu -->
<ContextMenu isOpen={contextMenuOpen} x={contextMenuX} y={contextMenuY} onclose={closeContextMenu}>
	<ContextMenuItem label="Duplicate" icon="copy" onclick={handleDuplicateFromMenu} />
	<ContextMenuItem label="Move to another day" icon="move" onclick={handleMoveFromMenu} />
	<ContextMenuItem label="Remove from day" icon="delete" variant="danger" onclick={handleRemoveFromMenu} />
	{#if isContextMenuItemStay}
		<ContextMenuItem label="Remove entire stay" icon="delete" variant="danger" onclick={handleRemoveEntireStayFromMenu} />
	{/if}
	{#if isContextMenuItemTransport}
		<ContextMenuItem label="Remove entire transport" icon="delete" variant="danger" onclick={handleRemoveEntireTransportFromMenu} />
	{/if}
</ContextMenu>

<style>
	.item-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.item-wrapper {
		--item-color: var(--color-gray-300);
		display: flex;
		align-items: stretch;
		border-radius: var(--radius-md);
		transition: opacity var(--transition-fast), transform var(--transition-fast);
	}

	.item-wrapper.dragging {
		opacity: 0.5;
	}

	.item-wrapper.drag-over {
		transform: translateY(4px);
	}

	.item-wrapper.drag-over::before {
		content: '';
		position: absolute;
		top: -4px;
		left: 0;
		right: 0;
		height: 3px;
		background: var(--color-primary);
		border-radius: var(--radius-full);
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		flex-shrink: 0;
		color: var(--text-tertiary);
		cursor: grab;
		border-radius: var(--radius-md) 0 0 var(--radius-md);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-right: none;
		margin-right: -1px;

		&:hover {
			color: var(--text-secondary);
			background: var(--surface-tertiary);
		}

		&:active {
			cursor: grabbing;
		}
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}

	.more-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		flex-shrink: 0;
		color: var(--text-tertiary);
		cursor: pointer;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-left: none;
		margin-left: -1px;
		transition: color var(--transition-fast), background-color var(--transition-fast);

		&:hover {
			color: var(--text-secondary);
			background: var(--surface-tertiary);
		}
	}

	.item-wrapper.has-actions .item-content :global(.card) {
		border-radius: 0;
	}
</style>
