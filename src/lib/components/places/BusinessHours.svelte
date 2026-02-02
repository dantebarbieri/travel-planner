<script lang="ts">
	import type { OperatingHours, DayHours } from '$lib/types/travel';
	import { formatTime } from '$lib/utils/dates';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		hours: OperatingHours;
		/** The date to highlight (YYYY-MM-DD format) */
		date?: string;
		/** Whether to show full week or just the highlighted day */
		showFullWeek?: boolean;
		/** Compact mode - just shows status for the day */
		compact?: boolean;
	}

	let { hours, date, showFullWeek = false, compact = false }: Props = $props();

	// Get time format preference (12h vs 24h)
	const use24h = $derived(settingsStore.userSettings.timeFormat === '24h');

	type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

	const dayNames: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	const shortDayNames: Record<DayKey, string> = {
		monday: 'Mon',
		tuesday: 'Tue',
		wednesday: 'Wed',
		thursday: 'Thu',
		friday: 'Fri',
		saturday: 'Sat',
		sunday: 'Sun'
	};

	// Get the day of week from the date
	const dayOfWeek = $derived.by(() => {
		if (!date) return null;
		const d = new Date(date + 'T12:00:00'); // Use noon to avoid timezone issues
		const jsDay = d.getDay(); // 0 = Sunday
		// Convert to our format (0 = Monday)
		return jsDay === 0 ? 6 : jsDay - 1;
	});

	const currentDayKey = $derived.by(() => {
		if (dayOfWeek === null) return null;
		return dayNames[dayOfWeek];
	});

	const currentDayHours = $derived.by((): DayHours | null => {
		if (!currentDayKey) return null;
		return hours[currentDayKey] || null;
	});

	const isClosedToday = $derived(currentDayHours?.closed === true || !currentDayHours);
	const isOpenToday = $derived(currentDayHours && !currentDayHours.closed);

	function formatHours(dayHours: DayHours | undefined): string {
		if (!dayHours || dayHours.closed) {
			return 'Closed';
		}
		const open = formatTime(dayHours.open, use24h);
		const close = formatTime(dayHours.close, use24h);
		return `${open} - ${close}`;
	}

	let expanded = $state(false);
</script>

{#if compact}
	<!-- Compact mode: just shows status badge -->
	{#if isClosedToday}
		<Badge variant="error" size="sm">
			<Icon name="time" size={10} />
			Closed
		</Badge>
	{:else if currentDayHours}
		<span class="compact-hours">
			<Icon name="time" size={12} />
			{formatHours(currentDayHours)}
		</span>
	{/if}
{:else}
	<div class="business-hours">
		{#if currentDayHours && date}
			<!-- Show today's hours prominently -->
			<div class="today-hours" class:closed={isClosedToday}>
				<span class="today-label">
					{shortDayNames[currentDayKey!]}:
				</span>
				<span class="today-time">
					{formatHours(currentDayHours)}
				</span>
				{#if isClosedToday}
					<Badge variant="error" size="sm">Closed</Badge>
				{/if}
			</div>
		{/if}

		{#if showFullWeek || expanded}
			<!-- Full week schedule -->
			<div class="week-hours">
				{#each dayNames as day, index}
					<div class="day-row" class:current={day === currentDayKey} class:closed={hours[day]?.closed}>
						<span class="day-name">{shortDayNames[day]}</span>
						<span class="day-time">{formatHours(hours[day])}</span>
					</div>
				{/each}
			</div>
		{:else if currentDayHours && date}
			<!-- Toggle to show full week -->
			<button type="button" class="expand-btn" onclick={() => expanded = true}>
				View all hours
			</button>
		{/if}
	</div>
{/if}

<style>
	.business-hours {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-size: 0.75rem;
	}

	.today-hours {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-secondary);

		&.closed {
			color: var(--color-error);
		}
	}

	.today-label {
		font-weight: 500;
		color: var(--text-tertiary);
	}

	.today-time {
		font-weight: 500;
	}

	.week-hours {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-2);
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
	}

	.day-row {
		display: flex;
		justify-content: space-between;
		padding: 2px 0;

		&.current {
			font-weight: 600;
			color: var(--color-primary);
		}

		&.closed .day-time {
			color: var(--text-tertiary);
		}
	}

	.day-name {
		width: 40px;
		color: var(--text-tertiary);
	}

	.day-time {
		text-align: right;
	}

	.expand-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.7rem;
		color: var(--color-primary);
		cursor: pointer;
		text-decoration: underline;

		&:hover {
			color: var(--color-primary-dark);
		}
	}

	.compact-hours {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		color: var(--text-secondary);
	}
</style>
