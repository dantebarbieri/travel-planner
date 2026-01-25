<script lang="ts" generics="T">
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		placeholder?: string;
		searchFn: (query: string) => Promise<T[]>;
		renderItem: (item: T) => string;
		getItemId: (item: T) => string;
		onSelect: (item: T) => void;
		debounceMs?: number;
		minChars?: number;
	}

	let {
		placeholder = 'Search...',
		searchFn,
		renderItem,
		getItemId,
		onSelect,
		debounceMs = 300,
		minChars = 2
	}: Props = $props();

	let query = $state('');
	let results = $state<T[]>([]);
	let isLoading = $state(false);
	let isOpen = $state(false);
	let selectedIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function performSearch() {
		if (query.length < minChars) {
			results = [];
			isOpen = false;
			return;
		}

		isLoading = true;
		try {
			results = await searchFn(query);
			isOpen = results.length > 0;
			selectedIndex = -1;
		} catch (e) {
			console.error('Search failed:', e);
			results = [];
		} finally {
			isLoading = false;
		}
	}

	function handleInput() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(performSearch, debounceMs);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && results[selectedIndex]) {
					selectItem(results[selectedIndex]);
				}
				break;
			case 'Escape':
				isOpen = false;
				selectedIndex = -1;
				break;
		}
	}

	function selectItem(item: T) {
		onSelect(item);
		query = '';
		results = [];
		isOpen = false;
		selectedIndex = -1;
	}

	function handleBlur() {
		// Delay to allow click on results
		setTimeout(() => {
			isOpen = false;
		}, 200);
	}
</script>

<div class="search-autocomplete">
	<div class="search-input-wrapper">
		<Icon name="search" size={18} class="search-icon" />
		<input
			type="search"
			class="search-input"
			{placeholder}
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={() => results.length > 0 && (isOpen = true)}
			autocomplete="off"
		/>
		{#if isLoading}
			<span class="loading-spinner"></span>
		{/if}
	</div>

	{#if isOpen && results.length > 0}
		<ul class="results-list" role="listbox">
			{#each results as item, index (getItemId(item))}
				<li
					class="result-item"
					class:selected={index === selectedIndex}
					role="option"
					aria-selected={index === selectedIndex}
				>
					<button type="button" class="result-button" onclick={() => selectItem(item)}>
						{renderItem(item)}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search-autocomplete {
		position: relative;
		width: 100%;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input-wrapper :global(.search-icon) {
		position: absolute;
		left: var(--space-3);
		color: var(--text-tertiary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--space-2) var(--space-3) var(--space-2) calc(var(--space-3) + 24px);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--text-primary);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&::placeholder {
			color: var(--text-tertiary);
		}

		&:focus {
			border-color: var(--color-primary);
			box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary), transparent 75%);
			outline: none;
		}
	}

	.loading-spinner {
		position: absolute;
		right: var(--space-3);
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color);
		border-right-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.results-list {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: var(--z-dropdown);
		margin: var(--space-1) 0 0;
		padding: var(--space-1);
		list-style: none;
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		max-height: 300px;
		overflow-y: auto;
	}

	.result-item {
		border-radius: var(--radius-sm);

		&.selected {
			background: var(--surface-secondary);
		}
	}

	.result-button {
		display: block;
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-primary);

		&:hover {
			background: var(--surface-secondary);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
