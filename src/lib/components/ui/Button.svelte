<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		title?: string;
		onclick?: () => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		title,
		onclick,
		children
	}: Props = $props();

	const classes = $derived(
		[
			'btn',
			`btn-${variant}`,
			size !== 'md' && `btn-${size}`,
			loading && 'btn-loading'
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<button class={classes} {type} disabled={disabled || loading} {onclick} {title}>
	{#if loading}
		<span class="spinner"></span>
	{/if}
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast),
			color var(--transition-fast),
			opacity var(--transition-fast);

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}

	.btn-primary {
		background: var(--color-primary);
		color: var(--text-inverse);

		&:hover:not(:disabled) {
			background: var(--color-primary-dark);
		}
	}

	.btn-secondary {
		background: var(--surface-primary);
		color: var(--text-primary);
		border-color: var(--border-color);

		&:hover:not(:disabled) {
			background: var(--surface-secondary);
			border-color: var(--border-color-strong);
		}
	}

	.btn-ghost {
		background: transparent;
		color: var(--text-primary);

		&:hover:not(:disabled) {
			background: var(--surface-secondary);
		}
	}

	.btn-danger {
		background: var(--color-error);
		color: var(--text-inverse);

		&:hover:not(:disabled) {
			background: color-mix(in oklch, var(--color-error), black 15%);
		}
	}

	.btn-sm {
		padding: var(--space-1) var(--space-2);
		font-size: 0.75rem;
	}

	.btn-lg {
		padding: var(--space-3) var(--space-6);
		font-size: 1rem;
	}

	.btn-loading {
		position: relative;
		color: transparent;
	}

	.spinner {
		position: absolute;
		width: 1em;
		height: 1em;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.btn-loading .spinner {
		color: var(--text-inverse);
	}

	.btn-secondary.btn-loading .spinner,
	.btn-ghost.btn-loading .spinner {
		color: var(--text-primary);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
