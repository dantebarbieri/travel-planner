<script lang="ts">
	import type { Trip } from '$lib/types/travel';
	import type { TemperatureUnit, DistanceUnit, TimeFormat, DisableableTransportMode } from '$lib/types/settings';
	import Modal from '$lib/components/ui/Modal.svelte';
	import SettingRow from './controls/SettingRow.svelte';
	import SettingSelect from './controls/SettingSelect.svelte';
	import SettingToggle from './controls/SettingToggle.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { tripStore } from '$lib/stores/tripStore.svelte';

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

	const transportModes: { mode: DisableableTransportMode; label: string }[] = [
		{ mode: 'biking', label: 'Biking' },
		{ mode: 'walking', label: 'Walking' },
		{ mode: 'rideshare', label: 'Rideshare' },
		{ mode: 'ferry', label: 'Ferry' }
	];

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
</style>
