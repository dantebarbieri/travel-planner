import type { Trip } from '$lib/types/travel';
import type { UserSettings, CustomColorScheme } from '$lib/types/settings';
import { DEFAULT_USER_SETTINGS } from '$lib/types/settings';

/**
 * Extended trip format for JSON export/import.
 * Includes an optional embedded color scheme so trips can be shared with their custom colors.
 */
export interface ExportedTrip extends Trip {
	/** The custom color scheme used by this trip (embedded for sharing) */
	embeddedColorScheme?: CustomColorScheme;
}

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
			if (e instanceof DOMException && e.name === 'QuotaExceededError') {
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
			if (!data) return null;

			const parsed = JSON.parse(data);
			// Migrate and merge with defaults to handle new fields
			return this.migrateSettings(parsed);
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

	/**
	 * Migrate old settings format to new format.
	 * Handles backwards compatibility when new settings fields are added.
	 */
	private migrateSettings(oldSettings: Record<string, unknown>): UserSettings {
		// Start with defaults
		const settings: UserSettings = { ...DEFAULT_USER_SETTINGS };

		// Migrate theme (new field, default to 'system')
		if (typeof oldSettings.theme === 'string') {
			settings.theme = oldSettings.theme as UserSettings['theme'];
		}

		// Migrate temperature unit
		if (typeof oldSettings.temperatureUnit === 'string') {
			settings.temperatureUnit = oldSettings.temperatureUnit as UserSettings['temperatureUnit'];
		}

		// Migrate distance unit
		if (typeof oldSettings.distanceUnit === 'string') {
			settings.distanceUnit = oldSettings.distanceUnit as UserSettings['distanceUnit'];
		}

		// Migrate time format
		if (typeof oldSettings.timeFormat === 'string') {
			settings.timeFormat = oldSettings.timeFormat as UserSettings['timeFormat'];
		}

		// Migrate map app preference
		if (typeof oldSettings.preferredMapApp === 'string') {
			settings.preferredMapApp = oldSettings.preferredMapApp as UserSettings['preferredMapApp'];
		}

		// Migrate disabled transport modes (new field)
		if (Array.isArray(oldSettings.disabledTransportModes)) {
			settings.disabledTransportModes =
				oldSettings.disabledTransportModes as UserSettings['disabledTransportModes'];
		}

		// Migrate color mode (was defaultColorScheme.mode, now defaultColorMode)
		if (typeof oldSettings.defaultColorMode === 'string') {
			settings.defaultColorMode = oldSettings.defaultColorMode as UserSettings['defaultColorMode'];
		} else if (
			oldSettings.defaultColorScheme &&
			typeof (oldSettings.defaultColorScheme as Record<string, unknown>).mode === 'string'
		) {
			settings.defaultColorMode = (oldSettings.defaultColorScheme as Record<string, unknown>)
				.mode as UserSettings['defaultColorMode'];
		}

		// Migrate custom color schemes (renamed from customColorPalettes)
		if (Array.isArray(oldSettings.customColorSchemes)) {
			settings.customColorSchemes =
				oldSettings.customColorSchemes as UserSettings['customColorSchemes'];
		} else if (Array.isArray(oldSettings.customColorPalettes)) {
			// Migrate old customColorPalettes to new customColorSchemes format
			// Old palettes only had colors, new schemes have kindColors + paletteColors
			settings.customColorSchemes = [];
		}

		// Migrate default color scheme ID (renamed from defaultPaletteId)
		if (typeof oldSettings.defaultColorSchemeId === 'string') {
			settings.defaultColorSchemeId = oldSettings.defaultColorSchemeId;
		}

		// Migrate home city
		if (oldSettings.homeCity && typeof oldSettings.homeCity === 'object') {
			settings.homeCity = oldSettings.homeCity as UserSettings['homeCity'];
		}

		// Migrate auto-save settings
		if (typeof oldSettings.autoSaveEnabled === 'boolean') {
			settings.autoSaveEnabled = oldSettings.autoSaveEnabled;
		}
		// Handle old field name (autoSaveInterval) -> new name (autoSaveIntervalMs)
		if (typeof oldSettings.autoSaveIntervalMs === 'number') {
			settings.autoSaveIntervalMs = oldSettings.autoSaveIntervalMs;
		} else if (typeof oldSettings.autoSaveInterval === 'number') {
			settings.autoSaveIntervalMs = oldSettings.autoSaveInterval;
		}

		return settings;
	}

	// ============ Import/Export ============

	/**
	 * Export a trip to JSON, optionally embedding the custom color scheme if one is used.
	 * @param trip The trip to export
	 * @param customSchemes The user's custom color schemes (to look up the embedded scheme)
	 */
	exportToJson(trip: Trip, customSchemes: CustomColorScheme[] = []): string {
		const exportedTrip: ExportedTrip = { ...trip };
		
		// If trip uses a custom color scheme, embed it in the export
		const schemeId = trip.colorScheme.customSchemeId;
		if (schemeId) {
			const scheme = customSchemes.find(s => s.id === schemeId);
			if (scheme) {
				exportedTrip.embeddedColorScheme = scheme;
			}
		}
		
		return JSON.stringify(exportedTrip, null, 2);
	}

	importFromJson(jsonString: string): ExportedTrip {
		const trip = JSON.parse(jsonString);
		if (!trip.id || !trip.name || !trip.startDate || !trip.endDate) {
			throw new Error('Invalid trip format: missing required fields');
		}
		return trip as ExportedTrip;
	}

	/**
	 * Download a trip as a JSON file, embedding the custom color scheme if one is used.
	 * @param trip The trip to download
	 * @param customSchemes The user's custom color schemes (to look up the embedded scheme)
	 */
	downloadJson(trip: Trip, customSchemes: CustomColorScheme[] = []): void {
		const json = this.exportToJson(trip, customSchemes);
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

	async readJsonFile(file: File): Promise<ExportedTrip> {
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
