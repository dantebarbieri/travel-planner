<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
		size?: 'sm' | 'md';
		children: Snippet;
	}

	let { variant = 'default', size = 'md', children }: Props = $props();
</script>

<span class="badge badge-{variant}" class:badge-sm={size === 'sm'}>
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.badge-default {
		background: var(--surface-secondary);
		color: var(--text-secondary);
	}

	.badge-success {
		background: color-mix(in oklch, var(--color-success), white 80%);
		color: color-mix(in oklch, var(--color-success), black 30%);
	}

	.badge-warning {
		background: color-mix(in oklch, var(--color-warning), white 80%);
		color: color-mix(in oklch, var(--color-warning), black 30%);
	}

	.badge-error {
		background: color-mix(in oklch, var(--color-error), white 80%);
		color: color-mix(in oklch, var(--color-error), black 30%);
	}

	.badge-info {
		background: color-mix(in oklch, var(--color-info), white 80%);
		color: color-mix(in oklch, var(--color-info), black 30%);
	}

	.badge-sm {
		padding: 2px var(--space-1);
		font-size: 0.625rem;
	}
</style>
