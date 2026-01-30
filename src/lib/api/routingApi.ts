/**
 * Client-side routing API service.
 * Calls the server's /api/routing endpoint with client-side caching.
 */

import type { Location } from '$lib/types/travel';
import { clientCache } from './clientCache';

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface TravelEstimate {
	mode: TravelMode;
	duration: number; // minutes
	distance: number; // km
	isEstimate: boolean;
}

/**
 * Generate a cache key for routing.
 */
function routingCacheKey(
	fromLat: number,
	fromLon: number,
	toLat: number,
	toLon: number,
	mode: TravelMode
): string {
	// Round to 5 decimal places (~1m precision)
	const round = (n: number) => Math.round(n * 100000) / 100000;
	return `routing:${mode}:${round(fromLat)},${round(fromLon)}:${round(toLat)},${round(toLon)}`;
}

/**
 * Calculate a quick estimate based on straight-line distance.
 * Used for immediate display while fetching actual route.
 */
export function getQuickEstimate(from: Location, to: Location, mode: TravelMode): TravelEstimate {
	// Haversine formula for straight-line distance
	const R = 6371; // Earth's radius in km
	const dLat = ((to.geo.latitude - from.geo.latitude) * Math.PI) / 180;
	const dLon = ((to.geo.longitude - from.geo.longitude) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((from.geo.latitude * Math.PI) / 180) *
		Math.cos((to.geo.latitude * Math.PI) / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const straightLineDistance = R * c;

	// Apply road factor and estimate time
	const roadFactor = 1.3;
	const distance = straightLineDistance * roadFactor;

	const speeds: Record<TravelMode, number> = {
		driving: 35,
		walking: 5,
		bicycling: 15,
		transit: 25
	};

	const duration = Math.round((distance / speeds[mode]) * 60);

	return {
		mode,
		duration,
		distance,
		isEstimate: true
	};
}

interface RouteResponse {
	route: TravelEstimate;
}

interface AllRoutesResponse {
	routes: TravelEstimate[];
}

/**
 * Get route between two locations for a specific mode.
 */
export async function getRoute(
	from: Location,
	to: Location,
	mode: TravelMode
): Promise<TravelEstimate> {
	const cacheKey = routingCacheKey(
		from.geo.latitude,
		from.geo.longitude,
		to.geo.latitude,
		to.geo.longitude,
		mode
	);

	return clientCache.dedupeRequest(
		cacheKey,
		async () => {
			const params = new URLSearchParams({
				fromLat: from.geo.latitude.toString(),
				fromLon: from.geo.longitude.toString(),
				toLat: to.geo.latitude.toString(),
				toLon: to.geo.longitude.toString(),
				mode
			});

			const response = await fetch(`/api/routing?${params}`);

			if (!response.ok) {
				if (response.status === 429) {
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				// Fall back to estimate on error
				console.warn('Routing API error, using estimate');
				return getQuickEstimate(from, to, mode);
			}

			const data: RouteResponse = await response.json();
			return data.route;
		},
		'ROUTING'
	);
}

/**
 * Get routes for all travel modes between two locations.
 */
export async function getAllRoutes(from: Location, to: Location): Promise<TravelEstimate[]> {
	// Check if we have all modes cached
	const modes: TravelMode[] = ['driving', 'walking', 'bicycling', 'transit'];
	const cached: TravelEstimate[] = [];
	const uncachedModes: TravelMode[] = [];

	for (const mode of modes) {
		const cacheKey = routingCacheKey(
			from.geo.latitude,
			from.geo.longitude,
			to.geo.latitude,
			to.geo.longitude,
			mode
		);
		const entry = clientCache.get<TravelEstimate>(cacheKey);
		if (entry) {
			cached.push(entry);
		} else {
			uncachedModes.push(mode);
		}
	}

	// If all cached, return immediately
	if (uncachedModes.length === 0) {
		return cached;
	}

	// Fetch all routes in a single request
	const params = new URLSearchParams({
		fromLat: from.geo.latitude.toString(),
		fromLon: from.geo.longitude.toString(),
		toLat: to.geo.latitude.toString(),
		toLon: to.geo.longitude.toString(),
		all: 'true'
	});

	try {
		const response = await fetch(`/api/routing?${params}`);

		if (!response.ok) {
			// Fall back to estimates
			return modes.map(mode => getQuickEstimate(from, to, mode));
		}

		const data: AllRoutesResponse = await response.json();

		// Cache each route
		for (const route of data.routes) {
			const cacheKey = routingCacheKey(
				from.geo.latitude,
				from.geo.longitude,
				to.geo.latitude,
				to.geo.longitude,
				route.mode
			);
			clientCache.set(cacheKey, route, 'ROUTING');
		}

		return data.routes;
	} catch (error) {
		console.warn('Failed to fetch routes:', error);
		return modes.map(mode => getQuickEstimate(from, to, mode));
	}
}

/**
 * Clear routing cache.
 */
export function clearRoutingCache(): void {
	clientCache.clear();
}

// Export as a routing API object
export const routingApi = {
	getRoute,
	getAllRoutes,
	getQuickEstimate,
	clearCache: clearRoutingCache
};
