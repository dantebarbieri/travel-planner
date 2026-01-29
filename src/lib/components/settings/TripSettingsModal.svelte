<script lang="ts">
	import type { Trip } from '$lib/types/travel';
	import type { TemperatureUnit, DistanceUnit, TimeFormat, DisableableTransportMode } from '$lib/types/settings';
	import Modal from '$lib/components/ui/Modal.svelte';
	import SettingRow from './controls/SettingRow.svelte';
	import SettingSelect from './controls/SettingSelect.svelte';
	import SettingToggle from './controls/SettingToggle.svelte';
	import SettingRadioGroup from './controls/SettingRadioGroup.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { tripStore } from '$lib/stores/tripStore.svelte';
	import { defaultKindColors, defaultPaletteColors } from '$lib/utils/colors';

	interface Props {
		isOpen: boolean;
		trip: Trip;
		onclose: () => void;
	}

	let { isOpen, trip, onclose }: Props = $props();

	// Resolve current settings with override tracking
	const resolved = $derived(settingsStore.resolveSettingsForTrip(trip));

	const temperatureOptions = [
		{ value: 'celsius', label: 'Celsius (\u00B0C)' },
		{ value: 'fahrenheit', label: 'Fahrenheit (\u00B0F)' },
		{ value: 'trip-location', label: 'Based on destination' }
	];

	const distanceOptions = [
		{ value: 'km', label: 'Kilometers (km)' },
		{ value: 'miles', label: 'Miles (mi)' },
		{ value: 'trip-location', label: 'Based on destination' }
	];

	const timeFormatOptions = [
		{ value: '24h', label: '24-hour (14:30)' },
		{ value: '12h', label: '12-hour (2:30 PM)' }
	];

	const colorModeOptions = [
		{ value: 'by-kind', label: 'By Type' },
		{ value: 'by-stay', label: 'By Stay' }
	];

	const transportModes: { mode: DisableableTransportMode; label: string }[] = [
		{ mode: 'biking', label: 'Biking' },
		{ mode: 'walking', label: 'Walking' },
		{ mode: 'rideshare', label: 'Rideshare' },
		{ mode: 'ferry', label: 'Ferry' }
	];

	// Color scheme options for dropdown
	const schemeOptions = $derived([
		{ value: '', label: 'Default Colors' },
		...settingsStore.userSettings.customColorSchemes.map(s => ({
			value: s.id,
			label: s.name
		}))
	]);

	// Get current scheme ID for this trip
	const currentSchemeId = $derived(trip.colorScheme.customSchemeId ?? '');

	// Get the scheme (from trip override or user default)
	const effectiveScheme = $derived(
		currentSchemeId 
			? settingsStore.userSettings.customColorSchemes.find(s => s.id === currentSchemeId)
			: null
	);

	// Get colors to preview
	const previewKindColors = $derived(effectiveScheme?.kindColors ?? trip.colorScheme.kindColors);
	const previewPaletteColors = $derived(effectiveScheme?.paletteColors ?? trip.colorScheme.paletteColors ?? defaultPaletteColors);

	// Temperature
	function setTemperatureUnit(value: string) {
		tripStore.setTripSettingOverride(trip.id, 'temperatureUnit', value as TemperatureUnit);
	}
	function resetTemperatureUnit() {
		tripStore.clearTripSettingOverride(trip.id, 'temperatureUnit');
	}

	// Distance
	function setDistanceUnit(value: string) {
		tripStore.setTripSettingOverride(trip.id, 'distanceUnit', value as DistanceUnit);
	}
	function resetDistanceUnit() {
		tripStore.clearTripSettingOverride(trip.id, 'distanceUnit');
	}

	// Time format
	function setTimeFormat(value: string) {
		tripStore.setTripSettingOverride(trip.id, 'timeFormat', value as TimeFormat);
	}
	function resetTimeFormat() {
		tripStore.clearTripSettingOverride(trip.id, 'timeFormat');
	}

	// Transport modes
	function isTransportEnabled(mode: DisableableTransportMode): boolean {
		return !resolved.disabledTransportModes.includes(mode);
	}

	function handleTransportToggle(mode: DisableableTransportMode, enabled: boolean) {
		const current = resolved.disabledTransportModes;
		const updated = enabled
			? current.filter((m) => m !== mode)
			: [...current, mode];
		tripStore.setTripSettingOverride(trip.id, 'disabledTransportModes', updated);
	}

	function resetTransportModes() {
		tripStore.clearTripSettingOverride(trip.id, 'disabledTransportModes');
	}

	// Color mode
	function handleColorModeChange(value: string) {
		tripStore.setTripColorMode(trip.id, value as 'by-kind' | 'by-stay');
	}

	function resetColorMode() {
		tripStore.clearTripColorMode(trip.id);
	}

	// Color scheme selection
	function handleSchemeChange(schemeId: string) {
		if (schemeId) {
			const scheme = settingsStore.userSettings.customColorSchemes.find(s => s.id === schemeId);
			if (scheme) {
				tripStore.setTripColorScheme(trip.id, scheme);
			}
		} else {
			// Reset to default
			tripStore.clearTripColorScheme(trip.id);
		}
	}

	function resetColorScheme() {
		tripStore.clearTripColorScheme(trip.id);
	}
