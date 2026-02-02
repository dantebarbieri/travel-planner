<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { TransportMode, GroundTransitSubType } from '$lib/types/travel';

	type TransportSelection = 
		| { type: 'flight' }
		| { type: 'ground_transit'; subType: GroundTransitSubType }
		| { type: 'car_rental' }
		| { type: 'local'; mode: TransportMode };

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onSelectKind: (selection: TransportSelection) => void;
	}

	let { isOpen, onclose, onSelectKind }: Props = $props();

	let showGroundTransitSubTypes = $state(false);
	let showLocalOptions = $state(false);

	const mainOptions = [
		{
			type: 'flight' as const,
			label: 'Flight',
			icon: 'flight',
			description: 'Book by airline and flight number'
		},
		{
			type: 'ground_transit_parent' as const,
			label: 'Train / Bus',
			icon: 'transit',
			description: 'Trains, buses, metro, tram, coach'
		},
		{
			type: 'car_rental' as const,
			label: 'Car Rental',
			icon: 'car',
			description: 'Rental car pickup/return'
		},
		{
			type: 'local_parent' as const,
			label: 'Other',
			icon: 'more',
			description: 'Drive, taxi, ferry, walk...'
		}
	];

	const groundTransitSubTypes: Array<{ value: GroundTransitSubType; label: string; icon: string }> = [
		{ value: 'train', label: 'Train', icon: 'transit' },
		{ value: 'bus', label: 'Bus', icon: 'transit' },
		{ value: 'metro', label: 'Metro', icon: 'transit' },
		{ value: 'tram', label: 'Tram', icon: 'transit' },
		{ value: 'coach', label: 'Coach', icon: 'transit' }
	];

	const localOptions: Array<{ mode: TransportMode; label: string; icon: string }> = [
		{ mode: 'car', label: 'Drive', icon: 'car' },
		{ mode: 'taxi', label: 'Taxi', icon: 'taxi' },
		{ mode: 'rideshare', label: 'Rideshare', icon: 'taxi' },
		{ mode: 'ferry', label: 'Ferry', icon: 'transit' },
		{ mode: 'walking', label: 'Walk', icon: 'walking' },
		{ mode: 'biking', label: 'Bike', icon: 'bike' }
	];

	function handleMainOptionClick(type: string) {
		switch (type) {
			case 'flight':
				onSelectKind({ type: 'flight' });
				resetState();
				break;
			case 'ground_transit_parent':
				showGroundTransitSubTypes = true;
				showLocalOptions = false;
				break;
			case 'car_rental':
				onSelectKind({ type: 'car_rental' });
				resetState();
				break;
			case 'local_parent':
				showLocalOptions = true;
				showGroundTransitSubTypes = false;
				break;
		}
	}

	function handleGroundTransitSelect(subType: GroundTransitSubType) {
		onSelectKind({ type: 'ground_transit', subType });
		resetState();
	}

	function handleLocalSelect(mode: TransportMode) {
		onSelectKind({ type: 'local', mode });
		resetState();
	}

	function goBack() {
		showGroundTransitSubTypes = false;
		showLocalOptions = false;
	}

	function resetState() {
		showGroundTransitSubTypes = false;
		showLocalOptions = false;
	}

	function handleClose() {
		resetState();
		onclose();
	}
</script>

<Modal isOpen={isOpen} title="Add Transport" onclose={handleClose}>
	{#if showGroundTransitSubTypes}
		<!-- Ground Transit Sub-Type Selection -->
		<div class="sub-header">
			<button type="button" class="back-btn" onclick={goBack}>
				<Icon name="chevronLeft" size={16} />
				Back
			</button>
			<span class="sub-title">Select Transit Type</span>
		</div>
		<div class="options-grid compact">
			{#each groundTransitSubTypes as option}
				<button type="button" class="kind-card compact" onclick={() => handleGroundTransitSelect(option.value)}>
					<div class="kind-icon small">
						<Icon name={option.icon} size={24} />
					</div>
					<span class="kind-label">{option.label}</span>
				</button>
			{/each}
		</div>
	{:else if showLocalOptions}
		<!-- Local Transport Options -->
		<div class="sub-header">
			<button type="button" class="back-btn" onclick={goBack}>
				<Icon name="chevronLeft" size={16} />
				Back
			</button>
			<span class="sub-title">Select Transport Type</span>
		</div>
		<div class="options-grid compact">
			{#each localOptions as option}
				<button type="button" class="kind-card compact" onclick={() => handleLocalSelect(option.mode)}>
					<div class="kind-icon small">
						<Icon name={option.icon} size={24} />
					</div>
					<span class="kind-label">{option.label}</span>
				</button>
			{/each}
		</div>
	{:else}
		<!-- Main Options -->
		<div class="transport-kind-grid">
			{#each mainOptions as option}
				<button type="button" class="kind-card" data-type={option.type} onclick={() => handleMainOptionClick(option.type)}>
					<div class="kind-icon">
						<Icon name={option.icon} size={32} />
					</div>
					<span class="kind-label">{option.label}</span>
					<span class="kind-description">{option.description}</span>
				</button>
			{/each}
		</div>
	{/if}
</Modal>

<style>
	.transport-kind-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
	}

	.options-grid.compact {
		grid-template-columns: repeat(3, 1fr);
	}

	.sub-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border-color);
	}

	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		color: var(--text-secondary);
		cursor: pointer;

		&:hover {
			background: var(--surface-tertiary);
			color: var(--text-primary);
		}
	}

	.sub-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
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

		&.compact {
			padding: var(--space-3);
			gap: var(--space-1);
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

		&.small {
			width: 44px;
			height: 44px;
		}
	}

	/* Flight gets special color */
	.kind-card[data-type="flight"] .kind-icon {
		background: var(--color-kind-flight);
	}

	/* Car rental gets a slightly different shade */
	.kind-card[data-type="car_rental"] .kind-icon {
		background: oklch(55% 0.15 200);
	}

	.kind-label {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.kind-card.compact .kind-label {
		font-size: 0.875rem;
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

		.options-grid.compact {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
