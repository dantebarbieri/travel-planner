import type { Location, GeoLocation } from '$lib/types/travel';

export function calculateHaversineDistance(from: GeoLocation, to: GeoLocation): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRadians(to.latitude - from.latitude);
	const dLon = toRadians(to.longitude - from.longitude);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(from.latitude)) *
			Math.cos(toRadians(to.latitude)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

export function getDistanceBetweenLocations(from: Location, to: Location): number {
	return calculateHaversineDistance(from.geo, to.geo);
}

export function formatDistanceForDisplay(km: number, unit: 'km' | 'miles' = 'km'): string {
	if (unit === 'miles') {
		const miles = km * 0.621371;
		if (miles < 0.1) {
			return `${Math.round(miles * 5280)} ft`;
		}
		return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
	}
	if (km < 1) {
		return `${Math.round(km * 1000)} m`;
	}
	return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function estimateTravelDuration(
	distanceKm: number,
	mode: 'driving' | 'walking' | 'transit' | 'bicycling'
): number {
	const speeds: Record<typeof mode, number> = {
		driving: 35, // km/h in urban areas
		walking: 5,
		transit: 25,
		bicycling: 15
	};
	return Math.round((distanceKm / speeds[mode]) * 60);
}

export function getBoundingBox(
	locations: Location[],
	paddingPercent: number = 0.1
): { north: number; south: number; east: number; west: number } {
	if (locations.length === 0) {
		return { north: 0, south: 0, east: 0, west: 0 };
	}

	let north = -90;
	let south = 90;
	let east = -180;
	let west = 180;

	for (const loc of locations) {
		north = Math.max(north, loc.geo.latitude);
		south = Math.min(south, loc.geo.latitude);
		east = Math.max(east, loc.geo.longitude);
		west = Math.min(west, loc.geo.longitude);
	}

	const latPadding = (north - south) * paddingPercent;
	const lngPadding = (east - west) * paddingPercent;

	return {
		north: north + latPadding,
		south: south - latPadding,
		east: east + lngPadding,
		west: west - lngPadding
	};
}

export function getCenter(locations: Location[]): GeoLocation {
	if (locations.length === 0) {
		return { latitude: 0, longitude: 0 };
	}

	const sumLat = locations.reduce((sum, loc) => sum + loc.geo.latitude, 0);
	const sumLng = locations.reduce((sum, loc) => sum + loc.geo.longitude, 0);

	return {
		latitude: sumLat / locations.length,
		longitude: sumLng / locations.length
	};
}

export function isWithinRadius(center: GeoLocation, point: GeoLocation, radiusKm: number): boolean {
	const distance = calculateHaversineDistance(center, point);
	return distance <= radiusKm;
}

export function sortByDistanceFrom(
	locations: Location[],
	from: GeoLocation
): Location[] {
	return [...locations].sort((a, b) => {
		const distA = calculateHaversineDistance(from, a.geo);
		const distB = calculateHaversineDistance(from, b.geo);
		return distA - distB;
	});
}