</script>

<Modal {isOpen} title="Trip Settings" size="md" {onclose}>
	<div class="trip-settings">
		<p class="settings-intro">
			Customize settings for <strong>{trip.name}</strong>. Settings marked "Inherited" use your
			global preferences.
		</p>

		<div class="settings-section">
			<h3 class="section-title">Units & Format</h3>

			<SettingRow
				label="Temperature"
				description="How temperatures are displayed"
				showOverrideIndicator
				isOverridden={resolved.overrides.temperatureUnit}
				onReset={resetTemperatureUnit}
			>
				<SettingSelect
					value={resolved.temperatureUnit}
					options={temperatureOptions}
					onchange={setTemperatureUnit}
				/>
			</SettingRow>

			<SettingRow
				label="Distance"
				description="Distance measurements"
				showOverrideIndicator
				isOverridden={resolved.overrides.distanceUnit}
				onReset={resetDistanceUnit}
			>
				<SettingSelect
					value={resolved.distanceUnit}
					options={distanceOptions}
					onchange={setDistanceUnit}
				/>
			</SettingRow>

			<SettingRow
				label="Time Format"
				description="How times are displayed"
				showOverrideIndicator
				isOverridden={resolved.overrides.timeFormat}
				onReset={resetTimeFormat}
			>
				<SettingSelect
					value={resolved.timeFormat}
					options={timeFormatOptions}
					onchange={setTimeFormat}
				/>
			</SettingRow>
		</div>

		<div class="settings-section">
			<div class="section-header">
				<div>
					<h3 class="section-title">Transport Options</h3>
					<p class="section-description">Choose which transport modes are available for this trip.</p>
				</div>
				{#if resolved.overrides.disabledTransportModes}
					<button type="button" class="reset-all-btn" onclick={resetTransportModes}>
						Reset All
					</button>
				{/if}
			</div>

			{#if resolved.overrides.disabledTransportModes}
				<div class="override-banner">
					Using custom transport settings for this trip
				</div>
			{/if}

			{#each transportModes as { mode, label }}
				<SettingRow {label}>
					<SettingToggle
						checked={isTransportEnabled(mode)}
						onchange={(checked) => handleTransportToggle(mode, checked)}
					/>
				</SettingRow>
			{/each}
		</div>

		<div class="settings-section">
			<div class="section-header">
				<div>
					<h3 class="section-title">Colors</h3>
					<p class="section-description">Customize how items are colored in this trip's itinerary.</p>
				</div>
			</div>

			<SettingRow
				label="Color Mode"
				description="How items are colored"
				showOverrideIndicator
				isOverridden={resolved.overrides.colorMode}
				onReset={resetColorMode}
			>
				<SettingRadioGroup
					name="tripColorMode"
					value={trip.colorScheme.mode}
					options={colorModeOptions}
					onchange={handleColorModeChange}
				/>
			</SettingRow>

			<SettingRow
				label="Color Scheme"
				description="Colors for types and stays"
				showOverrideIndicator
				isOverridden={resolved.overrides.colorScheme}
				onReset={resetColorScheme}
			>
				<SettingSelect
					value={currentSchemeId}
					options={schemeOptions}
					onchange={handleSchemeChange}
				/>
			</SettingRow>

			<!-- Preview of current colors -->
			<div class="scheme-preview">
				<div class="preview-row">
					<span class="preview-label">By Type:</span>
					<div class="preview-colors">
						<span class="preview-dot" style="background: {previewKindColors.stay}" title="Stays"></span>
						<span class="preview-dot" style="background: {previewKindColors.activity}" title="Activities"></span>
						<span class="preview-dot" style="background: {previewKindColors.food}" title="Food"></span>
						<span class="preview-dot" style="background: {previewKindColors.transport}" title="Transport"></span>
						<span class="preview-dot" style="background: {previewKindColors.flight}" title="Flights"></span>
					</div>
				</div>
				<div class="preview-row">
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
	</div>
</Modal>

<style>
	.trip-settings {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.settings-intro {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);

		strong {
			color: var(--text-primary);
		}
	}

	.settings-section {
		display: flex;
		flex-direction: column;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-2);
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		margin: 0;
	}

	.section-description {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: var(--space-1) 0 0 0;
	}

	.reset-all-btn {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-primary);
		background: transparent;
		border: none;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		cursor: pointer;
		white-space: nowrap;

		&:hover {
			background: color-mix(in oklch, var(--color-primary), transparent 90%);
		}
	}

	.override-banner {
		font-size: 0.75rem;
		color: var(--color-primary);
		background: color-mix(in oklch, var(--color-primary), transparent 92%);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-2);
	}

	.scheme-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		margin-top: var(--space-2);
		background: var(--surface-secondary);
		border-radius: var(--radius-md);
	}

	.preview-row {
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
</style>
