import type {
	UserSettings,
	TripSettings,
	ResolvedSettings,
	ResolvedTripSettings,
	ThemeMode,
	TemperatureUnit,
	DistanceUnit,
	TimeFormat,
	MapApp,
	DisableableTransportMode,
	CustomColorPalette,
	CustomKindColors
} from '$lib/types/settings';
import type { Trip, Location, KindColors } from '$lib/types/travel';
import { storageService } from '$lib/services/storageService';
import { detectPreferredMapsApp } from '$lib/services/mapService';
import { defaultKindColors, defaultStayColorPalette } from '$lib/utils/colors';
import {
	DEFAULT_USER_SETTINGS,
	isOverridden,
	getSettingValue,
	resolveLocationBasedTemperature,
	resolveLocationBasedDistance
} from '$lib/types/settings';

// ============ State ============

interface SettingsStoreState {
	userSettings: UserSettings;
	isLoading: boolean;
	error: string | null;
}

let state = $state<SettingsStoreState>({
	userSettings: { ...DEFAULT_USER_SETTINGS },
	isLoading: false,
	error: null
});

// Track system preference reactively
let systemPrefersDark = $state(false);

// ============ Derived: Applied Theme ============

/**
 * The actual theme to apply to the DOM, resolving 'system' to light/dark.
 */
const appliedTheme = $derived.by((): 'light' | 'dark' => {
	if (state.userSettings.theme === 'system') {
		return systemPrefersDark ? 'dark' : 'light';
	}
	return state.userSettings.theme;
});

// ============ Derived: Resolved User Settings ============

const resolvedUserSettings = $derived<ResolvedSettings>({
	theme: state.userSettings.theme,
	temperatureUnit: state.userSettings.temperatureUnit,
	distanceUnit: state.userSettings.distanceUnit,
	timeFormat: state.userSettings.timeFormat,
	preferredMapApp: state.userSettings.preferredMapApp,
	disabledTransportModes: state.userSettings.disabledTransportModes,
	colorMode: state.userSettings.defaultColorMode,
	palette: state.userSettings.defaultPaletteId
		? (state.userSettings.customColorPalettes.find(
				(p) => p.id === state.userSettings.defaultPaletteId
			) ?? null)
		: null,
	homeCity: state.userSettings.homeCity ?? null
});

// ============ Load/Save ============

function loadSettings(): void {
	state.isLoading = true;
	state.error = null;
	try {
		const loaded = storageService.loadSettings();
		if (loaded) {
			// Merge with defaults to handle new settings added in updates
			state.userSettings = { ...DEFAULT_USER_SETTINGS, ...loaded };
		}
	} catch (e) {
		state.error = 'Failed to load settings';
		console.error(e);
	} finally {
		state.isLoading = false;
	}
}

function saveSettings(): void {
	storageService.saveSettings(state.userSettings);
}

// ============ User Settings Updates ============

function updateUserSettings(updates: Partial<UserSettings>): void {
	state.userSettings = { ...state.userSettings, ...updates };
	saveSettings();

	// Apply theme immediately if changed
	if (updates.theme !== undefined) {
		applyThemeToDOM();
	}
}

function setTheme(theme: ThemeMode): void {
	updateUserSettings({ theme });
}

function setTemperatureUnit(unit: TemperatureUnit): void {
	updateUserSettings({ temperatureUnit: unit });
}

function setDistanceUnit(unit: DistanceUnit): void {
	updateUserSettings({ distanceUnit: unit });
}

function setTimeFormat(format: TimeFormat): void {
	updateUserSettings({ timeFormat: format });
}

function setPreferredMapApp(app: MapApp): void {
	updateUserSettings({ preferredMapApp: app });
}

function toggleTransportMode(mode: DisableableTransportMode): void {
	const current = state.userSettings.disabledTransportModes;
	const updated = current.includes(mode)
		? current.filter((m) => m !== mode)
		: [...current, mode];
	updateUserSettings({ disabledTransportModes: updated });
}

function setDisabledTransportModes(modes: DisableableTransportMode[]): void {
	updateUserSettings({ disabledTransportModes: modes });
}

function setHomeCity(city: Location | undefined): void {
	updateUserSettings({ homeCity: city });
}

function setDefaultColorMode(mode: 'by-kind' | 'by-stay'): void {
	updateUserSettings({ defaultColorMode: mode });
}

function setDefaultPalette(paletteId: string | undefined): void {
	updateUserSettings({ defaultPaletteId: paletteId });
}

// ============ Custom Palette Management ============

function addCustomPalette(palette: CustomColorPalette): void {
	const palettes = [...state.userSettings.customColorPalettes, palette];
	updateUserSettings({ customColorPalettes: palettes });
}

function updateCustomPalette(paletteId: string, updates: Partial<CustomColorPalette>): void {
	const palettes = state.userSettings.customColorPalettes.map((p) =>
		p.id === paletteId ? { ...p, ...updates } : p
	);
	updateUserSettings({ customColorPalettes: palettes });
}

function deleteCustomPalette(paletteId: string): void {
	const palettes = state.userSettings.customColorPalettes.filter((p) => p.id !== paletteId);
	const updates: Partial<UserSettings> = { customColorPalettes: palettes };

	// Clear default palette if it was the deleted one
	if (state.userSettings.defaultPaletteId === paletteId) {
		updates.defaultPaletteId = undefined;
	}

	updateUserSettings(updates);
}

