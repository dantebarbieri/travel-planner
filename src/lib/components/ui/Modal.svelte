<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isOpen: boolean;
		title: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
	}

	let { isOpen, title, size = 'md', onclose, children, footer }: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
		<div class="modal modal-{size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<div class="modal-header">
				<h2 id="modal-title" class="modal-title">{title}</h2>
				<button type="button" class="modal-close" onclick={onclose} aria-label="Close modal">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15 5L5 15M5 5l10 10" />
					</svg>
				</button>
			</div>
			<div class="modal-body">
				{@render children()}
			</div>
			{#if footer}
				<div class="modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: oklch(0 0 0 / 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
		z-index: var(--z-modal-backdrop);
		animation: fadeIn var(--transition-fast) ease-out;
	}

	.modal {
		background: var(--surface-primary);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		max-height: calc(100vh - var(--space-8));
		display: flex;
		flex-direction: column;
		z-index: var(--z-modal);
		animation: slideUp var(--transition-normal) ease-out;
	}

	.modal-sm {
		width: 100%;
		max-width: 400px;
	}

	.modal-md {
		width: 100%;
		max-width: 560px;
	}

	.modal-lg {
		width: 100%;
		max-width: 720px;
	}

	.modal-xl {
		width: 100%;
		max-width: 960px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--border-color);
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
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

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}

	.modal-body {
		padding: var(--space-6);
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-6);
		border-top: 1px solid var(--border-color);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
