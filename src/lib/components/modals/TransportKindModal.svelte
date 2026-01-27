<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onSelectKind: (kind: 'flight' | 'train' | 'bus') => void;
	}

	let { isOpen, onclose, onSelectKind }: Props = $props();

	const transportKinds = [
		{
			value: 'flight' as const,
			label: 'Flight',
			icon: 'flight',
			description: 'Search by airline and flight number'
		},
		{
			value: 'train' as const,
			label: 'Train',
			icon: 'transit',
			description: 'Search intercity train routes'
		},
		{
			value: 'bus' as const,
			label: 'Bus',
			icon: 'transit',
			description: 'Search intercity bus routes'
		}
	];

	function selectKind(kind: 'flight' | 'train' | 'bus') {
		onSelectKind(kind);
	}
</script>

<Modal {isOpen} title="Add Transport" {onclose}>
	<div class="transport-kind-grid">
		{#each transportKinds as kind}
			<button type="button" class="kind-card" onclick={() => selectKind(kind.value)}>
				<div class="kind-icon">
					<Icon name={kind.icon} size={32} />
				</div>
				<span class="kind-label">{kind.label}</span>
				<span class="kind-description">{kind.description}</span>
			</button>
		{/each}
	</div>
</Modal>

<style>
	.transport-kind-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
	}

	.kind-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--surface-secondary);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast),
			transform var(--transition-fast);

		&:hover {
			border-color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 95%);
			transform: translateY(-2px);
		}

		&:active {
			transform: translateY(0);
		}
	}

	.kind-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		background: var(--color-kind-transport);
		color: white;
		border-radius: var(--radius-lg);
	}

	.kind-card:first-child .kind-icon {
		background: var(--color-kind-flight);
	}

	.kind-label {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.kind-description {
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-align: center;
	}

	@media (max-width: 480px) {
		.transport-kind-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
