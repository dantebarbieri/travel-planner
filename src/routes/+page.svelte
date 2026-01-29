<script lang="ts">
	import { tripStore } from '$lib/stores/tripStore.svelte';
	import { formatDate, daysBetween } from '$lib/utils/dates';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { goto } from '$app/navigation';
	import { storageService } from '$lib/services/storageService';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import type { Location, Trip } from '$lib/types/travel';

	let showCreateModal = $state(false);
	let fileInput: HTMLInputElement;
	let importError = $state<string | null>(null);
	let newTripName = $state('');
	let newTripStartDate = $state('');
	let newTripEndDate = $state('');
	let newTripDescription = $state('');

	const trips = $derived(tripStore.sortedTrips);

	function openCreateModal() {
		newTripName = '';
		newTripStartDate = '';
		newTripEndDate = '';
		newTripDescription = '';
		showCreateModal = true;
	}

	function createTrip() {
		if (!newTripName || !newTripStartDate || !newTripEndDate) return;

		const defaultHomeCity: Location = {
			name: 'Home',
			address: {
				street: '',
				city: 'Home City',
				country: 'Country',
				formatted: 'Home City, Country'
			},
			geo: { latitude: 0, longitude: 0 }
		};

		const trip = tripStore.createTrip({
			name: newTripName,
			homeCity: defaultHomeCity,
			startDate: newTripStartDate,
			endDate: newTripEndDate,
			description: newTripDescription || undefined
		});

		showCreateModal = false;
		goto(`/trip/${trip.id}`);
	}

	function viewTrip(id: string) {
		goto(`/trip/${id}`);
	}

	function deleteTrip(id: string, e: Event) {
		e.stopPropagation();
		if (confirm('Are you sure you want to delete this trip?')) {
			tripStore.deleteTrip(id);
		}
	}

	function getTripDuration(startDate: string, endDate: string): number {
		return daysBetween(startDate, endDate) + 1;
	}

	function getTripStatus(startDate: string, endDate: string): 'upcoming' | 'ongoing' | 'past' {
		const today = new Date().toISOString().split('T')[0];
		if (today < startDate) return 'upcoming';
		if (today > endDate) return 'past';
		return 'ongoing';
	}

	function triggerImport() {
		importError = null;
		fileInput?.click();
	}

	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const importedTrip = await storageService.readJsonFile(file);
			const { trip, embeddedColorScheme } = tripStore.importTrip(importedTrip);
			
			// If trip came with an embedded color scheme, add it to user's schemes
			if (embeddedColorScheme) {
				settingsStore.addCustomColorScheme(embeddedColorScheme);
			}
			
			goto(`/trip/${trip.id}`);
		} catch (error) {
			importError = error instanceof Error ? error.message : 'Failed to import trip';
			console.error('Import failed:', error);
		}

		// Reset input
		input.value = '';
	}
</script>

