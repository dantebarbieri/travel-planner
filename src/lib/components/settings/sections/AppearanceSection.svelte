<script lang="ts">
	import SettingRow from '../controls/SettingRow.svelte';
	import SettingRadioGroup from '../controls/SettingRadioGroup.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import type { ThemeMode } from '$lib/types/settings';

	const themeOptions = [
		{
			value: 'system',
			label: 'System',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
		},
		{
			value: 'light',
			label: 'Light',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
		},
		{
			value: 'dark',
			label: 'Dark',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
		}
	];

	function handleThemeChange(value: string) {
		settingsStore.setTheme(value as ThemeMode);
	}
</script>

<div class="section">
	<h3 class="section-title">Appearance</h3>

	<SettingRow label="Theme" description="Choose your preferred color scheme">
		<SettingRadioGroup
			name="theme"
			value={settingsStore.userSettings.theme}
			options={themeOptions}
			onchange={handleThemeChange}
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
