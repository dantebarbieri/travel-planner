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
	import StayCard from '$lib/components/items/StayCard.svelte';
	import ActivityCard from '$lib/components/items/ActivityCard.svelte';
	import FoodCard from '$lib/components/items/FoodCard.svelte';
	import TransportCard from '$lib/components/items/TransportCard.svelte';
	import TravelMargin from '$lib/components/travel/TravelMargin.svelte';
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
		cityId?: CityId;
		/** The stay segment ID for this day (used for by-stay coloring) */
		segmentId?: string;
		isEditing?: boolean;
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
		items,
		stays,
		activities,
		foodVenues,
		transportLegs,
		colorScheme,
		cityId,
		segmentId,
		isEditing = false,
		onReorder,
		onItemClick,
		onRemoveItem,
		onRemoveEntireStay,
		onRemoveEntireTransport,
		onMoveItem,
		onDuplicateItem,
		onTravelModeChange
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
			return leg?.destination;
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

	function handleDrop(event: DragEvent, dropIndex: number) {
		if (!isEditing || draggedIndex === null) return;
		event.preventDefault();

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
</script>

<div class="item-list">
	{#each items as item, index (item.id)}
		{@const prevItem = index > 0 ? items[index - 1] : null}
		{@const prevLocation = prevItem ? getItemLocation(prevItem) : null}
		{@const currentLocation = getItemLocation(item)}
		{@const isDragging = draggedIndex === index}
		{@const isDragOver = dragOverIndex === index}

		{#if index > 0 && prevLocation && currentLocation}
			<TravelMargin
				fromLocation={prevLocation}
				toLocation={currentLocation}
				selectedMode={item.travelMode || 'driving'}
				estimates={item.travelFromPrevious ? [item.travelFromPrevious] : []}
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
					{#if stay}
						<StayCard
							{stay}
							isCheckIn={item.isCheckIn}
							isCheckOut={item.isCheckOut}
							{isEditing}
							onclick={() => onItemClick?.(item)}
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
