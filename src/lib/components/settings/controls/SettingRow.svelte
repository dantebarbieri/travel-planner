<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		description?: string;
		isOverridden?: boolean;
		showOverrideIndicator?: boolean;
		onReset?: () => void;
		children: Snippet;
	}

	let {
		label,
		description,
		isOverridden = false,
		showOverrideIndicator = false,
		onReset,
		children
	}: Props = $props();
</script>

<div class="setting-row">
	<div class="setting-info">
		<span class="setting-label">{label}</span>
		{#if description}
			<span class="setting-description">{description}</span>
		{/if}
	</div>

	<div class="setting-control">
		{@render children()}
	</div>

	{#if showOverrideIndicator}
		<div class="override-indicator">
			{#if isOverridden}
				<span class="override-badge custom">Custom</span>
				{#if onReset}
					<button type="button" class="reset-btn" onclick={onReset} title="Reset to inherited value">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
							<path d="M3 3v5h5"></path>
						</svg>
					</button>
				{/if}
			{:else}
				<span class="override-badge inherited">Inherited</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.setting-row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border-color);
	}

	.setting-row:last-child {
		border-bottom: none;
	}

	.setting-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.setting-label {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.setting-description {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.setting-control {
		flex-shrink: 0;
	}

	.override-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.override-badge {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.override-badge.inherited {
		background: var(--surface-secondary);
		color: var(--text-tertiary);
	}

	.override-badge.custom {
		background: color-mix(in oklch, var(--color-primary), transparent 85%);
		color: var(--color-primary);
	}

	.reset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background: var(--surface-secondary);
			color: var(--text-primary);
		}
	}
</style>
