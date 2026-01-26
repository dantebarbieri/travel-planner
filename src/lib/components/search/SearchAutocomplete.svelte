<script lang="ts" generics="T">
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		placeholder?: string;
		label?: string;
		searchFn: (query: string) => Promise<T[]>;
		renderItem: (item: T) => { name: string; subtitle?: string; icon?: string };
		getItemId: (item: T) => string;
		onSelect: (item: T) => void;
		debounceMs?: number;
		minChars?: number;
		required?: boolean;
		value?: string;
		selectedItem?: T | null;
	}

	let {
		placeholder = 'Search...',
		label,
		searchFn,
		renderItem,
		getItemId,
		onSelect,
		debounceMs = 300,
		minChars = 2,
		required = false,
		value = $bindable(''),
		selectedItem = $bindable(null)
	}: Props = $props();

	let results = $state<T[]>([]);
	let isLoading = $state(false);
	let isOpen = $state(false);
	let selectedIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let inputRef = $state<HTMLInputElement | null>(null);

	async function performSearch() {
		if (value.length < minChars) {
			results = [];
			isOpen = false;
			return;
		}

		isLoading = true;
		try {
			results = await searchFn(value);
			isOpen = true;
			selectedIndex = -1;
		} catch (e) {
			console.error('Search failed:', e);
			results = [];
		} finally {
			isLoading = false;
		}
	}

	function handleInput() {
		// Clear selection when user types
		selectedItem = null;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(performSearch, debounceMs);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen && e.key === 'ArrowDown' && value.length >= minChars) {
			performSearch();
			return;
		}

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
		selectedItem = item;
		const rendered = renderItem(item);
		value = rendered.name;
		onSelect(item);
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

	function handleFocus() {
		if (value.length >= minChars && !selectedItem) {
			performSearch();
		}
	}

	function handleClear() {
		value = '';
		selectedItem = null;
		results = [];
		isOpen = false;
		inputRef?.focus();
	}

	const showWarning = $derived(
		value.length >= minChars &&
		!isLoading &&
		!selectedItem &&
		results.length === 0 &&
		!isOpen
	);

	const hasValidSelection = $derived(selectedItem !== null);
</script>

<div class="search-autocomplete">
	{#if label}
		<label class="label" for="search-input">{label}{required ? ' *' : ''}</label>
	{/if}

	<div class="search-input-wrapper" class:has-value={hasValidSelection} class:warning={showWarning}>
		<Icon name="search" size={18} />
		<input
			bind:this={inputRef}
			id="search-input"
			type="text"
			class="search-input"
			{placeholder}
			bind:value
			{required}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={handleFocus}
			autocomplete="off"
			aria-expanded={isOpen}
			aria-haspopup="listbox"
			aria-autocomplete="list"
		/>
		{#if isLoading}
			<span class="loading-spinner"></span>
		{:else if value}
			<button type="button" class="clear-btn" onclick={handleClear} aria-label="Clear">
				<Icon name="close" size={14} />
			</button>
		{/if}
	</div>

	{#if showWarning}
		<p class="warning-text">No matches found. Please select from the dropdown.</p>
	{/if}

	{#if isOpen && results.length > 0}
		<ul class="results-list" role="listbox">
			{#each results as item, index (getItemId(item))}
				{@const rendered = renderItem(item)}
				<li
					class="result-item"
					class:selected={index === selectedIndex}
					role="option"
					aria-selected={index === selectedIndex}
				>
					<button type="button" class="result-button" onclick={() => selectItem(item)}>
						{#if rendered.icon}
							<Icon name={rendered.icon} size={16} />
						{/if}
						<div class="result-text">
							<span class="result-name">{rendered.name}</span>
							{#if rendered.subtitle}
								<span class="result-subtitle">{rendered.subtitle}</span>
							{/if}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{:else if isOpen && value.length >= minChars && !isLoading && results.length === 0}
		<div class="results-list no-results">
			<p>No results found for "{value}"</p>
		</div>
	{/if}
</div>

<style>
	.search-autocomplete {
		position: relative;
		width: 100%;
	}

	.label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--space-1);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&:focus-within {
			border-color: var(--color-primary);
			box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary), transparent 75%);
		}

		&.has-value {
			border-color: var(--color-success);
		}

		&.warning {
			border-color: var(--color-warning);
		}
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 0.875rem;
		color: var(--text-primary);
		outline: none;

		&::placeholder {
			color: var(--text-tertiary);
		}
	}

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		background: var(--surface-secondary);
		border: none;
		border-radius: var(--radius-full);
		color: var(--text-tertiary);
		cursor: pointer;
		transition: color var(--transition-fast), background-color var(--transition-fast);

		&:hover {
			background: var(--surface-tertiary);
			color: var(--text-primary);
		}
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color);
		border-right-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.warning-text {
		font-size: 0.75rem;
		color: var(--color-warning);
		margin: var(--space-1) 0 0;
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

		&.no-results {
			padding: var(--space-4);
			text-align: center;
			color: var(--text-tertiary);
			font-size: 0.875rem;

			& p {
				margin: 0;
			}
		}
	}

	.result-item {
		border-radius: var(--radius-sm);

		&.selected {
			background: var(--surface-secondary);
		}
	}

	.result-button {
		display: flex;
		align-items: center;
		gap: var(--space-2);
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

	.result-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.result-name {
		font-weight: 500;
	}

	.result-subtitle {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
