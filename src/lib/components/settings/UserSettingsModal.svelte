<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import AppearanceSection from './sections/AppearanceSection.svelte';
	import UnitsSection from './sections/UnitsSection.svelte';
	import TransportSection from './sections/TransportSection.svelte';
	import ColorsSection from './sections/ColorsSection.svelte';
	import GeneralSection from './sections/GeneralSection.svelte';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen, onclose }: Props = $props();

	type TabId = 'appearance' | 'units' | 'transport' | 'colors' | 'general';

	let activeTab = $state<TabId>('appearance');

	function handleClose() {
		activeTab = 'appearance';
		onclose();
	}

	const tabs: { id: TabId; label: string; icon: string }[] = [
		{
			id: 'appearance',
			label: 'Appearance',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
		},
		{
			id: 'units',
			label: 'Units',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>'
		},
		{
			id: 'transport',
			label: 'Transport',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8c-.1.3-.1.6-.1.9V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>'
		},
		{
			id: 'colors',
			label: 'Colors',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-1.5 5-3 5c-1.3 0-2.5-.5-3.2-1.3-.5-.5-1.1-.7-1.8-.7H12c-1.7 0-3 1.3-3 3 0 1.1.9 2 2 2h1c.6 0 1 .4 1 1v.5c0 .3-.2.5-.5.5H12z"/></svg>'
		},
		{
			id: 'general',
			label: 'General',
			icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
		}
	];
</script>

<Modal {isOpen} title="Settings" size="lg" onclose={handleClose}>
	<div class="settings-layout">
		<nav class="settings-nav">
			{#each tabs as tab}
				<button
					type="button"
					class="nav-tab"
					class:active={activeTab === tab.id}
					onclick={() => (activeTab = tab.id)}
				>
					<span class="nav-icon">{@html tab.icon}</span>
					<span class="nav-label">{tab.label}</span>
				</button>
			{/each}
		</nav>

		<div class="settings-content">
			{#if activeTab === 'appearance'}
				<AppearanceSection />
			{:else if activeTab === 'units'}
				<UnitsSection />
			{:else if activeTab === 'transport'}
				<TransportSection />
			{:else if activeTab === 'colors'}
				<ColorsSection />
			{:else if activeTab === 'general'}
				<GeneralSection />
			{/if}
		</div>
	</div>
</Modal>

<style>
	.settings-layout {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: var(--space-6);
		min-height: 320px;
	}

	.settings-nav {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		border-right: 1px solid var(--border-color);
		padding-right: var(--space-4);
	}

	.nav-tab {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover:not(.active) {
			background: var(--surface-secondary);
			color: var(--text-primary);
		}

		&.active {
			background: color-mix(in oklch, var(--color-primary), transparent 90%);
			color: var(--color-primary);
		}
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		:global(svg) {
			width: 18px;
			height: 18px;
		}
	}

	.nav-label {
		white-space: nowrap;
	}

	.settings-content {
		min-width: 0;
	}

	@media (max-width: 600px) {
		.settings-layout {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.settings-nav {
			flex-direction: row;
			border-right: none;
			border-bottom: 1px solid var(--border-color);
			padding-right: 0;
			padding-bottom: var(--space-3);
			overflow-x: auto;
		}

		.nav-tab {
			flex-direction: column;
			gap: var(--space-1);
			padding: var(--space-2);
			min-width: 60px;
		}

		.nav-label {
			font-size: 0.75rem;
		}
	}
</style>
