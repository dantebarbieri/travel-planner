<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		tags: string[];
		/** Maximum tags to show before collapsing */
		maxVisible?: number;
		/** Size variant */
		size?: 'sm' | 'md';
	}

	let { tags, maxVisible = 3, size = 'sm' }: Props = $props();

	const visibleTags = $derived(tags.slice(0, maxVisible));
	const hiddenCount = $derived(Math.max(0, tags.length - maxVisible));
</script>

{#if tags.length > 0}
	<div class="category-tag-list" class:size-sm={size === 'sm'} class:size-md={size === 'md'}>
		<Icon name="tag" size={size === 'sm' ? 10 : 12} />
		{#each visibleTags as tag, i}
			<span class="category-tag">{tag}</span>{#if i < visibleTags.length - 1}<span class="sep">·</span>{/if}
		{/each}
		{#if hiddenCount > 0}
			<span class="category-tag more">+{hiddenCount}</span>
		{/if}
	</div>
{/if}

<style>
	.category-tag-list {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		color: var(--text-secondary);
	}

	.category-tag {
		font-weight: 500;
	}

	.sep {
		color: var(--text-tertiary);
	}

	.size-sm {
		font-size: 0.7rem;
	}

	.size-sm .category-tag {
		font-size: 0.7rem;
	}

	.size-md {
		font-size: 0.8rem;
	}

	.size-md .category-tag {
		font-size: 0.8rem;
	}

	.category-tag.more {
		color: var(--text-tertiary);
		font-style: italic;
		font-weight: 400;
	}
</style>
