// ============ Theme Settings ============

export type ThemeMode = 'light' | 'dark' | 'system';

// ============ Unit Preferences ============

export type TemperatureUnit = 'celsius' | 'fahrenheit' | 'trip-location';
export type DistanceUnit = 'km' | 'miles' | 'trip-location';
export type TimeFormat = '12h' | '24h';

// ============ Map Preferences ============

export type MapApp = 'google' | 'apple' | 'system';

// ============ Transport Mode Preferences ============

/** Modes that can be disabled by user preference */
export type DisableableTransportMode = 'biking' | 'walking' | 'rideshare' | 'ferry';

// ============ Color Scheme Definitions ============

/**
 * A complete custom color scheme containing both:
 * - kindColors: colors for "By Type" mode (stays, activities, food, transport, flights)
 * - paletteColors: colors for "By Stay" mode (each stay gets a unique color)
 */
export interface CustomColorScheme {
	id: string;
	name: string;
	kindColors: {
		stay: string;
		activity: string;
		food: string;
		transport: string;
		flight: string;
	};
	paletteColors: string[]; // Array of oklch color strings for by-stay mode
}

// Legacy type aliases for backwards compatibility
export type CustomColorPalette = CustomColorScheme;
export type CustomKindColors = CustomColorScheme['kindColors'];

// ============ User Settings (Global Defaults) ============

export interface UserSettings {
	// Appearance
	theme: ThemeMode;

	// Units & Localization
	temperatureUnit: TemperatureUnit;
	distanceUnit: DistanceUnit;
	timeFormat: TimeFormat;

	// Map & Navigation
	preferredMapApp: MapApp;

	// Transport preferences
	disabledTransportModes: DisableableTransportMode[];

	// Color customization
	defaultColorMode: 'by-kind' | 'by-stay';
	customColorSchemes: CustomColorScheme[];
	defaultColorSchemeId?: string; // ID of default color scheme

	// Home location (for "home" as travel origin)
	homeCity?: import('./travel').Location;

	// Persistence
	autoSaveEnabled: boolean;
	autoSaveIntervalMs: number;
}

// ============ Trip Settings (Per-Trip Overrides) ============

/**
 * Wrapper type that tracks whether a setting is explicitly overridden.
 * When `isOverridden` is true, the value is trip-specific.
 * When absent/undefined, inherit from user settings.
 */
export interface OverriddenSetting<T> {
	value: T;
	isOverridden: true;
}

/**
 * A setting that may or may not be overridden at the trip level.
 * - undefined: Inherit from user settings
 * - OverriddenSetting<T>: Use this explicit value
 */
export type MaybeOverridden<T> = OverriddenSetting<T> | undefined;

/**
 * Trip-specific settings that can override user defaults.
 * All fields are optional - missing means "inherit from user settings".
 */
export interface TripSettings {
	// Units (trip-specific makes sense for international travel)
	temperatureUnit?: MaybeOverridden<TemperatureUnit>;
	distanceUnit?: MaybeOverridden<DistanceUnit>;
	timeFormat?: MaybeOverridden<TimeFormat>;

	// Transport for this trip
	disabledTransportModes?: MaybeOverridden<DisableableTransportMode[]>;

	// Trip-specific color scheme override tracking
	// The actual mode/scheme values are stored on Trip.colorScheme
	// These flags track whether those values are explicit overrides
	colorModeOverridden?: boolean;
	colorSchemeOverridden?: boolean;
}

// ============ Resolved Settings (Computed at Runtime) ============

/**
 * Fully resolved settings with all inheritance applied.
 * Used by components that need the actual values to use.
 */
export interface ResolvedSettings {
	theme: ThemeMode;
	temperatureUnit: TemperatureUnit;
	distanceUnit: DistanceUnit;
	timeFormat: TimeFormat;
	preferredMapApp: MapApp;
	disabledTransportModes: DisableableTransportMode[];
	colorMode: 'by-kind' | 'by-stay';
	colorScheme: CustomColorScheme | null;
	homeCity: import('./travel').Location | null;
}

/**
 * Settings resolution context for trip-specific resolution.
 * Includes metadata about which settings are overridden.
 */
export interface ResolvedTripSettings extends ResolvedSettings {
	overrides: {
		temperatureUnit: boolean;
		distanceUnit: boolean;
		timeFormat: boolean;
		disabledTransportModes: boolean;
		colorMode: boolean;
		colorScheme: boolean;
	};
}

// ============ Default Values ============

export const DEFAULT_USER_SETTINGS: UserSettings = {
	theme: 'system',
	temperatureUnit: 'trip-location',
	distanceUnit: 'trip-location',
	timeFormat: '12h',
	preferredMapApp: 'system',
	disabledTransportModes: [],
	defaultColorMode: 'by-kind',
	customColorSchemes: [],
	autoSaveEnabled: true,
	autoSaveIntervalMs: 1000
};

// ============ Helper Type Guards ============

export function isOverridden<T>(setting: MaybeOverridden<T>): setting is OverriddenSetting<T> {
	return setting !== undefined && setting.isOverridden === true;
}

// ============ Helper Functions ============

export function createOverride<T>(value: T): OverriddenSetting<T> {
	return { value, isOverridden: true };
}

export function getSettingValue<T>(tripSetting: MaybeOverridden<T>, userDefault: T): T {
	if (isOverridden(tripSetting)) {
		return tripSetting.value;
	}
	return userDefault;
}

/** Countries that use Fahrenheit for temperature */
const FAHRENHEIT_COUNTRIES = [
	'united states',
	'usa',
	'liberia',
	'myanmar',
	'burma',
	'cayman islands',
	'bahamas',
	'belize',
	'palau'
];

/** Countries that use miles for distance (UK uses Celsius but miles) */
const MILES_COUNTRIES = [
	'united states',
	'usa',
	'united kingdom',
	'liberia',
	'myanmar',
	'burma'
];

/** Check if country matches any in the list using word boundary matching */
function matchesCountry(normalized: string, countries: string[]): boolean {
	return countries.some(c => {
		// Exact match
		if (normalized === c) return true;
		// Word boundary match (e.g., "united states of america" contains "united states")
		const pattern = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
		return pattern.test(normalized);
	});
}

/**
 * Resolve 'trip-location' unit to actual unit based on destination country.
 */
export function resolveLocationBasedTemperature(
	country: string | undefined
): 'celsius' | 'fahrenheit' {
	if (!country) return 'celsius';
	const normalized = country.toLowerCase().trim();
	return matchesCountry(normalized, FAHRENHEIT_COUNTRIES) ? 'fahrenheit' : 'celsius';
}

export function resolveLocationBasedDistance(
	country: string | undefined
): 'km' | 'miles' {
	if (!country) return 'km';
	const normalized = country.toLowerCase().trim();
	return matchesCountry(normalized, MILES_COUNTRIES) ? 'miles' : 'km';
}
