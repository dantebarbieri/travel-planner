<script lang="ts">
	interface Option {
		value: string;
		label: string;
		icon?: string;
	}

	interface Props {
		value: string;
		options: Option[];
		onchange: (value: string) => void;
		name: string;
		disabled?: boolean;
	}

	let { value, options, onchange, name, disabled = false }: Props = $props();

	function handleChange(optionValue: string) {
		if (!disabled) {
			onchange(optionValue);
		}
	}
</script>

<div class="radio-group" role="radiogroup">
	{#each options as option}
		<button
			type="button"
			class="radio-option"
			class:selected={value === option.value}
			class:disabled
			onclick={() => handleChange(option.value)}
			role="radio"
			aria-checked={value === option.value}
		>
			{#if option.icon}
				<span class="option-icon">{@html option.icon}</span>
			{/if}
			<span class="option-label">{option.label}</span>
		</button>
	{/each}
</div>

<style>
	.radio-group {
		display: flex;
		gap: 2px;
		padding: 2px;
		background: var(--surface-secondary);
		border-radius: var(--radius-md);
	}

	.radio-option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-radius: calc(var(--radius-md) - 2px);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover:not(.selected):not(.disabled) {
			color: var(--text-primary);
		}

		&.selected {
			background: var(--surface-primary);
			color: var(--text-primary);
			box-shadow: var(--shadow-sm);
		}

		&.disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}
	}

	.option-icon {
		display: flex;
		align-items: center;
		justify-content: center;

		:global(svg) {
			width: 16px;
			height: 16px;
		}
	}

	.option-label {
		white-space: nowrap;
	}
</style>
