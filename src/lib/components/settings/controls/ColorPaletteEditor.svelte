<script lang="ts">
	import type { CustomColorPalette } from '$lib/types/settings';
	import { generateTripId } from '$lib/utils/ids';
	import { oklchToHex, hexToOklch } from '$lib/utils/colors';

	interface Props {
		palette?: CustomColorPalette;
		onsave: (palette: CustomColorPalette) => void;
		oncancel: () => void;
	}

	let { palette, onsave, oncancel }: Props = $props();

	// Default colors for new palette (8 colors for stay segments)
	const defaultColors = [
		'oklch(0.7 0.15 280)', // Purple
		'oklch(0.65 0.2 145)', // Green
		'oklch(0.7 0.18 50)', // Orange
		'oklch(0.6 0.15 230)', // Blue
		'oklch(0.7 0.18 20)', // Red
		'oklch(0.7 0.15 180)', // Cyan
		'oklch(0.65 0.15 320)', // Pink
		'oklch(0.7 0.18 90)' // Yellow
	];

	// Initialize state from props
	const initialName = palette?.name ?? '';
	const initialColors = palette?.colors ?? [...defaultColors];

	let name = $state(initialName);
	let colors = $state<string[]>([...initialColors]);

	let editingColorIndex = $state<number | null>(null);

	function handleColorChange(index: number, hexValue: string) {
		// Convert hex from color picker to oklch for storage
		colors[index] = hexToOklch(hexValue);
	}

	function addColor() {
		if (colors.length < 12) {
			colors = [...colors, 'oklch(0.6 0.15 200)'];
		}
	}

	function removeColor(index: number) {
		if (colors.length > 2) {
			colors = colors.filter((_, i) => i !== index);
		}
	}

	function handleSave() {
		if (!name.trim()) return;

		onsave({
			id: palette?.id ?? generateTripId(),
			name: name.trim(),
			colors: [...colors]
		});
	}

</script>

<div class="palette-editor">
	<div class="editor-header">
		<h4 class="editor-title">{palette ? 'Edit Palette' : 'New Palette'}</h4>
	</div>

	<div class="editor-body">
		<div class="form-field">
			<label for="palette-name" class="field-label">Name</label>
			<input
				id="palette-name"
				type="text"
				class="field-input"
				bind:value={name}
				placeholder="e.g., Beach Vacation"
			/>
		</div>

		<div class="form-field">
			<div class="field-header">
				<span class="field-label">Colors</span>
				<span class="color-count">{colors.length} colors</span>
			</div>

			<div class="color-grid">
				{#each colors as color, index}
					<div class="color-item">
						<input
							type="color"
							class="color-input"
							value={oklchToHex(color)}
							onchange={(e) => handleColorChange(index, (e.target as HTMLInputElement).value)}
							title="Color {index + 1}"
						/>
						<button
							type="button"
							class="color-remove"
							onclick={() => removeColor(index)}
							disabled={colors.length <= 2}
							title="Remove color"
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/each}

				{#if colors.length < 12}
					<button type="button" class="add-color-btn" onclick={addColor} title="Add color">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</button>
				{/if}
			</div>

			<p class="field-hint">Drag colors to reorder. Minimum 2 colors, maximum 12.</p>
		</div>
	</div>

	<div class="editor-footer">
		<button type="button" class="btn-secondary" onclick={oncancel}>Cancel</button>
		<button type="button" class="btn-primary" onclick={handleSave} disabled={!name.trim()}>
			{palette ? 'Save Changes' : 'Create Palette'}
		</button>
	</div>
</div>

<style>
	.palette-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.editor-header {
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border-color);
	}

	.editor-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.editor-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.field-input {
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		color: var(--text-primary);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);

		&:focus {
			border-color: var(--color-primary);
			outline: none;
			box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary), transparent 75%);
		}
	}

	.color-count {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.color-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.color-item {
		position: relative;

		&:hover .color-remove {
			opacity: 1;
		}
	}

	.color-input {
		width: 40px;
		height: 40px;
		padding: 0;
		border: 2px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		background: none;

		&::-webkit-color-swatch-wrapper {
			padding: 0;
		}

		&::-webkit-color-swatch {
			border: none;
			border-radius: calc(var(--radius-md) - 2px);
		}

		&::-moz-color-swatch {
			border: none;
			border-radius: calc(var(--radius-md) - 2px);
		}

		&:focus {
			border-color: var(--color-primary);
			outline: none;
		}
	}

	.color-remove {
		position: absolute;
		top: -6px;
		right: -6px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		color: var(--text-tertiary);
		cursor: pointer;
		opacity: 0;
		transition: opacity var(--transition-fast);

		&:hover:not(:disabled) {
			background: var(--color-error);
			border-color: var(--color-error);
			color: white;
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0 !important;
		}
	}

	.add-color-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--surface-secondary);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary);
		}
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
	}

	.editor-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border-color);
	}

	.btn-secondary {
		padding: var(--space-2) var(--space-4);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;

		&:hover {
			background: var(--surface-secondary);
		}
	}

	.btn-primary {
		padding: var(--space-2) var(--space-4);
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;

		&:hover:not(:disabled) {
			background: var(--color-primary-dark);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
