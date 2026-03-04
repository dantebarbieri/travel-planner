import type { Location, TravelMode } from '$lib/types/travel';
import { getMapsUrl, getDirectionsUrl } from '$lib/services/mapService';

/**
 * Get a map URL for a location using the preferred map app.
 */
export function getMapUrl(
	mapApp: 'google' | 'apple',
	location: Location
): string {
	return getMapsUrl(location, mapApp);
}

/**
 * Open a location in the user's preferred maps application.
 */
export function openInMaps(location: Location, mapApp: 'google' | 'apple'): void {
	window.open(getMapUrl(mapApp, location), '_blank');
}

/**
 * Open directions between two locations in the user's preferred maps application.
 */
export function openDirections(
	origin: Location,
	destination: Location,
	mode: TravelMode,
	mapApp: 'google' | 'apple'
): void {
	window.open(getDirectionsUrl(origin, destination, mode, mapApp), '_blank');
}
