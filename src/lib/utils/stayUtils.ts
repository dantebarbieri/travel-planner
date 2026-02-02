/**
 * Utilities for computing stay-related display information.
 * Handles badge computation for check-in/check-out based on item position.
 */

import type { Trip, StayDailyItem } from '$lib/types/travel';
import { isStayItem } from '$lib/types/travel';

export interface StayBadgeState {
	isCheckIn: boolean;
	isCheckOut: boolean;
}

/**
 * Computes the check-in/check-out badge state for all stay items in a trip.
 * 
 * Rules:
 * - For each unique stay, only the FIRST occurrence across all days gets the check-in badge
 * - For each unique stay, only the LAST occurrence across all days gets the check-out badge
 * - A single item can have both badges if it's the only occurrence of that stay
 * 
 * Ordering is determined by:
 * 1. Day index (earlier days first)
 * 2. Sort order within the day (lower sortOrder first)
 * 
 * @param trip The trip to compute badges for
 * @returns A map from item ID to badge state
 */
export function computeStayBadges(trip: Trip): Map<string, StayBadgeState> {
	const result = new Map<string, StayBadgeState>();
	
	// Group all stay items by their stayId
	const stayItemsByStayId = new Map<string, Array<{ item: StayDailyItem; dayIndex: number }>>();
	
	trip.itinerary.forEach((day, dayIndex) => {
		day.items.forEach((item) => {
			if (isStayItem(item)) {
				const existing = stayItemsByStayId.get(item.stayId) || [];
				existing.push({ item, dayIndex });
				stayItemsByStayId.set(item.stayId, existing);
			}
		});
	});
	
	// For each stay, determine which items are first/last
	stayItemsByStayId.forEach((occurrences) => {
		if (occurrences.length === 0) return;
		
		// Sort by day index, then by sortOrder
		occurrences.sort((a, b) => {
			if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
			return a.item.sortOrder - b.item.sortOrder;
		});
		
		const firstItem = occurrences[0].item;
		const lastItem = occurrences[occurrences.length - 1].item;
		
		// Set badge state for all items of this stay
		occurrences.forEach(({ item }) => {
			result.set(item.id, {
				isCheckIn: item.id === firstItem.id,
				isCheckOut: item.id === lastItem.id
			});
		});
	});
	
	return result;
}

/**
 * Gets the badge state for a specific item, with fallback to stored flags.
 * 
 * @param badgeMap The computed badge map
 * @param itemId The item ID to look up
 * @param storedCheckIn The stored isCheckIn flag (fallback)
 * @param storedCheckOut The stored isCheckOut flag (fallback)
 */
export function getStayBadgeState(
	badgeMap: Map<string, StayBadgeState> | undefined,
	itemId: string,
	storedCheckIn?: boolean,
	storedCheckOut?: boolean
): StayBadgeState {
	if (badgeMap) {
		const computed = badgeMap.get(itemId);
		if (computed) return computed;
	}
	
	// Fallback to stored values
	return {
		isCheckIn: storedCheckIn || false,
		isCheckOut: storedCheckOut || false
	};
}