// ============ Custom Kind Colors Management ============

function setCustomKindColors(kindColors: CustomKindColors): void {
	updateUserSettings({ customKindColors: kindColors });
}

function resetKindColors(): void {
	updateUserSettings({ customKindColors: undefined });
}

function getEffectiveKindColors(): KindColors {
	return state.userSettings.customKindColors ?? defaultKindColors;
}

// ============ Theme Application ============

function applyThemeToDOM(): void {
	if (typeof document === 'undefined') return;

	const theme = appliedTheme;
	document.documentElement.setAttribute('data-theme', theme);

	// Also update meta theme-color for mobile browsers
	let metaTheme = document.querySelector('meta[name="theme-color"]');
	if (!metaTheme) {
		metaTheme = document.createElement('meta');
		metaTheme.setAttribute('name', 'theme-color');
		document.head.appendChild(metaTheme);
	}
	metaTheme.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
}

/**
 * Initialize theme system and listen for system preference changes.
 * Call this once on app startup.
 */
function initThemeListener(): void {
	if (typeof window === 'undefined') return;

	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	// Set initial value
	systemPrefersDark = mediaQuery.matches;

	// Listen for changes
	mediaQuery.addEventListener('change', (e) => {
		systemPrefersDark = e.matches;
		if (state.userSettings.theme === 'system') {
			applyThemeToDOM();
		}
	});

	// Apply initial theme
	applyThemeToDOM();
}

// ============ Trip Settings Resolution ============

/**
 * Resolve settings for a specific trip, merging user defaults with trip overrides.
 */
function resolveSettingsForTrip(trip: Trip): ResolvedTripSettings {
	const tripSettings = trip.settings ?? {};
	const user = state.userSettings;

	return {
		theme: user.theme, // Theme is always global
		temperatureUnit: getSettingValue(tripSettings.temperatureUnit, user.temperatureUnit),
		distanceUnit: getSettingValue(tripSettings.distanceUnit, user.distanceUnit),
		timeFormat: getSettingValue(tripSettings.timeFormat, user.timeFormat),
		preferredMapApp: user.preferredMapApp, // Map app is always global
		disabledTransportModes: getSettingValue(
			tripSettings.disabledTransportModes,
			user.disabledTransportModes
		),
		colorMode: tripSettings.colorModeOverridden ? trip.colorScheme.mode : user.defaultColorMode,
		palette:
			tripSettings.paletteOverridden && trip.colorScheme.palette
				? trip.colorScheme.palette
				: user.defaultPaletteId
					? (user.customColorPalettes.find((p) => p.id === user.defaultPaletteId) ?? null)
					: null,
		homeCity: user.homeCity ?? null,

		// Track which settings are overridden
		overrides: {
			temperatureUnit: isOverridden(tripSettings.temperatureUnit),
			distanceUnit: isOverridden(tripSettings.distanceUnit),
			timeFormat: isOverridden(tripSettings.timeFormat),
			disabledTransportModes: isOverridden(tripSettings.disabledTransportModes),
			colorMode: tripSettings.colorModeOverridden ?? false,
			palette: tripSettings.paletteOverridden ?? false
		}
	};
}

/**
 * Get the concrete temperature unit for display, resolving 'trip-location'.
 */
function getConcreteTemperatureUnit(
	unit: TemperatureUnit,
	destinationCountry?: string
): 'celsius' | 'fahrenheit' {
	if (unit === 'trip-location') {
		return resolveLocationBasedTemperature(destinationCountry);
	}
	return unit;
}

/**
 * Get the concrete distance unit for display, resolving 'trip-location'.
 */
function getConcreteDistanceUnit(unit: DistanceUnit, destinationCountry?: string): 'km' | 'miles' {
	if (unit === 'trip-location') {
		return resolveLocationBasedDistance(destinationCountry);
	}
	return unit;
}

/**
 * Get the concrete map app for opening directions, resolving 'system' to platform default.
 */
function getConcreteMapApp(app: MapApp): 'google' | 'apple' {
	if (app === 'system') {
		return detectPreferredMapsApp();
	}
	return app;
}

// ============ Export Store ============

export const settingsStore = {
	get state() {
		return state;
	},
	get userSettings() {
		return state.userSettings;
	},
	get appliedTheme() {
		return appliedTheme;
	},
	get resolvedUserSettings() {
		return resolvedUserSettings;
	},
	get systemPrefersDark() {
		return systemPrefersDark;
	},

	// Load/Save
	loadSettings,
	saveSettings,

	// User settings updates
	updateUserSettings,
	setTheme,
	setTemperatureUnit,
	setDistanceUnit,
	setTimeFormat,
	setPreferredMapApp,
	toggleTransportMode,
	setDisabledTransportModes,
	setHomeCity,
	setDefaultColorMode,
	setDefaultPalette,

	// Custom palettes
	addCustomPalette,
	updateCustomPalette,
	deleteCustomPalette,

	// Kind colors
	setCustomKindColors,
	resetKindColors,
	getEffectiveKindColors,

	// Theme
	applyThemeToDOM,
	initThemeListener,

	// Trip resolution
	resolveSettingsForTrip,
	getConcreteTemperatureUnit,
	getConcreteDistanceUnit,
	getConcreteMapApp
};
