<script lang="ts">
	import type { CustomColorScheme } from '$lib/types/settings';
	import type { KindColors } from '$lib/types/travel';
	import { generateTripId } from '$lib/utils/ids';
	import { oklchToHex, hexToOklch, defaultKindColors, defaultPaletteColors } from '$lib/utils/colors';

	interface Props {
		scheme?: CustomColorScheme;
		onsave: (scheme: CustomColorScheme) => void;
		oncancel: () => void;
	}

	let { scheme, onsave, oncancel }: Props = $props();

	type KindKey = keyof KindColors;

	const kindLabels: Record<KindKey, string> = {
		stay: 'Stays',
		activity: 'Activities',
		food: 'Food & Dining',
		transport: 'Transport',
		flight: 'Flights'
	};

	const kindOrder: KindKey[] = ['stay', 'activity', 'food', 'transport', 'flight'];

	// Local state for editing
	let name = $state('');
	let kindColors = $state<KindColors>({ ...defaultKindColors });
	let paletteColors = $state<string[]>([]);

	// Sync state with props when scheme changes
	$effect(() => {
		name = scheme?.name ?? '';
		kindColors = scheme?.kindColors ? { ...scheme.kindColors } : { ...defaultKindColors };
		paletteColors = scheme?.paletteColors ? [...scheme.paletteColors] : [...defaultPaletteColors];
	});

	// Drag and drop state for palette
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	// ============ Kind Colors Handlers ============

	function handleKindColorChange(kind: KindKey, hexValue: string) {
		kindColors = { ...kindColors, [kind]: hexToOklch(hexValue) };
	}

	function resetKindColor(kind: KindKey) {
		kindColors = { ...kindColors, [kind]: defaultKindColors[kind] };
	}

	function resetAllKindColors() {
		kindColors = { ...defaultKindColors };
	}

	// ============ Palette Colors Handlers ============

	function handlePaletteColorChange(index: number, hexValue: string) {
		paletteColors[index] = hexToOklch(hexValue);
	}

	function addPaletteColor() {
		if (paletteColors.length < 12) {
			paletteColors = [...paletteColors, 'oklch(0.6 0.15 200)'];
		}
	}

	function removePaletteColor(index: number) {
		if (paletteColors.length > 2) {
			paletteColors = paletteColors.filter((_, i) => i !== index);
		}
	}

	function resetPaletteColors() {
		paletteColors = [...defaultPaletteColors];
	}

	// Drag and drop handlers for palette
	function handleDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', index.toString());
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			dragOverIndex = index;
		}
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			const newColors = [...paletteColors];
			const [draggedColor] = newColors.splice(draggedIndex, 1);
			newColors.splice(index, 0, draggedColor);
			paletteColors = newColors;
		}
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	// ============ Save Handler ============

	function handleSave() {
		if (!name.trim()) return;

		onsave({
			id: scheme?.id ?? generateTripId(),
			name: name.trim(),
			kindColors: { ...kindColors },
			paletteColors: [...paletteColors]
		});
	}

	function resetAll() {
		kindColors = { ...defaultKindColors };
		paletteColors = [...defaultPaletteColors];
	}
</script>

