<script lang="ts">
	import { onMount } from 'svelte';
	import { tripStore } from '$lib/stores/tripStore.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import UserSettingsModal from '$lib/components/settings/UserSettingsModal.svelte';
	import '../app.css';

	let { children } = $props();

	let showSettingsModal = $state(false);

	onMount(() => {
		// Load data stores
		tripStore.loadTrips();
		settingsStore.loadSettings();

		// Initialize theme system
		settingsStore.initThemeListener();
	});

	function openSettings() {
		showSettingsModal = true;
	}

	function closeSettings() {
		showSettingsModal = false;
	}
</script>

<svelte:head>
	<title>Travel Planner</title>
	<meta name="description" content="Plan your trips with ease" />
</svelte:head>

<div class="app-layout">
	<header class="app-header">
		<a href="/" class="logo">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
			</svg>
			<span>Travel Planner</span>
		</a>
		<nav class="nav-links">
			<a href="/" class="nav-link">My Trips</a>
			<button type="button" class="nav-btn" onclick={openSettings} title="Settings">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="3"></circle>
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
				</svg>
			</button>
		</nav>
	</header>

	<main class="app-main">
		{@render children()}
	</main>

	<footer class="app-footer">
		<p>&copy; {new Date().getFullYear()} Travel Planner</p>
	</footer>
</div>

<UserSettingsModal isOpen={showSettingsModal} onclose={closeSettings} />

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		background: var(--surface-primary);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
		font-size: 1.125rem;
		color: var(--text-primary);
		text-decoration: none;

		&:hover {
			color: var(--color-primary);
		}
	}

	.nav-links {
		display: flex;
		gap: var(--space-4);
	}

	.nav-link {
		font-size: 0.875rem;
		color: var(--text-secondary);
		text-decoration: none;

		&:hover {
			color: var(--text-primary);
		}
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color var(--transition-fast), color var(--transition-fast);

		&:hover {
			background: var(--surface-secondary);
			color: var(--text-primary);
		}
	}

	.app-main {
		flex: 1;
		padding: var(--space-6) var(--space-4);
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
	}

	.app-footer {
		padding: var(--space-4);
		text-align: center;
		border-top: 1px solid var(--border-color);
		color: var(--text-tertiary);
		font-size: 0.875rem;

		& p {
			margin: 0;
		}
	}

	@media (max-width: 640px) {
		.app-main {
			padding: var(--space-4) var(--space-3);
		}
	}
</style>
