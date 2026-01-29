<script lang="ts">
	import type { CustomColorScheme } from '$lib/types/settings';
	import SettingRow from '../controls/SettingRow.svelte';
	import SettingRadioGroup from '../controls/SettingRadioGroup.svelte';
	import SettingSelect from '../controls/SettingSelect.svelte';
	import ColorSchemeEditor from '../controls/ColorSchemeEditor.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { defaultKindColors, defaultPaletteColors } from '$lib/utils/colors';

	const colorModeOptions = [
		{ value: 'by-kind', label: 'By Type' },
		{ value: 'by-stay', label: 'By Stay' }
	];

	let showSchemeEditor = $state(false);
	let editingScheme = $state<CustomColorScheme | undefined>(undefined);

	// Get scheme options for dropdown (default + custom)
	const schemeOptions = $derived([
		{ value: '', label: 'Default Colors' },
		...settingsStore.userSettings.customColorSchemes.map(s => ({
			value: s.id,
			label: s.name
		}))
	]);

	// Get the currently selected scheme (for preview)
	const selectedScheme = $derived(
		settingsStore.userSettings.defaultColorSchemeId
			? settingsStore.userSettings.customColorSchemes.find(
					s => s.id === settingsStore.userSettings.defaultColorSchemeId
				)
			: null
	);

	// Get colors to preview
	const previewKindColors = $derived(selectedScheme?.kindColors ?? defaultKindColors);
	const previewPaletteColors = $derived(selectedScheme?.paletteColors ?? defaultPaletteColors);

	function handleColorModeChange(value: string) {
		settingsStore.setDefaultColorMode(value as 'by-kind' | 'by-stay');
	}

	function handleDefaultSchemeChange(schemeId: string) {
		settingsStore.setDefaultColorScheme(schemeId || undefined);
	}

	function openNewSchemeEditor() {
		editingScheme = undefined;
		showSchemeEditor = true;
	}

	function openEditSchemeEditor(scheme: CustomColorScheme) {
		editingScheme = scheme;
		showSchemeEditor = true;
	}

	function handleSaveScheme(scheme: CustomColorScheme) {
		if (editingScheme) {
			settingsStore.updateCustomColorScheme(scheme.id, scheme);
		} else {
			settingsStore.addCustomColorScheme(scheme);
		}
		showSchemeEditor = false;
		editingScheme = undefined;
	}

	function handleCancelScheme() {
		showSchemeEditor = false;
		editingScheme = undefined;
	}

	function handleDeleteScheme(schemeId: string) {
		if (confirm('Are you sure you want to delete this color scheme?')) {
			settingsStore.deleteCustomColorScheme(schemeId);
		}
	}
</script>

