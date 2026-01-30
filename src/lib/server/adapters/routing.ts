/**
 * Server-side routing adapter using OSRM (Open Source Routing Machine).
 * Uses routing.openstreetmap.de public servers.
 * 
 * This is a server-only module ($lib/server/).
 */

import type { Location } from '$lib/types/travel';
import { cache, routingCacheKey } from '$lib/server/db/cache';

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface TravelEstimate {
	mode: TravelMode;
	duration: number; // minutes
	distance: number; // km
	isEstimate: boolean;
}

// OSRM servers with dedicated profiles
const OSRM_SERVERS: Record<TravelMode, string | null> = {
	driving: 'https://routing.openstreetmap.de/routed-car',
	walking: 'https://routing.openstreetmap.de/routed-foot',
	bicycling: 'https://routing.openstreetmap.de/routed-bike',
	transit: null // OSRM doesn't support transit
};

const OSRM_PROFILES: Record<TravelMode, string> = {
	driving: 'car',
	walking: 'foot',
	bicycling: 'bike',
	transit: ''
};

// Average speeds for fallback estimates (km/h)
const AVG_SPEEDS: Record<TravelMode, number> = {
	driving: 35,
	walking: 5,
	bicycling: 15,
	transit: 25
};

interface OSRMResponse {
	code: string;
	routes?: Array<{
		distance: number; // meters
		duration: number; // seconds
	}>;
	message?: string;
}

/**
 * Calculate straight-line distance using Haversine formula.
 */
function haversineDistance(from: Location, to: Location): number {
	const R = 6371; // Earth's radius in km
	const dLat = ((to.geo.latitude - from.geo.latitude) * Math.PI) / 180;
	const dLon = ((to.geo.longitude - from.geo.longitude) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((from.geo.latitude * Math.PI) / 180) *
		Math.cos((to.geo.latitude * Math.PI) / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Calculate estimated travel time based on straight-line distance.
 * Used as fallback when API is unavailable or for transit.
 */
function calculateEstimate(from: Location, to: Location, mode: TravelMode): TravelEstimate {
	const straightLineDistance = haversineDistance(from, to);
	// Apply road factor (roads are typically 20-40% longer than straight-line)
	const roadFactor = 1.3;
	const distance = straightLineDistance * roadFactor;
	const duration = Math.round((distance / AVG_SPEEDS[mode]) * 60);

	return {
		mode,
		duration,
		distance,
		isEstimate: true
	};
}

/**
 * Fetch route from OSRM API.
 */
async function fetchOSRMRoute(from: Location, to: Location, mode: TravelMode): Promise<TravelEstimate> {
	const serverUrl = OSRM_SERVERS[mode];

	// If mode not supported by OSRM, return estimate
	if (!serverUrl) {
		return calculateEstimate(from, to, mode);
	}

	const coordinates = `${from.geo.longitude},${from.geo.latitude};${to.geo.longitude},${to.geo.latitude}`;
	const profile = OSRM_PROFILES[mode];
	const url = `${serverUrl}/route/v1/${profile}/${coordinates}?overview=false`;

	const response = await fetch(url, {
		headers: { 'Accept': 'application/json' }
	});

	if (response.status === 400 || response.status === 404) {
		// Route not found, fall back to estimate
		return calculateEstimate(from, to, mode);
	}

	if (!response.ok) {
		throw new Error(`OSRM API error: ${response.status}`);
	}

	const data: OSRMResponse = await response.json();

	if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
		throw new Error(data.message || 'No route found');
	}

	const route = data.routes[0];

	return {
		mode,
		duration: Math.round(route.duration / 60), // seconds to minutes
		distance: route.distance / 1000, // meters to km
		isEstimate: false
	};
}

/**
 * Get route between two locations for a specific mode.
 * Uses cache to avoid repeated API calls.
 */
export async function getRoute(from: Location, to: Location, mode: TravelMode): Promise<TravelEstimate> {
	const cacheKey = routingCacheKey(
		from.geo.latitude,
		from.geo.longitude,
		to.geo.latitude,
		to.geo.longitude,
		mode
	);

	// Check cache
	const cached = cache.get<TravelEstimate>(cacheKey);
	if (cached) return cached;

	try {
		const result = await fetchOSRMRoute(from, to, mode);
		cache.set(cacheKey, result, 'ROUTING');
		return result;
	} catch (error) {
		console.warn(`Route fetch failed for ${mode}, using estimate:`, error);
		const estimate = calculateEstimate(from, to, mode);
		cache.set(cacheKey, estimate, 'ROUTING');
		return estimate;
	}
}

/**
 * Get routes for all travel modes between two locations.
 */
export async function getAllRoutes(from: Location, to: Location): Promise<TravelEstimate[]> {
	const modes: TravelMode[] = ['driving', 'walking', 'bicycling', 'transit'];
	const results = await Promise.all(modes.map(mode => getRoute(from, to, mode)));
	return results;
}

/**
 * Get an immediate estimate (synchronous, from cache or calculation).
 * Useful for UI that needs instant response.
 */
export function getEstimate(from: Location, to: Location, mode: TravelMode): TravelEstimate {
	const cacheKey = routingCacheKey(
		from.geo.latitude,
		from.geo.longitude,
		to.geo.latitude,
		to.geo.longitude,
		mode
	);

	// Return cached if available
	const cached = cache.get<TravelEstimate>(cacheKey);
	if (cached) return cached;

	// Calculate estimate
	return calculateEstimate(from, to, mode);
}

export const routingAdapter = {
	getRoute,
	getAllRoutes,
	getEstimate
};