<div class="home-page">
	<header class="page-header">
		<div>
			<h1>My Trips</h1>
			<p class="subtitle">Plan and organize your travel adventures</p>
		</div>
		<div class="header-actions">
			<Button variant="secondary" onclick={triggerImport}>
				<Icon name="import" size={18} />
				Import
			</Button>
			<Button onclick={openCreateModal}>
				<Icon name="add" size={18} />
				New Trip
			</Button>
		</div>
		<input
			type="file"
			accept=".json"
			class="hidden-input"
			bind:this={fileInput}
			onchange={handleFileSelect}
		/>
	</header>

	{#if importError}
		<div class="import-error">
			<Icon name="close" size={16} />
			{importError}
			<button type="button" class="dismiss-btn" onclick={() => (importError = null)}>Dismiss</button>
		</div>
	{/if}

	{#if trips.length === 0}
		<div class="empty-state">
			<div class="empty-icon">
				<Icon name="flight" size={48} />
			</div>
			<h2>No trips yet</h2>
			<p>Create your first trip to start planning your adventure!</p>
			<Button onclick={openCreateModal}>
				<Icon name="add" size={18} />
				Create Trip
			</Button>
		</div>
	{:else}
		<div class="trips-grid">
			{#each trips as trip (trip.id)}
				{@const status = getTripStatus(trip.startDate, trip.endDate)}
				{@const duration = getTripDuration(trip.startDate, trip.endDate)}
				<Card hoverable onclick={() => viewTrip(trip.id)}>
					<div class="trip-card">
						<div class="trip-header">
							<Badge
								variant={status === 'ongoing'
									? 'success'
									: status === 'upcoming'
										? 'info'
										: 'default'}
							>
								{status}
							</Badge>
							<button
								type="button"
								class="delete-btn"
								onclick={(e) => deleteTrip(trip.id, e)}
								title="Delete trip"
							>
								<Icon name="delete" size={16} />
							</button>
						</div>
						<h3 class="trip-name">{trip.name}</h3>
						{#if trip.description}
							<p class="trip-description">{trip.description}</p>
						{/if}
						<div class="trip-meta">
							<span class="trip-dates">
								<Icon name="calendar" size={14} />
								{formatDate(trip.startDate, { month: 'short', day: 'numeric' })} -
								{formatDate(trip.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
							</span>
							<span class="trip-duration">{duration} days</span>
						</div>
						<div class="trip-cities">
							{#if trip.cities.length > 0}
								{#each trip.cities.slice(0, 3) as city}
									<span class="city-tag">{city.name}</span>
								{/each}
								{#if trip.cities.length > 3}
									<span class="city-more">+{trip.cities.length - 3} more</span>
								{/if}
							{:else}
								<span class="no-cities">No cities added</span>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<Modal isOpen={showCreateModal} title="Create New Trip" onclose={() => (showCreateModal = false)}>
	<form class="create-form" onsubmit={(e) => { e.preventDefault(); createTrip(); }}>
		<Input
			label="Trip Name"
			placeholder="e.g., Summer in Europe"
			bind:value={newTripName}
			required
		/>
		<div class="date-row">
			<div class="form-field">
				<label class="label" for="start-date">Start Date</label>
				<input
					type="date"
					id="start-date"
					class="input"
					bind:value={newTripStartDate}
					required
				/>
			</div>
			<div class="form-field">
				<label class="label" for="end-date">End Date</label>
				<input
					type="date"
					id="end-date"
					class="input"
					bind:value={newTripEndDate}
					min={newTripStartDate}
					required
				/>
			</div>
		</div>
		<div class="form-field">
			<label class="label" for="description">Description (optional)</label>
			<textarea
				id="description"
				class="input textarea"
				placeholder="What's this trip about?"
				bind:value={newTripDescription}
				rows="3"
			></textarea>
		</div>
		<div class="form-actions">
			<Button variant="secondary" onclick={() => (showCreateModal = false)}>Cancel</Button>
			<Button type="submit" disabled={!newTripName || !newTripStartDate || !newTripEndDate}>
				Create Trip
			</Button>
		</div>
	</form>

	{#snippet footer()}
		<!-- Footer handled in form -->
	{/snippet}
</Modal>

<style>
	.home-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: var(--space-8);

		& h1 {
			margin-bottom: var(--space-1);
		}
	}

	.header-actions {
		display: flex;
		gap: var(--space-2);
	}

	.hidden-input {
		display: none;
	}

	.subtitle {
		color: var(--text-secondary);
		margin: 0;
	}

	.import-error {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: color-mix(in oklch, var(--color-error), transparent 90%);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		margin-bottom: var(--space-4);
		font-size: 0.875rem;
	}

	.dismiss-btn {
		margin-left: auto;
		background: none;
		border: none;
		color: var(--color-error);
		cursor: pointer;
		font-size: 0.75rem;
		text-decoration: underline;

		&:hover {
			opacity: 0.8;
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-16) var(--space-4);
		background: var(--surface-primary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-lg);

		& h2 {
			margin: var(--space-4) 0 var(--space-2);
		}

		& p {
			color: var(--text-secondary);
			margin-bottom: var(--space-6);
		}
	}

	.empty-icon {
		color: var(--text-tertiary);
	}

	.trips-grid {
		display: grid;
		gap: var(--space-4);
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}

	.trip-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.trip-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-tertiary);
		cursor: pointer;

		&:hover {
			background: color-mix(in oklch, var(--color-error), transparent 90%);
			color: var(--color-error);
		}
	}

	.trip-name {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.trip-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.trip-meta {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.trip-dates {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.trip-duration {
		color: var(--text-tertiary);
	}

	.trip-cities {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		margin-top: var(--space-2);
	}

	.city-tag {
		font-size: 0.75rem;
		padding: 2px 8px;
		background: var(--surface-secondary);
		border-radius: var(--radius-full);
		color: var(--text-secondary);
	}

	.city-more {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		padding: 2px 4px;
	}

	.no-cities {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		font-style: italic;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.date-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.textarea {
		resize: vertical;
		min-height: 80px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			gap: var(--space-4);
		}

		.date-row {
			grid-template-columns: 1fr;
		}
	}
</style>
