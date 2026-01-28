<script lang="ts">
	import SettingRow from '../controls/SettingRow.svelte';
	import SettingToggle from '../controls/SettingToggle.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import type { DisableableTransportMode } from '$lib/types/settings';

	const transportModes: { mode: DisableableTransportMode; label: string; description: string }[] = [
		{ mode: 'biking', label: 'Biking', description: 'Show biking as a transport option' },
		{ mode: 'walking', label: 'Walking', description: 'Show walking as a transport option' },
		{ mode: 'rideshare', label: 'Rideshare', description: 'Show Uber/Lyft as transport options' },
		{ mode: 'ferry', label: 'Ferry', description: 'Show ferry as a transport option' }
	];

	function isEnabled(mode: DisableableTransportMode): boolean {
		return !settingsStore.userSettings.disabledTransportModes.includes(mode);
	}

	function handleToggle(mode: DisableableTransportMode, enabled: boolean) {
		if (enabled) {
			// Remove from disabled list
			settingsStore.setDisabledTransportModes(
				settingsStore.userSettings.disabledTransportModes.filter((m) => m !== mode)
			);
		} else {
			// Add to disabled list
			settingsStore.setDisabledTransportModes([
				...settingsStore.userSettings.disabledTransportModes,
				mode
			]);
		}
	}
</script>

<div class="section">
	<h3 class="section-title">Transport Options</h3>
	<p class="section-description">
		Choose which transport modes appear when adding travel to your itinerary.
	</p>

	{#each transportModes as { mode, label, description }}
		<SettingRow {label} {description}>
			<SettingToggle checked={isEnabled(mode)} onchange={(checked) => handleToggle(mode, checked)} />
		</SettingRow>
	{/each}
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
		margin-bottom: var(--space-1);
	}

	.section-description {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-2) 0;
	}
</style>
