<script lang="ts">
	import type { PlaceTag, FoodTag } from '$lib/types/travel';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		tags: (PlaceTag | FoodTag)[];
		/** Maximum tags to show before collapsing */
		maxVisible?: number;
		/** Size variant */
		size?: 'sm' | 'md';
	}

	let { tags, maxVisible = 4, size = 'sm' }: Props = $props();

	// Tag display configuration
	const tagConfig: Record<string, { label: string; icon?: string }> = {
		// Place tags
		wifi: { label: 'WiFi', icon: 'wifi' },
		wheelchair_accessible: { label: 'Accessible', icon: 'accessible' },
		parking: { label: 'Parking', icon: 'car' },
		outdoor_seating: { label: 'Outdoor', icon: 'outdoor' },
		reservations_required: { label: 'Reservations', icon: 'calendar' },
		ticket_required: { label: 'Tickets', icon: 'ticket' },
		guided_tour: { label: 'Guided Tour', icon: 'guide' },
		audio_guide: { label: 'Audio Guide', icon: 'headphones' },
		family_friendly: { label: 'Family', icon: 'family' },
		pet_friendly: { label: 'Pet Friendly', icon: 'pet' },
		credit_cards: { label: 'Cards OK', icon: 'card' },
		cash_only: { label: 'Cash Only', icon: 'cash' },
		// Food tags
		takeout: { label: 'Takeout', icon: 'bag' },
		delivery: { label: 'Delivery', icon: 'delivery' },
		vegetarian_options: { label: 'Vegetarian', icon: 'leaf' },
		vegan_options: { label: 'Vegan', icon: 'leaf' },
		gluten_free_options: { label: 'Gluten-Free' },
		halal: { label: 'Halal' },
		kosher: { label: 'Kosher' },
		byob: { label: 'BYOB' }
	};

	const visibleTags = $derived(tags.slice(0, maxVisible));
	const hiddenCount = $derived(Math.max(0, tags.length - maxVisible));

	function getTagInfo(tag: string) {
		return tagConfig[tag] || { label: tag.replace(/_/g, ' ') };
	}
</script>

{#if tags.length > 0}
	<div class="tag-list" class:size-sm={size === 'sm'} class:size-md={size === 'md'}>
		{#each visibleTags as tag}
			{@const info = getTagInfo(tag)}
			<span class="tag">
				{#if info.icon}
					<Icon name={info.icon} size={size === 'sm' ? 10 : 12} />
				{/if}
				{info.label}
			</span>
		{/each}
		{#if hiddenCount > 0}
			<span class="tag more">+{hiddenCount}</span>
		{/if}
	</div>
{/if}

<style>
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 6px;
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.size-sm .tag {
		font-size: 0.65rem;
		padding: 1px 4px;
	}

	.size-md .tag {
		font-size: 0.75rem;
		padding: 2px 6px;
	}

	.tag.more {
		color: var(--text-tertiary);
		font-style: italic;
	}
</style>
