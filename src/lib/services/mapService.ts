import type { Location, TravelMode } from '$lib/types/travel';

export function getGoogleMapsDirectionsUrl(
	origin: Location,
	destination: Location,
	mode: TravelMode = 'driving'
): string {
	const originStr = encodeURIComponent(origin.name || `${origin.geo.latitude},${origin.geo.longitude}`);
	const destStr = encodeURIComponent(destination.name || `${destination.geo.latitude},${destination.geo.longitude}`);

	const modeMap: Record<TravelMode, string> = {
		driving: 'driving',
		walking: 'walking',
		transit: 'transit',
		bicycling: 'bicycling'
	};

	return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=${modeMap[mode]}`;
}

export function getAppleMapsUrl(
	origin: Location,
	destination: Location,
	mode: TravelMode = 'driving'
): string {
	const modeMap: Record<TravelMode, string> = {
		driving: 'd',
		walking: 'w',
		transit: 'r',
		bicycling: 'w' // Apple Maps doesn't have cycling, fallback to walking
	};

	const originStr = encodeURIComponent(origin.name || `${origin.geo.latitude},${origin.geo.longitude}`);
	const destStr = encodeURIComponent(destination.name || `${destination.geo.latitude},${destination.geo.longitude}`);

	return `maps://maps.apple.com/?saddr=${originStr}&daddr=${destStr}&dirflg=${modeMap[mode]}`;
}

export function getGoogleMapsPlaceUrl(location: Location): string {
	if (location.placeId) {
		return `https://www.google.com/maps/place/?q=place_id:${location.placeId}`;
	}
	const query = encodeURIComponent(location.name || location.address.formatted);
	return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function getAppleMapsPlaceUrl(location: Location): string {
	const query = encodeURIComponent(location.name || location.address.formatted);
	return `maps://maps.apple.com/?q=${query}&ll=${location.geo.latitude},${location.geo.longitude}`;
}

export function getMapsUrl(
	location: Location,
	preferredApp: 'google' | 'apple' = 'google'
): string {
	return preferredApp === 'apple' ? getAppleMapsPlaceUrl(location) : getGoogleMapsPlaceUrl(location);
}

export function getDirectionsUrl(
	origin: Location,
	destination: Location,
	mode: TravelMode = 'driving',
	preferredApp: 'google' | 'apple' = 'google'
): string {
	return preferredApp === 'apple'
		? getAppleMapsUrl(origin, destination, mode)
		: getGoogleMapsDirectionsUrl(origin, destination, mode);
}

export function detectPreferredMapsApp(): 'google' | 'apple' {
	if (typeof navigator === 'undefined') return 'google';

	const userAgent = navigator.userAgent.toLowerCase();
	const isAppleDevice = /iphone|ipad|ipod|macintosh/.test(userAgent);

	return isAppleDevice ? 'apple' : 'google';
}
