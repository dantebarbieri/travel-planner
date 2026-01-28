<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		value: string;
		options: Option[];
		onchange: (value: string) => void;
		disabled?: boolean;
	}

	let { value, options, onchange, disabled = false }: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		onchange(target.value);
	}
</script>

<select class="setting-select" {value} onchange={handleChange} {disabled}>
	{#each options as option}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>

<style>
	.setting-select {
		appearance: none;
		padding: var(--space-2) var(--space-6) var(--space-2) var(--space-3);
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--text-primary);
		background-color: var(--surface-primary);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-2) center;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		min-width: 140px;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&:hover:not(:disabled) {
			border-color: var(--border-color-strong);
		}

		&:focus {
			border-color: var(--color-primary);
			box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary), transparent 75%);
			outline: none;
		}

		&:disabled {
			background-color: var(--surface-secondary);
			cursor: not-allowed;
			opacity: 0.7;
		}
	}
</style>