<div class="scheme-editor">
	<div class="editor-header">
		<h4 class="editor-title">{scheme ? 'Edit Color Scheme' : 'New Color Scheme'}</h4>
	</div>

	<div class="editor-body">
		<!-- Name Field -->
		<div class="form-field">
			<label for="scheme-name" class="field-label">Scheme Name</label>
			<input
				id="scheme-name"
				type="text"
				class="field-input"
				bind:value={name}
				placeholder="e.g., Tropical Vacation"
			/>
		</div>

		<!-- Kind Colors Section -->
		<div class="form-section">
			<div class="section-header">
				<span class="section-label">Item Type Colors</span>
				<button
					type="button"
					class="reset-btn"
					onclick={resetAllKindColors}
					title="Reset to default"
				>
					Reset
				</button>
			</div>
			<p class="section-hint">Colors used in "By Type" display mode</p>

			<div class="kind-list" role="list">
				{#each kindOrder as kind}
					<div class="kind-item" role="listitem">
						<div class="kind-info">
							<div
								class="kind-color-preview"
								style="background: {kindColors[kind]}"
							></div>
							<span class="kind-label">{kindLabels[kind]}</span>
						</div>
						<div class="kind-controls">
							<input
								type="color"
								class="color-picker"
								value={oklchToHex(kindColors[kind])}
								onchange={(e) => handleKindColorChange(kind, (e.target as HTMLInputElement).value)}
								title="Pick color for {kindLabels[kind]}"
							/>
							<button
								type="button"
								class="reset-kind-btn"
								onclick={() => resetKindColor(kind)}
								title="Reset to default"
								disabled={kindColors[kind] === defaultKindColors[kind]}
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
									<path d="M21 3v5h-5" />
									<path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
									<path d="M8 16H3v5" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Palette Colors Section -->
		<div class="form-section">
			<div class="section-header">
				<span class="section-label">Stay Palette Colors</span>
				<div class="section-actions">
					<button
						type="button"
						class="reset-btn"
						onclick={resetPaletteColors}
						title="Reset to default"
					>
						Reset
					</button>
					<span class="color-count">{paletteColors.length} colors</span>
				</div>
			</div>
			<p class="section-hint">Colors used in "By Stay" display mode. Each stay gets a unique color.</p>

			<div class="color-grid" role="list">
				{#each paletteColors as color, index}
					<div
						class="color-item"
						class:dragging={draggedIndex === index}
						class:drag-over={dragOverIndex === index}
						draggable="true"
						role="listitem"
						ondragstart={(e) => handleDragStart(e, index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
					>
						<div class="drag-handle" title="Drag to reorder">
							<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
								<circle cx="2" cy="2" r="1.5" />
								<circle cx="8" cy="2" r="1.5" />
								<circle cx="2" cy="7" r="1.5" />
								<circle cx="8" cy="7" r="1.5" />
								<circle cx="2" cy="12" r="1.5" />
								<circle cx="8" cy="12" r="1.5" />
							</svg>
						</div>
						<input
							type="color"
							class="color-input"
							value={oklchToHex(color)}
							onchange={(e) => handlePaletteColorChange(index, (e.target as HTMLInputElement).value)}
							title="Color {index + 1}"
						/>
						<button
							type="button"
							class="color-remove"
							onclick={() => removePaletteColor(index)}
							disabled={paletteColors.length <= 2}
							title="Remove color"
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/each}

				{#if paletteColors.length < 12}
					<button type="button" class="add-color-btn" onclick={addPaletteColor} title="Add color">
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
			{scheme ? 'Save Changes' : 'Create Scheme'}
		</button>
	</div>
</div>

<style>
	.scheme-editor {
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
		gap: var(--space-5);
		max-height: 60vh;
		overflow-y: auto;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--surface-secondary);
		border-radius: var(--radius-md);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.section-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.section-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
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

	.reset-btn {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-primary);
		background: transparent;
		border: none;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		cursor: pointer;

		&:hover {
			background: color-mix(in oklch, var(--color-primary), transparent 90%);
		}
	}

	.color-count {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* Kind Colors List */
	.kind-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.kind-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2);
		background: var(--surface-primary);
		border-radius: var(--radius-sm);
	}

	.kind-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.kind-color-preview {
		width: 20px;
		height: 20px;
		border-radius: var(--radius-sm);
		border: 1px solid color-mix(in oklch, var(--text-primary), transparent 80%);
	}

	.kind-label {
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.kind-controls {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.color-picker {
		width: 28px;
		height: 28px;
		padding: 0;
		border: 2px solid var(--border-color);
		border-radius: var(--radius-sm);
		cursor: pointer;
		background: none;

		&::-webkit-color-swatch-wrapper {
			padding: 0;
		}

		&::-webkit-color-swatch {
			border: none;
			border-radius: calc(var(--radius-sm) - 2px);
		}

		&::-moz-color-swatch {
			border: none;
			border-radius: calc(var(--radius-sm) - 2px);
		}

		&:focus {
			border-color: var(--color-primary);
			outline: none;
		}
	}

	.reset-kind-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover:not(:disabled) {
			color: var(--color-primary);
			border-color: var(--color-primary);
		}

		&:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}
	}

	/* Palette Colors Grid */
	.color-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.color-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1);
		background: var(--surface-primary);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		cursor: grab;
		transition: 
			border-color var(--transition-fast),
			opacity var(--transition-fast),
			transform var(--transition-fast);

		&:hover .color-remove {
			opacity: 1;
		}

		&.dragging {
			opacity: 0.5;
			cursor: grabbing;
		}

		&.drag-over {
			border-color: var(--color-primary);
			transform: scale(1.02);
		}
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		color: var(--text-tertiary);
		cursor: grab;

		&:active {
			cursor: grabbing;
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
		background: var(--surface-primary);
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
