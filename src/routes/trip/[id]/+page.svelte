<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { tripStore } from '$lib/stores/tripStore.svelte';
	import { fakeWeatherAdapter } from '$lib/adapters/weather/fakeAdapter';
	import { formatDate, daysBetween } from '$lib/utils/dates';
	import type { WeatherCondition, City, DailyItem, ItineraryDay, Activity, FoodVenue, TravelMode } from '$lib/types/travel';
	import ItineraryDayComponent from '$lib/components/itinerary/ItineraryDay.svelte';
	import AddItemModal from '$lib/components/modals/AddItemModal.svelte';
	import MoveItemModal from '$lib/components/modals/MoveItemModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { storageService } from '$lib/services/storageService';
	import { documentService } from '$lib/services/documentService';
	import { onMount } from 'svelte';

	const tripId = $derived($page.params.id);
	const trip = $derived(tripStore.state.trips.find((t) => t.id === tripId));

	let weatherData = $state<Record<string, WeatherCondition>>({});
	let isEditing = $state(false);
	let showAddCityModal = $state(false);
	let newCityName = $state('');
	let newCityCountry = $state('');
	let newCityStartDate = $state('');
	let newCityEndDate = $state('');
	let showExportModal = $state(false);
	let isExporting = $state(false);
	let showEditCityModal = $state(false);
	let editingCity = $state<City | null>(null);
	let editCityStartDate = $state('');
	let editCityEndDate = $state('');
	let showAddItemModal = $state(false);
	let addItemDayId = $state<string | null>(null);
	let addItemKind = $state<'activity' | 'food' | 'stay' | 'transport'>('activity');
	let showMoveItemModal = $state(false);
	let moveItemId = $state<string | null>(null);
	let moveItemFromDayId = $state<string | null>(null);

	onMount(async () => {
		if (trip) {
			tripStore.setCurrentTrip(trip.id);
			await loadWeather();
		}
	});

	async function loadWeather() {
		if (!trip) return;

		for (const day of trip.itinerary) {
			const city = trip.cities.find((c) => day.cityIds.includes(c.id));
			if (city) {
				const location = {
					name: city.name,
					address: {
						street: '',
						city: city.name,
						country: city.country,
						formatted: `${city.name}, ${city.country}`
					},
					geo: city.location
				};
				try {
					const forecasts = await fakeWeatherAdapter.getForecast(location, [day.date]);
					if (forecasts[0]) {
						weatherData[day.date] = forecasts[0];
					}
				} catch {
					// Ignore weather errors
				}
			}
		}
	}

	function toggleEditing() {
		isEditing = !isEditing;
	}

	function openExportModal() {
		showExportModal = true;
	}

	async function exportAs(format: 'json' | 'pdf' | 'docx' | 'print') {
		if (!trip) return;
		isExporting = true;
		try {
			switch (format) {
				case 'json':
					storageService.downloadJson(trip);
					break;
				case 'pdf':
					await documentService.exportToPDF(trip);
					break;
				case 'docx':
					await documentService.exportToDOCX(trip);
					break;
				case 'print':
					documentService.openPrintView(trip);
					break;
			}
			showExportModal = false;
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			isExporting = false;
		}
	}

	function toggleColorMode() {
		if (trip) {
			tripStore.toggleColorMode(trip.id);
		}
	}

	function openAddCityModal() {
		newCityName = '';
		newCityCountry = '';
		newCityStartDate = trip?.startDate || '';
		newCityEndDate = trip?.endDate || '';
		showAddCityModal = true;
	}

	function addCity() {
		if (!trip || !newCityName || !newCityCountry || !newCityStartDate || !newCityEndDate) return;

		tripStore.addCity(trip.id, {
			name: newCityName,
			country: newCityCountry,
			location: { latitude: 0, longitude: 0 },
			timezone: 'UTC',
			startDate: newCityStartDate,
			endDate: newCityEndDate
		});

		showAddCityModal = false;
	}

	function handleAddItem(day: ItineraryDay) {
		addItemDayId = day.id;
		addItemKind = 'activity';
		showAddItemModal = true;
	}

	function openEditCityModal(city: City) {
		editingCity = city;
		editCityStartDate = city.startDate;
		editCityEndDate = city.endDate;
		showEditCityModal = true;
	}

	function saveCityDates() {
		if (!trip || !editingCity || !editCityStartDate || !editCityEndDate) return;
		tripStore.updateCity(trip.id, editingCity.id, {
			startDate: editCityStartDate,
			endDate: editCityEndDate
		});
		showEditCityModal = false;
		editingCity = null;
	}

	function deleteCity(cityId: string) {
		if (!trip) return;
		if (confirm('Are you sure you want to remove this city?')) {
			tripStore.removeCity(trip.id, cityId);
		}
	}

	function handleAddActivityToDay(activity: Activity) {
		if (!trip || !addItemDayId) return;

		// Add the activity to the trip
		tripStore.addActivity(trip.id, activity);

		// Add it to the day's items
		tripStore.addDayItem(trip.id, addItemDayId, {
			kind: 'activity',
			activityId: activity.id
		});
	}

	function handleAddFoodVenueToDay(venue: FoodVenue) {
		if (!trip || !addItemDayId) return;

		// Add the food venue to the trip
		tripStore.addFoodVenue(trip.id, venue);

		// Add it to the day's items
		tripStore.addDayItem(trip.id, addItemDayId, {
			kind: 'food',
			foodVenueId: venue.id,
			mealSlot: venue.mealType
		});
	}

	// Get the city location for the current add item day
	const addItemCityLocation = $derived.by(() => {
		if (!trip || !addItemDayId) return undefined;
		const day = trip.itinerary.find((d) => d.id === addItemDayId);
		if (!day || day.cityIds.length === 0) return undefined;
		const city = trip.cities.find((c) => c.id === day.cityIds[0]);
		return city?.location;
	});

	function handleReorder(dayId: string, items: DailyItem[]) {
		if (trip) {
			tripStore.reorderDayItems(trip.id, dayId, items);
		}
	}

	function handleRemoveItem(dayId: string, itemId: string) {
		if (trip) {
			tripStore.removeDayItem(trip.id, dayId, itemId);
		}
	}

	function handleMoveItem(dayId: string, itemId: string) {
		moveItemFromDayId = dayId;
		moveItemId = itemId;
		showMoveItemModal = true;
	}

	function handleMoveItemConfirm(toDayId: string) {
		if (trip && moveItemFromDayId && moveItemId) {
			tripStore.moveDayItem(trip.id, moveItemFromDayId, toDayId, moveItemId);
		}
		showMoveItemModal = false;
		moveItemId = null;
		moveItemFromDayId = null;
	}

	function handleTravelModeChange(dayId: string, itemId: string, mode: TravelMode) {
		if (trip) {
			tripStore.updateDayItem(trip.id, dayId, itemId, { travelMode: mode });
		}
	}

	const duration = $derived(trip ? daysBetween(trip.startDate, trip.endDate) + 1 : 0);
	const allStays = $derived(trip?.cities.flatMap((c) => c.stays) || []);
