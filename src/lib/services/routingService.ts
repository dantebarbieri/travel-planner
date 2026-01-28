/**
 * Routing service using OSRM (Open Source Routing Machine) servers.
 * 
 * We use the routing.openstreetmap.de servers which have dedicated profiles:
 * - routed-car for driving
 * - routed-foot for walking
 * - routed-bike for cycling
 * 
 * Note: Transit is not supported by OSRM, so we fall back to estimates.
 * 
 * These are public servers with usage limits - for production use, consider
 * hosting your own OSRM instance or using a paid service.
 */

import type { Location, TravelMode, TravelEstimate } from '$lib/types/travel';

// OSRM servers with dedicated profiles at routing.openstreetmap.de
const OSRM_SERVERS: Record<TravelMode, string | null> = {
	driving: 'https://routing.openstreetmap.de/routed-car',
	walking: 'https://routing.openstreetmap.de/routed-foot',
	bicycling: 'https://routing.openstreetmap.de/routed-bike',
	transit: null // OSRM doesn't support transit
};

// Cache for route results to avoid repeated API calls
// Key format: `${fromLat},${fromLng}-${toLat},${toLng}-${mode}`
const routeCache = new Map<string, TravelEstimate>();

// Pending requests to avoid duplicate concurrent requests
const pendingRequests = new Map<string, Promise<TravelEstimate>>();

interface OSRMResponse {
	code: string;
	routes?: Array<{
		distance: number; // meters
		duration: number; // seconds
		legs: Array<{
			distance: number;
			duration: number;
		}>;
	}>;
	message?: string;
}

/**
 * Generate a cache key for a route request
 */
function getCacheKey(from: Location, to: Location, mode: TravelMode): string {
	// Round coordinates to 5 decimal places (~1m precision) for cache efficiency
	const fromLat = from.geo.latitude.toFixed(5);
	const fromLng = from.geo.longitude.toFixed(5);
	const toLat = to.geo.latitude.toFixed(5);
	const toLng = to.geo.longitude.toFixed(5);
	return `${fromLat},${fromLng}-${toLat},${toLng}-${mode}`;
}

/**
 * Calculate estimated travel time based on straight-line distance and mode.
 * Used as fallback when API is unavailable or for unsupported modes (transit).
 */
function calculateEstimate(from: Location, to: Location, mode: TravelMode): TravelEstimate {
	// Haversine formula for straight-line distance
	const R = 6371; // Earth's radius in km
	const dLat = ((to.geo.latitude - from.geo.latitude) * Math.PI) / 180;
	const dLon = ((to.geo.longitude - from.geo.longitude) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((from.geo.latitude * Math.PI) / 180) *
			Math.cos((to.geo.latitude * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const straightLineDistance = R * c;

	// Apply a "road factor" to account for non-straight routes
	// Typically roads are 20-40% longer than straight-line distance
	const roadFactor = 1.3;
	const distance = straightLineDistance * roadFactor;

	// Average speeds in km/h for each mode
	const speeds: Record<TravelMode, number> = {
		driving: 35,
		walking: 5,
		transit: 25,
		bicycling: 15
	};

	const duration = Math.round((distance / speeds[mode]) * 60); // Convert to minutes

	return {
		mode,
		duration,
		distance,
		isEstimate: true
	};
}

/**
 * Fetch route from OSRM API
 */
async function fetchOSRMRoute(
	from: Location,
	to: Location,
	mode: TravelMode
): Promise<TravelEstimate> {
	const serverUrl = OSRM_SERVERS[mode];
	
	// If mode not supported by OSRM, return estimate
	if (!serverUrl) {
		return calculateEstimate(from, to, mode);
	}

	const coordinates = `${from.geo.longitude},${from.geo.latitude};${to.geo.longitude},${to.geo.latitude}`;
	const url = `${serverUrl}/route/v1/driving/${coordinates}?overview=false`;

	const response = await fetch(url, {
		headers: {
			'Accept': 'application/json'
		}
	});

	// Check for server error
	if (response.status === 400 || response.status === 404) {
		console.warn(`OSRM server error for ${mode}, falling back to estimate`);
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
		duration: Math.round(route.duration / 60), // Convert seconds to minutes
		distance: route.distance / 1000, // Convert meters to km
		isEstimate: false
	};
}

/**
 * Get route information between two locations.
 * Returns cached result if available, otherwise fetches from OSRM.
 * Falls back to estimate if API fails.
 */
export async function getRoute(
	from: Location,
	to: Location,
	mode: TravelMode
): Promise<TravelEstimate> {
	const cacheKey = getCacheKey(from, to, mode);

	// Return cached result if available
	const cached = routeCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Check if there's already a pending request for this route
	const pending = pendingRequests.get(cacheKey);
	if (pending) {
		return pending;
	}

	// Create new request
	const request = (async () => {
		try {
			const result = await fetchOSRMRoute(from, to, mode);
			routeCache.set(cacheKey, result);
			return result;
		} catch (error) {
			console.warn(`Route fetch failed for ${mode}, using estimate:`, error);
			// Fall back to estimate on error
			const estimate = calculateEstimate(from, to, mode);
			routeCache.set(cacheKey, estimate);
			return estimate;
		} finally {
			pendingRequests.delete(cacheKey);
		}
	})();

	pendingRequests.set(cacheKey, request);
	return request;
}

/**
 * Get routes for all travel modes between two locations.
 * Fetches all modes in parallel.
 */
export async function getAllRoutes(
	from: Location,
	to: Location
): Promise<TravelEstimate[]> {
	const modes: TravelMode[] = ['driving', 'walking', 'bicycling', 'transit'];
	const results = await Promise.all(modes.map((mode) => getRoute(from, to, mode)));
	return results;
}

/**
 * Get an immediate estimate (synchronous) for display while loading.
 */
export function getEstimate(from: Location, to: Location, mode: TravelMode): TravelEstimate {
	const cacheKey = getCacheKey(from, to, mode);
	
	// Return cached result if available
	const cached = routeCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Return calculated estimate
	return calculateEstimate(from, to, mode);
}

/**
 * Clear the route cache. Useful for testing or when data might be stale.
 */
export function clearRouteCache(): void {
	routeCache.clear();
}

/**
 * Preload routes for a list of location pairs.
 * Useful for preloading all routes in an itinerary.
 */
export async function preloadRoutes(
	locationPairs: Array<{ from: Location; to: Location }>,
	mode: TravelMode = 'driving'
): Promise<void> {
	await Promise.all(locationPairs.map(({ from, to }) => getRoute(from, to, mode)));
}
