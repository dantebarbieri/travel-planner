<script lang="ts">
	import type { ItineraryDay } from '$lib/types/travel';
	import { formatDate, formatDayOfWeek } from '$lib/utils/dates';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		isOpen: boolean;
		days: ItineraryDay[];
		currentDayId: string;
		onclose: () => void;
		onMove: (dayId: string) => void;
	}

	let { isOpen, days, currentDayId, onclose, onMove }: Props = $props();

	let selectedDayId = $state<string | null>(null);

	$effect(() => {
		if (!isOpen) {
			selectedDayId = null;
		}
	});

	const availableDays = $derived(days.filter((d) => d.id !== currentDayId));

	function handleMove() {
		if (selectedDayId) {
			onMove(selectedDayId);
			onclose();
		}
	}
</script>

<Modal {isOpen} title="Move to Day" size="sm" {onclose}>
	<div class="move-modal">
		<p class="instruction">Select a day to move this item to:</p>

		<div class="day-list">
			{#each availableDays as day (day.id)}
				<button
					type="button"
					class="day-option"
					class:selected={selectedDayId === day.id}
					onclick={() => (selectedDayId = day.id)}
				>
					<div class="day-info">
						<span class="day-number">Day {day.dayNumber}</span>
						<span class="day-date">{formatDayOfWeek(day.date)}, {formatDate(day.date, { month: 'short', day: 'numeric' })}</span>
					</div>
					{#if day.title}
						<span class="day-title">{day.title}</span>
					{/if}
					{#if selectedDayId === day.id}
						<Icon name="check" size={16} />
					{/if}
				</button>
			{/each}
		</div>

		{#if availableDays.length === 0}
			<p class="no-days">No other days available to move to.</p>
		{/if}

		<div class="form-actions">
			<Button variant="secondary" onclick={onclose}>Cancel</Button>
			<Button onclick={handleMove} disabled={!selectedDayId}>
				<Icon name="move" size={16} />
				Move Item
			</Button>
		</div>
	</div>
</Modal>

<style>
	.move-modal {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.instruction {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.day-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-height: 300px;
		overflow-y: auto;
	}

	.day-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--surface-secondary);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		text-align: left;
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		&:hover {
			border-color: var(--border-color);
		}

		&.selected {
			border-color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 95%);
		}
	}

	.day-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.day-number {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.day-date {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.day-title {
		flex: 1;
		font-size: 0.875rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.no-days {
		text-align: center;
		color: var(--text-tertiary);
		padding: var(--space-8);
		margin: 0;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border-color);
	}
</style>