</script>

{#if !trip}
	<div class="not-found">
		<h1>Trip not found</h1>
		<p>The trip you're looking for doesn't exist.</p>
		<Button onclick={() => goto('/')}>Go Home</Button>
	</div>
{:else}
	<div class="trip-page">
		<header class="trip-header">
			<div class="trip-info">
				<a href="/" class="back-link">
					<Icon name="chevronLeft" size={20} />
					Back to trips
				</a>
				<h1>{trip.name}</h1>
				<div class="trip-meta">
					<span class="trip-dates">
						<Icon name="calendar" size={16} />
						{formatDate(trip.startDate)} - {formatDate(trip.endDate)}
					</span>
					<Badge>{duration} days</Badge>
					{#if trip.cities.length > 0}
						<span class="trip-cities">
							{trip.cities.map((c) => c.name).join(' → ')}
						</span>
					{/if}
				</div>
			</div>
			<div class="trip-actions">
				<Button variant="ghost" size="sm" onclick={toggleColorMode} title="Toggle color mode">
					Color: {trip.colorScheme.mode === 'by-kind' ? 'By Type' : 'By Stay'}
				</Button>
				<Button variant="ghost" size="sm" onclick={openExportModal}>
					<Icon name="export" size={16} />
					Export
				</Button>
				<Button variant={isEditing ? 'primary' : 'secondary'} size="sm" onclick={toggleEditing}>
					<Icon name={isEditing ? 'check' : 'edit'} size={16} />
					{isEditing ? 'Done' : 'Edit'}
				</Button>
			</div>
		</header>

		{#if trip.cities.length === 0}
			<div class="empty-cities">
				<Icon name="location" size={48} />
				<h2>No destinations yet</h2>
				<p>Add your first city to start planning your itinerary</p>
				<Button onclick={openAddCityModal}>
					<Icon name="add" size={18} />
					Add City
				</Button>
			</div>
		{:else}
			{#if isEditing}
				<div class="cities-manager">
					<h3>Destinations</h3>
					<div class="cities-list">
						{#each trip.cities as city (city.id)}
							<div class="city-item">
								<div class="city-info">
									<span class="city-name">{city.name}, {city.country}</span>
									<span class="city-dates">{formatDate(city.startDate, { month: 'short', day: 'numeric' })} - {formatDate(city.endDate, { month: 'short', day: 'numeric' })}</span>
								</div>
								<div class="city-actions">
									<button type="button" class="icon-btn" onclick={() => openEditCityModal(city)} title="Edit dates">
										<Icon name="edit" size={14} />
									</button>
									<button type="button" class="icon-btn danger" onclick={() => deleteCity(city.id)} title="Remove city">
										<Icon name="delete" size={14} />
									</button>
								</div>
							</div>
						{/each}
					</div>
					<Button variant="secondary" size="sm" onclick={openAddCityModal}>
						<Icon name="add" size={16} />
						Add City
					</Button>
				</div>
			{/if}

			<div class="itinerary-container">
				{#each trip.itinerary as day (day.id)}
					<ItineraryDayComponent
						{day}
						cities={trip.cities}
						stays={allStays}
						activities={trip.activities}
						foodVenues={trip.foodVenues}
						transportLegs={trip.transportLegs}
						colorScheme={trip.colorScheme}
						weather={weatherData[day.date]}
						{isEditing}
						onAddItem={() => handleAddItem(day)}
						onReorder={(items) => handleReorder(day.id, items)}
						onRemoveItem={(itemId) => handleRemoveItem(day.id, itemId)}
						onMoveItem={(itemId) => handleMoveItem(day.id, itemId)}
						onTravelModeChange={(itemId, mode) => handleTravelModeChange(day.id, itemId, mode)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<Modal isOpen={showAddCityModal} title="Add City" onclose={() => (showAddCityModal = false)}>
		<form class="city-form" onsubmit={(e) => { e.preventDefault(); addCity(); }}>
			<Input label="City Name" placeholder="e.g., Paris" bind:value={newCityName} required />
			<Input label="Country" placeholder="e.g., France" bind:value={newCityCountry} required />
			<div class="date-row">
				<div class="form-field">
					<label class="label" for="city-start">Start Date</label>
					<input
						type="date"
						id="city-start"
						class="input"
						bind:value={newCityStartDate}
						required
					/>
				</div>
				<div class="form-field">
					<label class="label" for="city-end">End Date</label>
					<input
						type="date"
						id="city-end"
						class="input"
						bind:value={newCityEndDate}
						min={newCityStartDate}
						required
					/>
				</div>
			</div>
			<p class="date-hint">Dates outside current trip range will extend the trip.</p>
			<div class="form-actions">
				<Button variant="secondary" onclick={() => (showAddCityModal = false)}>Cancel</Button>
				<Button type="submit" disabled={!newCityName || !newCityCountry}>Add City</Button>
			</div>
		</form>
	</Modal>

	<Modal isOpen={showEditCityModal} title="Edit City Dates" onclose={() => (showEditCityModal = false)}>
		{#if editingCity}
			<form class="city-form" onsubmit={(e) => { e.preventDefault(); saveCityDates(); }}>
				<p class="city-name-display">{editingCity.name}, {editingCity.country}</p>
				<div class="date-row">
					<div class="form-field">
						<label class="label" for="edit-city-start">Start Date</label>
						<input
							type="date"
							id="edit-city-start"
							class="input"
							bind:value={editCityStartDate}
							required
						/>
					</div>
					<div class="form-field">
						<label class="label" for="edit-city-end">End Date</label>
						<input
							type="date"
							id="edit-city-end"
							class="input"
							bind:value={editCityEndDate}
							min={editCityStartDate}
							required
						/>
					</div>
				</div>
				<p class="date-hint">Changing dates may extend or shorten the overall trip.</p>
				<div class="form-actions">
					<Button variant="secondary" onclick={() => (showEditCityModal = false)}>Cancel</Button>
					<Button type="submit">Save Changes</Button>
				</div>
			</form>
		{/if}
	</Modal>

	<AddItemModal
		isOpen={showAddItemModal}
		onclose={() => {
			showAddItemModal = false;
			addItemDayId = null;
		}}
		onAddActivity={handleAddActivityToDay}
		onAddFoodVenue={handleAddFoodVenueToDay}
		cityLocation={addItemCityLocation}
	/>

	<MoveItemModal
		isOpen={showMoveItemModal}
		days={trip.itinerary}
		currentDayId={moveItemFromDayId || ''}
		onclose={() => {
			showMoveItemModal = false;
			moveItemId = null;
			moveItemFromDayId = null;
		}}
		onMove={handleMoveItemConfirm}
	/>

	<Modal isOpen={showExportModal} title="Export Trip" onclose={() => (showExportModal = false)}>
		<div class="export-options">
			<button class="export-option" onclick={() => exportAs('pdf')} disabled={isExporting}>
				<div class="export-icon">📄</div>
				<div class="export-info">
					<span class="export-format">PDF</span>
					<span class="export-desc">Best for printing or sharing</span>
				</div>
			</button>
			<button class="export-option" onclick={() => exportAs('docx')} disabled={isExporting}>
				<div class="export-icon">📝</div>
				<div class="export-info">
					<span class="export-format">Word Document</span>
					<span class="export-desc">Editable DOCX format</span>
				</div>
			</button>
			<button class="export-option" onclick={() => exportAs('json')} disabled={isExporting}>
				<div class="export-icon">💾</div>
				<div class="export-info">
					<span class="export-format">JSON</span>
					<span class="export-desc">Backup or import to another device</span>
				</div>
			</button>
			<button class="export-option" onclick={() => exportAs('print')} disabled={isExporting}>
				<div class="export-icon">🖨️</div>
				<div class="export-info">
					<span class="export-format">Print</span>
					<span class="export-desc">Open print-friendly view</span>
				</div>
			</button>
		</div>
		{#if isExporting}
			<div class="export-loading">Preparing export...</div>
		{/if}
	</Modal>
{/if}

<style>
	.trip-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.not-found {
		text-align: center;
		padding: var(--space-16);

		& h1 {
			margin-bottom: var(--space-2);
		}

		& p {
			color: var(--text-secondary);
			margin-bottom: var(--space-6);
		}
	}

	.trip-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--border-color);
	}

	.trip-info {
		flex: 1;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.875rem;
		color: var(--text-secondary);
		text-decoration: none;
		margin-bottom: var(--space-2);

		&:hover {
			color: var(--color-primary);
		}
	}

	.trip-info h1 {
		margin-bottom: var(--space-2);
	}

	.trip-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-3);
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.trip-dates {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.trip-cities {
		color: var(--text-tertiary);
	}

	.trip-actions {
		display: flex;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.empty-cities {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-16) var(--space-4);
		background: var(--surface-primary);
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-lg);
		color: var(--text-tertiary);

		& h2 {
			margin: var(--space-4) 0 var(--space-2);
			color: var(--text-primary);
		}

		& p {
			color: var(--text-secondary);
			margin-bottom: var(--space-6);
		}
	}

	.cities-manager {
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		margin-bottom: var(--space-6);

		& h3 {
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--text-secondary);
			margin: 0 0 var(--space-3);
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}

	.cities-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.city-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		background: var(--surface-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.city-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.city-info .city-name {
		font-weight: 500;
	}

	.city-info .city-dates {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.city-actions {
		display: flex;
		gap: var(--space-1);
	}

	.icon-btn {
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
			background: var(--surface-secondary);
			color: var(--text-primary);
		}

		&.danger:hover {
			background: color-mix(in oklch, var(--color-error), transparent 90%);
			color: var(--color-error);
		}
	}

	.city-name-display {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 var(--space-4);
	}

	.date-hint {
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
		font-style: italic;
	}

	.itinerary-container {
		container-type: inline-size;
		container-name: itinerary;
	}

	.city-form {
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

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.export-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.export-option {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--surface-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:hover:not(:disabled) {
			background: var(--surface-primary);
			border-color: var(--color-primary);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.export-icon {
		font-size: 1.5rem;
		width: 40px;
		text-align: center;
	}

	.export-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.export-format {
		font-weight: 600;
		color: var(--text-primary);
	}

	.export-desc {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.export-loading {
		text-align: center;
		padding: var(--space-4);
		color: var(--text-secondary);
		font-style: italic;
	}

	@media (max-width: 640px) {
		.trip-header {
			flex-direction: column;
		}

		.trip-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.date-row {
			grid-template-columns: 1fr;
		}
	}
</style>
