<script lang="ts">
	import { onMount } from 'svelte';
	import { tripStore } from '$lib/stores/tripStore.svelte';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		tripStore.loadTrips();
	});
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
		</nav>
	</header>

	<main class="app-main">
		{@render children()}
	</main>

	<footer class="app-footer">
		<p>&copy; {new Date().getFullYear()} Travel Planner</p>
	</footer>
</div>

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
