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
	CustomColorScheme
} from '$lib/types/settings';
import type { Trip, Location, KindColors } from '$lib/types/travel';
import { storageService } from '$lib/services/storageService';
import { detectPreferredMapsApp } from '$lib/services/mapService';
import { defaultKindColors, defaultPaletteColors } from '$lib/utils/colors';
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
	colorScheme: state.userSettings.defaultColorSchemeId
		? (state.userSettings.customColorSchemes.find(
				(s) => s.id === state.userSettings.defaultColorSchemeId
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

function setDefaultColorScheme(schemeId: string | undefined): void {
	updateUserSettings({ defaultColorSchemeId: schemeId });
}

// ============ Custom Color Scheme Management ============

function addCustomColorScheme(scheme: CustomColorScheme): void {
	const schemes = [...state.userSettings.customColorSchemes, scheme];
	updateUserSettings({ customColorSchemes: schemes });
}

function updateCustomColorScheme(schemeId: string, updates: Partial<CustomColorScheme>): void {
	const schemes = state.userSettings.customColorSchemes.map((s) =>
		s.id === schemeId ? { ...s, ...updates } : s
	);
	updateUserSettings({ customColorSchemes: schemes });
}

function deleteCustomColorScheme(schemeId: string): void {
	const schemes = state.userSettings.customColorSchemes.filter((s) => s.id !== schemeId);
	const updates: Partial<UserSettings> = { customColorSchemes: schemes };

	// Clear default scheme if it was the deleted one
	if (state.userSettings.defaultColorSchemeId === schemeId) {
		updates.defaultColorSchemeId = undefined;
	}

	updateUserSettings(updates);
}

function getEffectiveKindColors(): KindColors {
	const scheme = state.userSettings.defaultColorSchemeId
		? state.userSettings.customColorSchemes.find(s => s.id === state.userSettings.defaultColorSchemeId)
		: null;
	return scheme?.kindColors ?? defaultKindColors;
}

function getEffectivePaletteColors(): string[] {
	const scheme = state.userSettings.defaultColorSchemeId
		? state.userSettings.customColorSchemes.find(s => s.id === state.userSettings.defaultColorSchemeId)
		: null;
	return scheme?.paletteColors ?? defaultPaletteColors;
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

	// Determine the effective color scheme
	let colorScheme: CustomColorScheme | null = null;
	if (tripSettings.colorSchemeOverridden && trip.colorScheme.customSchemeId) {
		// Trip has a specific scheme override
		colorScheme = user.customColorSchemes.find((s) => s.id === trip.colorScheme.customSchemeId) ?? null;
	} else if (user.defaultColorSchemeId) {
		// Use user's default scheme
		colorScheme = user.customColorSchemes.find((s) => s.id === user.defaultColorSchemeId) ?? null;
	}

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
		colorScheme,
		homeCity: user.homeCity ?? null,

		// Track which settings are overridden
		overrides: {
			temperatureUnit: isOverridden(tripSettings.temperatureUnit),
			distanceUnit: isOverridden(tripSettings.distanceUnit),
			timeFormat: isOverridden(tripSettings.timeFormat),
			disabledTransportModes: isOverridden(tripSettings.disabledTransportModes),
			colorMode: tripSettings.colorModeOverridden ?? false,
			colorScheme: tripSettings.colorSchemeOverridden ?? false
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
	setDefaultColorScheme,

	// Custom color schemes
	addCustomColorScheme,
	updateCustomColorScheme,
	deleteCustomColorScheme,
	getEffectiveKindColors,
	getEffectivePaletteColors,

	// Theme
	applyThemeToDOM,
	initThemeListener,

	// Trip resolution
	resolveSettingsForTrip,
	getConcreteTemperatureUnit,
	getConcreteDistanceUnit,
	getConcreteMapApp
};
