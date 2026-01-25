<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		hoverable?: boolean;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		onclick?: () => void;
		children: Snippet;
	}

	let { hoverable = false, padding = 'md', onclick, children }: Props = $props();
</script>

{#if onclick}
	<button
		type="button"
		class="card card-padding-{padding}"
		class:card-hover={hoverable}
		class:card-clickable={!!onclick}
		{onclick}
	>
		{@render children()}
	</button>
{:else}
	<div class="card card-padding-{padding}" class:card-hover={hoverable}>
		{@render children()}
	</div>
{/if}

<style>
	.card {
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		text-align: left;
		width: 100%;
	}

	.card-padding-none {
		padding: 0;
	}

	.card-padding-sm {
		padding: var(--space-2);
	}

	.card-padding-md {
		padding: var(--space-4);
	}

	.card-padding-lg {
		padding: var(--space-6);
	}

	.card-hover {
		transition:
			box-shadow var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			box-shadow: var(--shadow-md);
			border-color: var(--border-color-strong);
		}
	}

	.card-clickable {
		cursor: pointer;
		font: inherit;

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}
</style>
