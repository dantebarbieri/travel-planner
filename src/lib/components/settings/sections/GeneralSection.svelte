<script lang="ts">
	import SettingRow from '../controls/SettingRow.svelte';
	import SettingSelect from '../controls/SettingSelect.svelte';
	import SettingToggle from '../controls/SettingToggle.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import type { MapApp } from '$lib/types/settings';

	const mapAppOptions = [
		{ value: 'google', label: 'Google Maps' },
		{ value: 'apple', label: 'Apple Maps' }
	];

	function handleMapAppChange(value: string) {
		settingsStore.setPreferredMapApp(value as MapApp);
	}

	function handleAutoSaveChange(enabled: boolean) {
		settingsStore.updateUserSettings({ autoSaveEnabled: enabled });
	}
</script>

<div class="section">
	<h3 class="section-title">General</h3>

	<SettingRow label="Map App" description="Which app to open for directions">
		<SettingSelect
			value={settingsStore.userSettings.preferredMapApp}
			options={mapAppOptions}
			onchange={handleMapAppChange}
		/>
	</SettingRow>

	<SettingRow label="Auto-save" description="Automatically save changes as you edit">
		<SettingToggle
			checked={settingsStore.userSettings.autoSaveEnabled}
			onchange={handleAutoSaveChange}
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
