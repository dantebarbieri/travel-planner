/**
 * Transport Estimate Adapter
 *
 * Provides Haversine-based travel time estimates when the real OSRM
 * routing API is unavailable. All estimates are marked with isEstimate: true
 * and displayed with a "~" indicator in the UI.
 */

import type { TransportAdapter, TravelEstimate, TravelMode, Location } from '$lib/types/travel';

function calculateHaversineDistance(from: Location, to: Location): number {
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
	return R * c;
}

function estimateDuration(distance: number, mode: TravelMode): number {
	// Returns duration in minutes
	const speeds: Record<TravelMode, number> = {
		driving: 35, // km/h average in city with traffic
		walking: 5,
		transit: 20,
		bicycling: 15
	};
	return Math.round((distance / speeds[mode]) * 60);
}

function estimateRidesharePrice(distance: number): { min: number; max: number } {
	const basePrice = 3.5;
	const perKm = 1.8;
	const price = basePrice + distance * perKm;
	return {
		min: Math.round(price * 0.85 * 100) / 100,
		max: Math.round(price * 1.4 * 100) / 100
	};
}

/**
 * Transport adapter that provides Haversine-based estimates.
 * All estimates are marked with isEstimate: true.
 */
export const estimateTransportAdapter: TransportAdapter = {
	async getEstimate(
		origin: Location,
		destination: Location,
		mode: TravelMode
	): Promise<TravelEstimate> {
		const distance = calculateHaversineDistance(origin, destination);
		const duration = estimateDuration(distance, mode);

		const estimate: TravelEstimate = {
			mode,
			duration,
			distance: Math.round(distance * 10) / 10,
			isEstimate: true // Mark as estimate
		};

		// Add cost estimate for driving (taxi/rideshare)
		if (mode === 'driving') {
			const rideshare = estimateRidesharePrice(distance);
			estimate.estimatedCost = rideshare.min;
			estimate.currency = 'USD';
		}

		// Transit has a flat fare estimate
		if (mode === 'transit') {
			estimate.estimatedCost = 2.5 + Math.floor(distance / 5) * 0.5;
			estimate.currency = 'USD';
		}

		return estimate;
	},

	async getAllModeEstimates(origin: Location, destination: Location): Promise<TravelEstimate[]> {
		const modes: TravelMode[] = ['driving', 'walking', 'transit', 'bicycling'];
		const distance = calculateHaversineDistance(origin, destination);

		return modes.map((mode) => {
			const duration = estimateDuration(distance, mode);
			const estimate: TravelEstimate = {
				mode,
				duration,
				distance: Math.round(distance * 10) / 10,
				isEstimate: true // Mark as estimate
			};

			if (mode === 'driving') {
				const rideshare = estimateRidesharePrice(distance);
				estimate.estimatedCost = rideshare.min;
				estimate.currency = 'USD';
			}

			if (mode === 'transit') {
				estimate.estimatedCost = 2.5 + Math.floor(distance / 5) * 0.5;
				estimate.currency = 'USD';
			}

			return estimate;
		});
	},

	async getRidesharePrice(
		origin: Location,
		destination: Location
	): Promise<{ min: number; max: number; currency: string }> {
		const distance = calculateHaversineDistance(origin, destination);
		return {
			...estimateRidesharePrice(distance),
			currency: 'USD'
		};
	}
};

// Keep the old export name for backward compatibility
export const fakeTransportAdapter = estimateTransportAdapter;
