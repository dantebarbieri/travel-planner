import type { Trip, UserSettings } from '$lib/types/travel';

const STORAGE_KEYS = {
	TRIPS: 'travel-planner-trips',
	SETTINGS: 'travel-planner-settings',
	LAST_SAVE: 'travel-planner-last-save'
} as const;

class StorageService {
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private debounceMs = 1000;

	private isAvailable(): boolean {
		if (typeof window === 'undefined') return false;
		try {
			const test = '__storage_test__';
			window.localStorage.setItem(test, test);
			window.localStorage.removeItem(test);
			return true;
		} catch {
			return false;
		}
	}

	// ============ Trips ============

	loadTrips(): Trip[] {
		if (!this.isAvailable()) return [];
		try {
			const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
			return data ? JSON.parse(data) : [];
		} catch (e) {
			console.error('Failed to load trips:', e);
			return [];
		}
	}

	saveTrips(trips: Trip[]): void {
		if (!this.isAvailable()) return;
		try {
			localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
			localStorage.setItem(STORAGE_KEYS.LAST_SAVE, new Date().toISOString());
		} catch (e) {
			console.error('Failed to save trips:', e);
			if (e instanceof DOMException && e.code === 22) {
				this.handleStorageQuotaExceeded();
			}
		}
	}

	saveTripsDebounced(trips: Trip[]): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
		this.saveTimeout = setTimeout(() => {
			this.saveTrips(trips);
		}, this.debounceMs);
	}

	getTrip(id: string): Trip | null {
		const trips = this.loadTrips();
		return trips.find((t) => t.id === id) || null;
	}

	saveTrip(trip: Trip): void {
		const trips = this.loadTrips();
		const index = trips.findIndex((t) => t.id === trip.id);
		if (index >= 0) {
			trips[index] = trip;
		} else {
			trips.push(trip);
		}
		this.saveTrips(trips);
	}

	deleteTrip(id: string): void {
		const trips = this.loadTrips();
		const filtered = trips.filter((t) => t.id !== id);
		this.saveTrips(filtered);
	}

	// ============ Settings ============

	loadSettings(): UserSettings | null {
		if (!this.isAvailable()) return null;
		try {
			const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
			return data ? JSON.parse(data) : null;
		} catch {
			return null;
		}
	}

	saveSettings(settings: UserSettings): void {
		if (!this.isAvailable()) return;
		try {
			localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
		} catch (e) {
			console.error('Failed to save settings:', e);
		}
	}

	// ============ Import/Export ============

	exportToJson(trip: Trip): string {
		return JSON.stringify(trip, null, 2);
	}

	importFromJson(jsonString: string): Trip {
		const trip = JSON.parse(jsonString);
		if (!trip.id || !trip.name || !trip.startDate || !trip.endDate) {
			throw new Error('Invalid trip format: missing required fields');
		}
		return trip as Trip;
	}

	downloadJson(trip: Trip): void {
		const json = this.exportToJson(trip);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${trip.name.replace(/\s+/g, '-').toLowerCase()}-${trip.id}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async readJsonFile(file: File): Promise<Trip> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const json = e.target?.result as string;
					const trip = this.importFromJson(json);
					resolve(trip);
				} catch (err) {
					reject(err);
				}
			};
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsText(file);
		});
	}

	// ============ Utility ============

	getLastSaveTime(): Date | null {
		if (!this.isAvailable()) return null;
		const saved = localStorage.getItem(STORAGE_KEYS.LAST_SAVE);
		return saved ? new Date(saved) : null;
	}

	clearAllData(): void {
		if (!this.isAvailable()) return;
		Object.values(STORAGE_KEYS).forEach((key) => {
			localStorage.removeItem(key);
		});
	}

	private handleStorageQuotaExceeded(): void {
		console.warn('Storage quota exceeded - attempting to free space');
		const trips = this.loadTrips();

		// Sort by updatedAt and keep only recent trips
		trips.sort(
			(a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
		);

		// Keep only 10 most recent trips
		const recentTrips = trips.slice(0, 10);
		try {
			localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(recentTrips));
			console.warn('Kept only 10 most recent trips due to storage limits');
		} catch {
			// If still failing, clear all trips
			localStorage.removeItem(STORAGE_KEYS.TRIPS);
			console.error('Had to clear all trips due to storage limits');
		}
	}
}

export const storageService = new StorageService();
