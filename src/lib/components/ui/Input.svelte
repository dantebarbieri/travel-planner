<script lang="ts">
	interface Props {
		type?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'password';
		value?: string;
		placeholder?: string;
		label?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		id?: string;
		oninput?: (value: string) => void;
		onchange?: (value: string) => void;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		label,
		error,
		disabled = false,
		required = false,
		name,
		id,
		oninput,
		onchange
	}: Props = $props();

	const inputId = $derived(id || name || `input-${Math.random().toString(36).slice(2)}`);

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		oninput?.(target.value);
	}

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange?.(target.value);
	}
</script>

<div class="form-field" class:has-error={!!error}>
	{#if label}
		<label class="label" for={inputId}>
			{label}
			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
	{/if}
	<input
		{type}
		{value}
		{placeholder}
		{disabled}
		{required}
		{name}
		id={inputId}
		class="input"
		oninput={handleInput}
		onchange={handleChange}
	/>
	{#if error}
		<span class="error-message">{error}</span>
	{/if}
</div>

<style>
	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.required {
		color: var(--color-error);
	}

	.input {
		display: block;
		width: 100%;
		padding: var(--space-2) var(--space-3);
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

		&:disabled {
			background: var(--surface-secondary);
			cursor: not-allowed;
		}
	}

	.has-error .input {
		border-color: var(--color-error);

		&:focus {
			box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-error), transparent 75%);
		}
	}

	.error-message {
		font-size: 0.75rem;
		color: var(--color-error);
	}
</style>
