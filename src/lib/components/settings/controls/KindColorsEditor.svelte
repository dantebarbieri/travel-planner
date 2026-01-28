<script lang="ts">
	import type { KindColors, DailyItemKind } from '$lib/types/travel';
	import { oklchToHex, hexToOklch, defaultKindColors } from '$lib/utils/colors';

	interface Props {
		kindColors: KindColors;
		onchange: (kindColors: KindColors) => void;
	}

	let { kindColors, onchange }: Props = $props();

	type KindKey = keyof KindColors;

	const kindLabels: Record<KindKey, string> = {
		stay: 'Stays',
		activity: 'Activities',
		food: 'Food & Dining',
		transport: 'Transport',
		flight: 'Flights'
	};

	const kindIcons: Record<KindKey, string> = {
		stay: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		activity: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		food: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
		transport: 'M8 7h8m-8 5h8m-4-9v2m0 12v2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
		flight: 'M12 19V5m0 0l-5 5m5-5l5 5'
	};

	// Local state to track colors being edited
	let localColors = $state<KindColors>({
		stay: '',
		activity: '',
		food: '',
		transport: '',
		flight: ''
	});

	// Update local state when props change
	$effect(() => {
		localColors = { ...kindColors };
	});

	// Drag state for reordering palette colors onto kinds
	let dragOverKind = $state<KindKey | null>(null);

	function handleColorChange(kind: KindKey, hexValue: string) {
		const oklchColor = hexToOklch(hexValue);
		localColors = { ...localColors, [kind]: oklchColor };
		onchange(localColors);
	}

	function handleDragOver(e: DragEvent, kind: KindKey) {
		e.preventDefault();
		dragOverKind = kind;
	}

	function handleDragLeave() {
		dragOverKind = null;
	}

	function handleDrop(e: DragEvent, kind: KindKey) {
		e.preventDefault();
		// Check if we're receiving a color from the palette editor
		const colorData = e.dataTransfer?.getData('application/color');
		if (colorData) {
			localColors = { ...localColors, [kind]: colorData };
			onchange(localColors);
		}
		dragOverKind = null;
	}

	function resetToDefault() {
		localColors = { ...defaultKindColors };
		onchange(localColors);
	}

	function resetKind(kind: KindKey) {
		localColors = { ...localColors, [kind]: defaultKindColors[kind] };
		onchange(localColors);
	}

	const kindOrder: KindKey[] = ['stay', 'activity', 'food', 'transport', 'flight'];
</script>

<div class="kind-colors-editor">
	<div class="editor-header">
		<span class="editor-label">Item Type Colors</span>
		<button
			type="button"
			class="reset-btn"
			onclick={resetToDefault}
			title="Reset all to defaults"
		>
			Reset All
		</button>
	</div>

	<div class="kind-list" role="list">
		{#each kindOrder as kind}
			<div
				class="kind-item"
				class:drag-over={dragOverKind === kind}
				role="listitem"
				ondragover={(e) => handleDragOver(e, kind)}
				ondragleave={handleDragLeave}
				ondrop={(e) => handleDrop(e, kind)}
			>
				<div class="kind-info">
					<div
						class="kind-color-preview"
						style="background: {localColors[kind]}"
					></div>
					<span class="kind-label">{kindLabels[kind]}</span>
				</div>
				<div class="kind-controls">
					<input
						type="color"
						class="color-picker"
						value={oklchToHex(localColors[kind])}
						onchange={(e) => handleColorChange(kind, (e.target as HTMLInputElement).value)}
						title="Pick color for {kindLabels[kind]}"
					/>
					<button
						type="button"
						class="reset-kind-btn"
						onclick={() => resetKind(kind)}
						title="Reset to default"
						disabled={localColors[kind] === defaultKindColors[kind]}
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

	<p class="hint">Click a color swatch to change it. Drag a palette color here to apply it.</p>
</div>

<style>
	.kind-colors-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.editor-label {
		font-size: 0.875rem;
		font-weight: 500;
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
		padding: var(--space-2) var(--space-3);
		background: var(--surface-secondary);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		transition: 
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		&.drag-over {
			border-color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 95%);
		}
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

	.hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
	}
</style>
