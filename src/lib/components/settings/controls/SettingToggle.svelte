<script lang="ts">
	interface Props {
		checked: boolean;
		onchange: (checked: boolean) => void;
		disabled?: boolean;
	}

	let { checked, onchange, disabled = false }: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange(target.checked);
	}
</script>

<label class="toggle" class:disabled>
	<input type="checkbox" {checked} onchange={handleChange} {disabled} />
	<span class="toggle-track">
		<span class="toggle-thumb"></span>
	</span>
</label>

<style>
	.toggle {
		display: inline-flex;
		cursor: pointer;

		&.disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}
	}

	input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-track {
		position: relative;
		width: 40px;
		height: 22px;
		background: var(--border-color-strong);
		border-radius: var(--radius-full);
		transition: background-color var(--transition-fast);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: white;
		border-radius: var(--radius-full);
		box-shadow: var(--shadow-sm);
		transition: transform var(--transition-fast);
	}

	input:checked + .toggle-track {
		background: var(--color-primary);
	}

	input:checked + .toggle-track .toggle-thumb {
		transform: translateX(18px);
	}

	input:focus-visible + .toggle-track {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