<div class="section">
	{#if showSchemeEditor}
		<ColorSchemeEditor
			scheme={editingScheme}
			onsave={handleSaveScheme}
			oncancel={handleCancelScheme}
		/>
	{:else}
		<h3 class="section-title">Colors</h3>

		<SettingRow label="Default Display Mode" description="How items are colored in the itinerary">
			<SettingRadioGroup
				name="colorMode"
				value={settingsStore.userSettings.defaultColorMode}
				options={colorModeOptions}
				onchange={handleColorModeChange}
			/>
		</SettingRow>

		<!-- Color Schemes Section -->
		<div class="schemes-section">
			<div class="schemes-header">
				<div>
					<h4 class="schemes-title">Color Schemes</h4>
					<p class="schemes-description">
						Color schemes define both "By Type" colors and "By Stay" palette colors.
					</p>
				</div>
				<button type="button" class="add-scheme-btn" onclick={openNewSchemeEditor}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 5v14M5 12h14" />
					</svg>
					New Scheme
				</button>
			</div>

			<!-- Scheme Selection Dropdown -->
			<div class="scheme-selector">
				<span class="selector-label" id="scheme-selector-label">Active Color Scheme</span>
				<div class="selector-row">
					<SettingSelect
						value={settingsStore.userSettings.defaultColorSchemeId ?? ''}
						options={schemeOptions}
						onchange={handleDefaultSchemeChange}
						ariaLabelledBy="scheme-selector-label"
					/>
				</div>

				<!-- Preview of selected scheme -->
				<div class="scheme-preview">
					<div class="preview-section">
						<span class="preview-label">By Type:</span>
						<div class="preview-colors">
							<span class="preview-dot" style="background: {previewKindColors.stay}" title="Stays"></span>
							<span class="preview-dot" style="background: {previewKindColors.activity}" title="Activities"></span>
							<span class="preview-dot" style="background: {previewKindColors.food}" title="Food"></span>
							<span class="preview-dot" style="background: {previewKindColors.transport}" title="Transport"></span>
							<span class="preview-dot" style="background: {previewKindColors.flight}" title="Flights"></span>
						</div>
					</div>
					<div class="preview-section">
						<span class="preview-label">By Stay:</span>
						<div class="preview-colors">
							{#each previewPaletteColors.slice(0, 8) as color}
								<span class="preview-dot" style="background: {color}"></span>
							{/each}
							{#if previewPaletteColors.length > 8}
								<span class="preview-more">+{previewPaletteColors.length - 8}</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Custom Schemes List -->
			{#if settingsStore.userSettings.customColorSchemes.length > 0}
				<div class="schemes-list">
					<span class="list-label">Custom Schemes</span>
					{#each settingsStore.userSettings.customColorSchemes as scheme}
						<div
							class="scheme-card"
							class:selected={settingsStore.userSettings.defaultColorSchemeId === scheme.id}
						>
							<button
								type="button"
								class="scheme-select-btn"
								onclick={() => handleDefaultSchemeChange(
									settingsStore.userSettings.defaultColorSchemeId === scheme.id ? '' : scheme.id
								)}
							>
								<div class="scheme-colors">
									<div class="scheme-kind-colors">
										<span class="scheme-color-dot" style="background: {scheme.kindColors.stay}"></span>
										<span class="scheme-color-dot" style="background: {scheme.kindColors.activity}"></span>
										<span class="scheme-color-dot" style="background: {scheme.kindColors.food}"></span>
										<span class="scheme-color-dot" style="background: {scheme.kindColors.transport}"></span>
										<span class="scheme-color-dot" style="background: {scheme.kindColors.flight}"></span>
									</div>
									<span class="scheme-separator">|</span>
									<div class="scheme-palette-colors">
										{#each scheme.paletteColors.slice(0, 4) as color}
											<span class="scheme-color-dot" style="background: {color}"></span>
										{/each}
									</div>
								</div>
								<span class="scheme-name">{scheme.name}</span>
								{#if settingsStore.userSettings.defaultColorSchemeId === scheme.id}
									<span class="default-badge">Active</span>
								{/if}
							</button>
							<div class="scheme-actions">
								<button
									type="button"
									class="scheme-action-btn"
									onclick={() => openEditSchemeEditor(scheme)}
									title="Edit scheme"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
								</button>
								<button
									type="button"
									class="scheme-action-btn danger"
									onclick={() => handleDeleteScheme(scheme.id)}
									title="Delete scheme"
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

	.schemes-section {
		margin-top: var(--space-4);
	}

	.schemes-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-3);
	}

	.schemes-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
	}

	.schemes-description {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: var(--space-1) 0 0 0;
	}

	.add-scheme-btn {
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

	.scheme-selector {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
		padding: var(--space-3);
		background: var(--surface-secondary);
		border-radius: var(--radius-md);
	}

	.selector-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.selector-row {
		display: flex;
		gap: var(--space-2);
	}

	.scheme-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-top: var(--space-2);
		border-top: 1px solid var(--border-color);
		margin-top: var(--space-2);
	}

	.preview-section {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.preview-label {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		width: 60px;
	}

	.preview-colors {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.preview-dot {
		width: 18px;
		height: 18px;
		border-radius: var(--radius-sm);
		border: 1px solid color-mix(in oklch, var(--text-primary), transparent 80%);
	}

	.preview-more {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin-left: var(--space-1);
	}

	.list-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-tertiary);
		margin-bottom: var(--space-2);
	}

	.schemes-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.scheme-card {
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

	.scheme-select-btn {
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

	.scheme-colors {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.scheme-kind-colors,
	.scheme-palette-colors {
		display: flex;
		gap: 2px;
	}

	.scheme-separator {
		color: var(--text-tertiary);
		font-size: 0.75rem;
	}

	.scheme-color-dot {
		width: 14px;
		height: 14px;
		border-radius: var(--radius-xs);
		border: 1px solid color-mix(in oklch, var(--text-primary), transparent 80%);
	}

	.scheme-name {
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

	.scheme-actions {
		display: flex;
		gap: var(--space-1);
	}

	.scheme-action-btn {
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
