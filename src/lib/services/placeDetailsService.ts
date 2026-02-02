/**
 * Place Details Enrichment Service
 *
 * Coordinates fetching and applying rich place details (hours, pricing, tags)
 * to activities and food venues. Auto-fetches when items are added.
 */

import type { Activity, FoodVenue, OperatingHours, PlaceTag, FoodTag } from '$lib/types/travel';
import { fetchPlaceDetails, type PlaceDetails } from '$lib/api/placeDetailsApi';

// =============================================================================
// Types
// =============================================================================

export interface EnrichmentResult {
	success: boolean;
	source?: 'google' | 'foursquare';
	updatedFields: string[];
	error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract Foursquare ID from our activity/food IDs if present.
 * Our IDs are prefixed with 'fsq-' for Foursquare-sourced items.
 */
function extractFoursquareId(id: string): string | undefined {
	if (id.startsWith('fsq-')) {
		return id;
	}
	return undefined;
}

/**
 * Merge place details into an activity, respecting user overrides.
 */
function mergeActivityDetails(
	activity: Activity,
	details: PlaceDetails
): Partial<Activity> {
	const updates: Partial<Activity> = {
		lastFetched: new Date().toISOString()
	};

	// Only update fields that aren't already set or don't have user overrides
	const overrides = activity.userOverrides || {};

	// Opening hours
	if (details.openingHours && !overrides.openingHours && !activity.openingHours) {
		updates.openingHours = details.openingHours;
	}

	// Price level
	if (details.priceLevel !== undefined && activity.priceLevel === undefined) {
		updates.priceLevel = details.priceLevel;
	}

	// Entry fee (from general price if we don't have it)
	if (activity.entryFee === undefined && activity.price === undefined && details.priceLevel) {
		// Don't set a specific price from price level, but note we have pricing info
	}

	// Rating
	if (details.rating !== undefined && activity.rating === undefined) {
		updates.rating = details.rating;
	}

	// Review count
	if (details.reviewCount !== undefined && activity.reviewCount === undefined) {
		updates.reviewCount = details.reviewCount;
	}

	// Website - prefer official site, add API page as fallback
	if (details.website && !activity.website) {
		updates.website = details.website;
	}
	if (details.googleMapsUrl && !activity.apiPageUrl) {
		updates.apiPageUrl = details.googleMapsUrl;
	}

	// Phone
	if (details.phone && !activity.phone) {
		updates.phone = details.phone;
	}

	// Tags - merge with existing
	if (details.placeTags && details.placeTags.length > 0 && !overrides.tags) {
		const existingTags = activity.tags || [];
		const newTags = details.placeTags.filter(t => !existingTags.includes(t));
		if (newTags.length > 0) {
			updates.tags = [...existingTags, ...newTags];
		}
	}

	return updates;
}

/**
 * Merge place details into a food venue, respecting user overrides.
 */
function mergeFoodVenueDetails(
	venue: FoodVenue,
	details: PlaceDetails
): Partial<FoodVenue> {
	const updates: Partial<FoodVenue> = {
		lastFetched: new Date().toISOString()
	};

	// Only update fields that aren't already set or don't have user overrides
	const overrides = venue.userOverrides || {};

	// Opening hours
	if (details.openingHours && !overrides.openingHours && !venue.openingHours) {
		updates.openingHours = details.openingHours;
	}

	// Price level
	if (details.priceLevel !== undefined && !overrides.priceLevel && venue.priceLevel === undefined) {
		updates.priceLevel = details.priceLevel;
	}

	// Rating
	if (details.rating !== undefined && venue.rating === undefined) {
		updates.rating = details.rating;
	}

	// Review count
	if (details.reviewCount !== undefined && venue.reviewCount === undefined) {
		updates.reviewCount = details.reviewCount;
	}

	// Website - prefer official site, add API page as fallback
	if (details.website && !venue.website) {
		updates.website = details.website;
	}
	if (details.googleMapsUrl && !venue.apiPageUrl) {
		updates.apiPageUrl = details.googleMapsUrl;
	}

	// Phone
	if (details.phone && !venue.phone) {
		updates.phone = details.phone;
	}

	// Tags - merge with existing
	if (details.foodTags && details.foodTags.length > 0 && !overrides.tags) {
		const existingTags = venue.tags || [];
		const newTags = details.foodTags.filter(t => !existingTags.includes(t));
		if (newTags.length > 0) {
			updates.tags = [...existingTags, ...newTags];
		}
	}

	return updates;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Fetch and apply place details to an activity.
 * Returns the updates to apply (caller should merge into store).
 */
export async function enrichActivity(activity: Activity): Promise<{
	updates: Partial<Activity>;
	result: EnrichmentResult;
}> {
	try {
		// Try to get details using available identifiers
		const fsqId = extractFoursquareId(activity.id);
		const details = await fetchPlaceDetails({
			foursquarePlaceId: fsqId,
			name: activity.name,
			lat: activity.location.geo.latitude,
			lon: activity.location.geo.longitude
		});

		if (!details) {
			return {
				updates: { lastFetched: new Date().toISOString() },
				result: {
					success: false,
					updatedFields: [],
					error: 'No details found'
				}
			};
		}

		const updates = mergeActivityDetails(activity, details);
		const updatedFields = Object.keys(updates).filter(k => k !== 'lastFetched');

		return {
			updates,
			result: {
				success: true,
				source: details.source,
				updatedFields
			}
		};
	} catch (error) {
		console.error('[PlaceDetailsService] Failed to enrich activity:', error);
		return {
			updates: { lastFetched: new Date().toISOString() },
			result: {
				success: false,
				updatedFields: [],
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		};
	}
}

/**
 * Fetch and apply place details to a food venue.
 * Returns the updates to apply (caller should merge into store).
 */
export async function enrichFoodVenue(venue: FoodVenue): Promise<{
	updates: Partial<FoodVenue>;
	result: EnrichmentResult;
}> {
	try {
		// Try to get details using available identifiers
		const fsqId = extractFoursquareId(venue.id);
		const details = await fetchPlaceDetails({
			foursquarePlaceId: fsqId,
			name: venue.name,
			lat: venue.location.geo.latitude,
			lon: venue.location.geo.longitude
		});

		if (!details) {
			return {
				updates: { lastFetched: new Date().toISOString() },
				result: {
					success: false,
					updatedFields: [],
					error: 'No details found'
				}
			};
		}

		const updates = mergeFoodVenueDetails(venue, details);
		const updatedFields = Object.keys(updates).filter(k => k !== 'lastFetched');

		return {
			updates,
			result: {
				success: true,
				source: details.source,
				updatedFields
			}
		};
	} catch (error) {
		console.error('[PlaceDetailsService] Failed to enrich food venue:', error);
		return {
			updates: { lastFetched: new Date().toISOString() },
			result: {
				success: false,
				updatedFields: [],
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		};
	}
}

/**
 * Check if an item needs refreshing based on lastFetched timestamp.
 * Items older than the threshold should be re-fetched.
 */
export function needsRefresh(lastFetched?: string, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
	if (!lastFetched) return true;
	const fetchTime = new Date(lastFetched).getTime();
	return Date.now() - fetchTime > maxAgeMs;
}

// =============================================================================
// Export
// =============================================================================

export const placeDetailsService = {
	enrichActivity,
	enrichFoodVenue,
	needsRefresh
};
