<script lang="ts">
	import SettingRow from '../controls/SettingRow.svelte';
	import SettingSelect from '../controls/SettingSelect.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import type { TemperatureUnit, DistanceUnit, TimeFormat } from '$lib/types/settings';

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

	function handleTemperatureChange(value: string) {
		settingsStore.setTemperatureUnit(value as TemperatureUnit);
	}

	function handleDistanceChange(value: string) {
		settingsStore.setDistanceUnit(value as DistanceUnit);
	}

	function handleTimeFormatChange(value: string) {
		settingsStore.setTimeFormat(value as TimeFormat);
	}
</script>

<div class="section">
	<h3 class="section-title">Units & Format</h3>

	<SettingRow label="Temperature" description="How temperatures are displayed">
		<SettingSelect
			value={settingsStore.userSettings.temperatureUnit}
			options={temperatureOptions}
			onchange={handleTemperatureChange}
		/>
	</SettingRow>

	<SettingRow label="Distance" description="Distance and speed measurements">
		<SettingSelect
			value={settingsStore.userSettings.distanceUnit}
			options={distanceOptions}
			onchange={handleDistanceChange}
		/>
	</SettingRow>

	<SettingRow label="Time Format" description="How times are displayed">
		<SettingSelect
			value={settingsStore.userSettings.timeFormat}
			options={timeFormatOptions}
			onchange={handleTimeFormatChange}
		/>
	</SettingRow>
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
</style>
