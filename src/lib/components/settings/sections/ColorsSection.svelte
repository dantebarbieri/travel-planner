<script lang="ts">
	import type { CustomColorPalette } from '$lib/types/settings';
	import SettingRow from '../controls/SettingRow.svelte';
	import SettingRadioGroup from '../controls/SettingRadioGroup.svelte';
	import ColorPaletteEditor from '../controls/ColorPaletteEditor.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';

	const colorModeOptions = [
		{ value: 'by-kind', label: 'By Type' },
		{ value: 'by-stay', label: 'By Stay' }
	];

	let showPaletteEditor = $state(false);
	let editingPalette = $state<CustomColorPalette | undefined>(undefined);

	function handleColorModeChange(value: string) {
		settingsStore.setDefaultColorMode(value as 'by-kind' | 'by-stay');
	}

	function handleDefaultPaletteChange(paletteId: string) {
		settingsStore.setDefaultPalette(paletteId || undefined);
	}

	function openNewPaletteEditor() {
		editingPalette = undefined;
		showPaletteEditor = true;
	}

	function openEditPaletteEditor(palette: CustomColorPalette) {
		editingPalette = palette;
		showPaletteEditor = true;
	}

	function handleSavePalette(palette: CustomColorPalette) {
		if (editingPalette) {
			settingsStore.updateCustomPalette(palette.id, palette);
		} else {
			settingsStore.addCustomPalette(palette);
		}
		showPaletteEditor = false;
		editingPalette = undefined;
	}

	function handleCancelPalette() {
		showPaletteEditor = false;
		editingPalette = undefined;
	}

	function handleDeletePalette(paletteId: string) {
		if (confirm('Are you sure you want to delete this palette?')) {
			settingsStore.deleteCustomPalette(paletteId);
		}
	}
</script>

<div class="section">
	{#if showPaletteEditor}
		<ColorPaletteEditor
			palette={editingPalette}
			onsave={handleSavePalette}
			oncancel={handleCancelPalette}
		/>
	{:else}
		<h3 class="section-title">Colors</h3>

		<SettingRow label="Default Color Mode" description="How items are colored in the itinerary">
			<SettingRadioGroup
				name="colorMode"
				value={settingsStore.userSettings.defaultColorMode}
				options={colorModeOptions}
				onchange={handleColorModeChange}
			/>
		</SettingRow>

		<div class="palettes-section">
			<div class="palettes-header">
				<div>
					<h4 class="palettes-title">Custom Palettes</h4>
					<p class="palettes-description">
						Create color palettes for the "By Stay" mode
					</p>
				</div>
				<button type="button" class="add-palette-btn" onclick={openNewPaletteEditor}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 5v14M5 12h14" />
					</svg>
					New Palette
				</button>
			</div>

			{#if settingsStore.userSettings.customColorPalettes.length === 0}
				<div class="empty-palettes">
					<p>No custom palettes yet. Create one to use with "By Stay" mode.</p>
				</div>
			{:else}
				<div class="palettes-list">
					{#each settingsStore.userSettings.customColorPalettes as palette}
						<div
							class="palette-card"
							class:selected={settingsStore.userSettings.defaultPaletteId === palette.id}
						>
							<button
								type="button"
								class="palette-select-btn"
								onclick={() => handleDefaultPaletteChange(
									settingsStore.userSettings.defaultPaletteId === palette.id ? '' : palette.id
								)}
							>
								<div class="palette-colors">
									{#each palette.colors.slice(0, 8) as color}
										<span class="palette-color-dot" style="background: {color}"></span>
									{/each}
								</div>
								<span class="palette-name">{palette.name}</span>
								{#if settingsStore.userSettings.defaultPaletteId === palette.id}
									<span class="default-badge">Default</span>
								{/if}
							</button>
							<div class="palette-actions">
								<button
									type="button"
									class="palette-action-btn"
									onclick={() => openEditPaletteEditor(palette)}
									title="Edit palette"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
								</button>
								<button
									type="button"
									class="palette-action-btn danger"
									onclick={() => handleDeletePalette(palette.id)}
									title="Delete palette"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									</svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.section {
		display: flex;
		flex-direction: column;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		margin-bottom: var(--space-2);
	}

	.palettes-section {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border-color);
	}

	.palettes-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-3);
	}

	.palettes-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
	}

	.palettes-description {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: var(--space-1) 0 0 0;
	}

	.add-palette-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
		background: transparent;
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-md);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background: var(--color-primary);
			color: white;
		}
	}

	.empty-palettes {
		padding: var(--space-4);
		text-align: center;
		background: var(--surface-secondary);
		border-radius: var(--radius-md);

		p {
			margin: 0;
			font-size: 0.875rem;
			color: var(--text-tertiary);
		}
	}

	.palettes-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.palette-card {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		background: var(--surface-secondary);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		transition: border-color var(--transition-fast);

		&.selected {
			border-color: var(--color-primary);
		}
	}

	.palette-select-btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.palette-colors {
		display: flex;
		gap: 2px;
	}

	.palette-color-dot {
		width: 16px;
		height: 16px;
		border-radius: var(--radius-sm);
		border: 1px solid color-mix(in oklch, var(--text-primary), transparent 80%);
	}

	.palette-name {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.default-badge {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		background: color-mix(in oklch, var(--color-primary), transparent 85%);
		color: var(--color-primary);
		border-radius: var(--radius-sm);
	}

	.palette-actions {
		display: flex;
		gap: var(--space-1);
	}

	.palette-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover {
			background: var(--surface-primary);
			color: var(--text-primary);
			border-color: var(--border-color-strong);
		}

		&.danger:hover {
			background: var(--color-error);
			color: white;
			border-color: var(--color-error);
		}
	}
</style>
