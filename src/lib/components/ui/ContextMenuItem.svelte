<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		label: string;
		icon?: string;
		variant?: 'default' | 'danger';
		disabled?: boolean;
		onclick: () => void;
	}

	let { label, icon, variant = 'default', disabled = false, onclick }: Props = $props();

	function handleClick() {
		if (!disabled) {
			onclick();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}
</script>

<button
	type="button"
	class="context-menu-item"
	class:danger={variant === 'danger'}
	class:disabled
	onclick={handleClick}
	onkeydown={handleKeydown}
	role="menuitem"
	tabindex={disabled ? -1 : 0}
	aria-disabled={disabled}
>
	{#if icon}
		<Icon name={icon} size={16} />
	{/if}
	<span class="label">{label}</span>
</button>

<style>
	.context-menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
		transition: background-color var(--transition-fast);

		&:hover:not(.disabled) {
			background: var(--surface-secondary);
		}

		&.danger {
			color: var(--color-error);

			&:hover:not(.disabled) {
				background: color-mix(in oklch, var(--color-error), transparent 90%);
			}
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.label {
		flex: 1;
	}
</style>
