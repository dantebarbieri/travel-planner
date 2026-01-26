<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isOpen: boolean;
		x: number;
		y: number;
		onclose: () => void;
		children: Snippet;
	}

	let { isOpen, x, y, onclose, children }: Props = $props();

	let menuRef = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (isOpen) {
			// Close on click outside
			function handleClickOutside(e: MouseEvent) {
				if (menuRef && !menuRef.contains(e.target as Node)) {
					onclose();
				}
			}

			// Close on escape
			function handleKeydown(e: KeyboardEvent) {
				if (e.key === 'Escape') {
					onclose();
				}
			}

			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);

			return () => {
				document.removeEventListener('click', handleClickOutside);
				document.removeEventListener('keydown', handleKeydown);
			};
		}
	});

	// Adjust position to keep menu in viewport
	const adjustedPosition = $derived.by(() => {
		if (!isOpen) return { x: 0, y: 0 };

		const menuWidth = 200;
		const menuHeight = 150;
		const padding = 8;

		let adjustedX = x;
		let adjustedY = y;

		if (typeof window !== 'undefined') {
			if (x + menuWidth + padding > window.innerWidth) {
				adjustedX = window.innerWidth - menuWidth - padding;
			}
			if (y + menuHeight + padding > window.innerHeight) {
				adjustedY = window.innerHeight - menuHeight - padding;
			}
		}

		return { x: adjustedX, y: adjustedY };
	});
</script>

{#if isOpen}
	<div
		class="context-menu"
		bind:this={menuRef}
		style="left: {adjustedPosition.x}px; top: {adjustedPosition.y}px;"
		role="menu"
	>
		{@render children()}
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: var(--z-dropdown);
		min-width: 160px;
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		padding: var(--space-1);
		animation: fadeIn var(--transition-fast) ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
