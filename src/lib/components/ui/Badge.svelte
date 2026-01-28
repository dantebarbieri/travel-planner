<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
		size?: 'sm' | 'md';
		title?: string;
		children: Snippet;
	}

	let { variant = 'default', size = 'md', title, children }: Props = $props();
</script>

<span class="badge badge-{variant}" class:badge-sm={size === 'sm'} {title}>
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

	.badge-primary {
		background: color-mix(in oklch, var(--color-primary), var(--badge-bg-mix) var(--badge-bg-mix-amount));
		color: color-mix(in oklch, var(--color-primary), var(--badge-text-mix) var(--badge-text-mix-amount));
	}

	.badge-success {
		background: color-mix(in oklch, var(--color-success), var(--badge-bg-mix) var(--badge-bg-mix-amount));
		color: color-mix(in oklch, var(--color-success), var(--badge-text-mix) var(--badge-text-mix-amount));
	}

	.badge-warning {
		background: color-mix(in oklch, var(--color-warning), var(--badge-bg-mix) var(--badge-bg-mix-amount));
		color: color-mix(in oklch, var(--color-warning), var(--badge-text-mix) var(--badge-text-mix-amount));
	}

	.badge-error {
		background: color-mix(in oklch, var(--color-error), var(--badge-bg-mix) var(--badge-bg-mix-amount));
		color: color-mix(in oklch, var(--color-error), var(--badge-text-mix) var(--badge-text-mix-amount));
	}

	.badge-info {
		background: color-mix(in oklch, var(--color-info), var(--badge-bg-mix) var(--badge-bg-mix-amount));
		color: color-mix(in oklch, var(--color-info), var(--badge-text-mix) var(--badge-text-mix-amount));
	}

	.badge-sm {
		padding: 2px var(--space-1);
		font-size: 0.625rem;
	}
</style>
