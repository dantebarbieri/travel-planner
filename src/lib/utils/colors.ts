import type { 
	DailyItemKind, 
	KindColors, 
	ColorScheme, 
	StayId, 
	CityId,
	Trip,
	ItineraryDay,
	Stay,
	StaySegment,
	ColorPalette
} from '$lib/types/travel';
import { isStayItem } from '$lib/types/travel';

export const defaultKindColors: KindColors = {
	stay: 'oklch(0.7 0.15 280)',
	activity: 'oklch(0.65 0.2 145)',
	food: 'oklch(0.7 0.18 50)',
	transport: 'oklch(0.6 0.15 230)',
	flight: 'oklch(0.55 0.2 260)'
};

export const defaultStayColorPalette: ColorPalette = {
	id: 'default',
	name: 'Default',
	colors: [
		'oklch(0.7 0.15 280)', // Purple
		'oklch(0.7 0.18 180)', // Teal
		'oklch(0.7 0.15 340)', // Pink
		'oklch(0.7 0.18 100)', // Lime
		'oklch(0.65 0.2 30)', // Orange-red
		'oklch(0.7 0.15 220)', // Sky blue
		'oklch(0.65 0.18 310)', // Magenta
		'oklch(0.7 0.15 70)' // Gold
	]
};

// Keep backward compat
export const stayColorPalette = defaultStayColorPalette.colors;

export function getDefaultColorScheme(): ColorScheme {
	return {
		mode: 'by-kind',
		kindColors: { ...defaultKindColors }
	};
}

export function getColorForKind(kind: DailyItemKind, colorScheme: ColorScheme): string {
	if (kind === 'transport') {
		return colorScheme.kindColors.transport;
	}
	return colorScheme.kindColors[kind] || colorScheme.kindColors.activity;
}

export function getColorForStay(stayId: StayId, colorScheme: ColorScheme): string {
	if (colorScheme.mode === 'by-stay' && colorScheme.stayColors?.[stayId]) {
		return colorScheme.stayColors[stayId];
	}
	return colorScheme.kindColors.stay;
}

export function assignStayColors(stayIds: StayId[]): Record<StayId, string> {
	const colors: Record<StayId, string> = {};
	stayIds.forEach((id, index) => {
		colors[id] = stayColorPalette[index % stayColorPalette.length];
	});
	return colors;
}

/**
 * Generate an inferred stay ID for a city (used when city has no actual stays)
 */
export function getInferredStayId(cityId: CityId): string {
	return `inferred:${cityId}`;
}

/**
 * Assign colors to both actual stays and inferred stays for cities without stays
 */
export function assignStayColorsWithInferred(
	stayIds: StayId[],
	cityIdsWithoutStays: CityId[]
): Record<string, string> {
	const colors: Record<string, string> = {};
	let colorIndex = 0;

	// First assign to actual stays
	stayIds.forEach((id) => {
		colors[id] = stayColorPalette[colorIndex % stayColorPalette.length];
		colorIndex++;
	});

	// Then assign to inferred stays (cities without stays)
	cityIdsWithoutStays.forEach((cityId) => {
		const inferredId = getInferredStayId(cityId);
		colors[inferredId] = stayColorPalette[colorIndex % stayColorPalette.length];
		colorIndex++;
	});

	return colors;
}

export function getItemColor(
	kind: DailyItemKind,
	stayId: StayId | undefined,
	colorScheme: ColorScheme,
	cityId?: CityId,
	/** The segment ID for this item's day (preferred for by-stay mode) */
	segmentId?: string
): string {
	if (colorScheme.mode === 'by-stay') {
		// First priority: segment ID (computed from stay segments)
		if (segmentId && colorScheme.stayColors?.[segmentId]) {
			return colorScheme.stayColors[segmentId];
		}
		// Second priority: actual stay color
		if (stayId && colorScheme.stayColors?.[stayId]) {
			return colorScheme.stayColors[stayId];
		}
		// Fall back to inferred stay color based on city (legacy format)
		if (cityId) {
			const inferredId = getInferredStayId(cityId);
			if (colorScheme.stayColors?.[inferredId]) {
				return colorScheme.stayColors[inferredId];
			}
			// Try newer format
			const newInferredId = getInferredStayIdForCity(cityId);
			if (colorScheme.stayColors?.[newInferredId]) {
				return colorScheme.stayColors[newInferredId];
			}
		}
	}
	return getColorForKind(kind, colorScheme);
}

export function lightenColor(oklchColor: string, amount: number = 0.1): string {
	const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
	if (!match) return oklchColor;
	const [, l, c, h] = match;
	const newL = Math.min(1, parseFloat(l) + amount);
	return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

export function darkenColor(oklchColor: string, amount: number = 0.1): string {
	const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
	if (!match) return oklchColor;
	const [, l, c, h] = match;
	const newL = Math.max(0, parseFloat(l) - amount);
	return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

export function getContrastColor(oklchColor: string): string {
	const match = oklchColor.match(/oklch\(([\d.]+)/);
	if (!match) return 'oklch(0 0 0)';
	const lightness = parseFloat(match[1]);
	return lightness > 0.6 ? 'oklch(0.2 0 0)' : 'oklch(0.98 0 0)';
}

/**
 * Reduce the chroma (saturation) of an oklch color
 */
export function desaturateColor(oklchColor: string, amount: number = 0.5): string {
	const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
	if (!match) return oklchColor;
	const [, l, c, h] = match;
	const newC = Math.max(0, parseFloat(c) * (1 - amount));
	return `oklch(${l} ${newC.toFixed(3)} ${h})`;
}

/**
 * Generate an inferred stay ID for a city without lodging
 */
export function getInferredStayIdForCity(cityId: CityId): string {
	return `inferred:city:${cityId}`;
}

/**
 * Generate an inferred stay ID for an unknown situation (no city, no stay)
 */
export function getInferredStayIdForUnknown(groupIndex: number): string {
	return `inferred:unknown:${groupIndex}`;
}

/**
 * Get the stay that covers a specific date for a city
 */
function getStayForDate(stays: Stay[], date: string): Stay | undefined {
	return stays.find(stay => date >= stay.checkIn && date < stay.checkOut);
}

/**
 * Compute stay segments for a trip. A segment is a contiguous run of days
 * that share the same lodging (real or inferred).
 * 
 * Rules:
 * - Days with actual stays use the stay's ID
 * - Days with a city but no stay use an inferred city-based ID
 * - Days with no city use an inferred unknown ID (grouped contiguously)
 */
export function computeStaySegments(trip: Trip): StaySegment[] {
	const segments: StaySegment[] = [];
	const palette = trip.colorScheme.palette?.colors ?? defaultStayColorPalette.colors;
	
	let currentSegment: Partial<StaySegment> | null = null;
	let colorIndex = 0;
	const usedColors: Record<string, string> = {};
	
	function getColorForKey(key: string): string {
		if (!usedColors[key]) {
			usedColors[key] = palette[colorIndex % palette.length];
			colorIndex++;
		}
		return usedColors[key];
	}
	
	for (let dayIndex = 0; dayIndex < trip.itinerary.length; dayIndex++) {
		const day = trip.itinerary[dayIndex];
		const cityIds = day.cityIds;
		
		// Determine what "stay" this day belongs to
		let segmentKey: string;
		let isInferred = true;
		let stayId: StayId | undefined;
		let cityId: CityId | undefined;
		
		if (cityIds.length > 0) {
			// Has at least one city - check for actual stay
			const primaryCityId = cityIds[0];
			cityId = primaryCityId;
			const city = trip.cities.find(c => c.id === primaryCityId);
			
			if (city) {
				const stay = getStayForDate(city.stays, day.date);
				if (stay) {
					// Real stay
					segmentKey = stay.id;
					isInferred = false;
					stayId = stay.id;
				} else {
					// City but no stay covering this date
					segmentKey = getInferredStayIdForCity(primaryCityId);
				}
			} else {
				segmentKey = getInferredStayIdForCity(primaryCityId);
			}
		} else {
			// No city - unknown
			segmentKey = getInferredStayIdForUnknown(dayIndex);
		}
		
		// Check if we need to start a new segment
		if (!currentSegment || currentSegment.id !== segmentKey) {
			// Close previous segment
			if (currentSegment && currentSegment.id) {
				segments.push(currentSegment as StaySegment);
			}
			
			// Start new segment
			currentSegment = {
				id: segmentKey,
				color: getColorForKey(segmentKey),
				startDayIndex: dayIndex,
				endDayIndex: dayIndex,
				isInferred,
				cityId,
				stayId
			};
		} else {
			// Extend current segment
			currentSegment.endDayIndex = dayIndex;
		}
	}
	
	// Close final segment
	if (currentSegment && currentSegment.id) {
		segments.push(currentSegment as StaySegment);
	}
	
	return segments;
}

/**
 * Get the stay segment for a specific day index
 */
export function getSegmentForDay(segments: StaySegment[], dayIndex: number): StaySegment | undefined {
	return segments.find(s => dayIndex >= s.startDayIndex && dayIndex <= s.endDayIndex);
}

/**
 * Build the stayColors map from computed segments
 */
export function buildStayColorsFromSegments(segments: StaySegment[]): Record<string, string> {
	const colors: Record<string, string> = {};
	for (const segment of segments) {
		colors[segment.id] = segment.color;
	}
	return colors;
}

/**
 * Check if a day has "missing lodging" - meaning it has a city but no booked stay.
 * 
 * Exception: The last day of the trip does not require lodging if there's a flight home.
 * This allows for checkout-only days where the traveler is flying back.
 */
export function dayHasMissingLodging(trip: Trip, day: ItineraryDay): boolean {
	if (day.cityIds.length === 0) {
		// No city assigned - not a warning (user hasn't planned this day yet)
		return false;
	}
	
	// Check if any city covering this day has a stay for this date
	for (const cityId of day.cityIds) {
		const city = trip.cities.find(c => c.id === cityId);
		if (city) {
			const hasStay = city.stays.some(stay => 
				day.date >= stay.checkIn && day.date < stay.checkOut
			);
			if (hasStay) {
				return false; // Found lodging
			}
		}
	}
	
	// Check if this is the last day of the trip
	const isLastDay = day.date === trip.endDate;
	
	if (isLastDay) {
		// On the last day, no lodging warning if there's a flight home
		const hasFlightHome = day.items.some(item => {
			if (item.kind !== 'transport') return false;
			const transportLeg = trip.transportLegs.find(t => t.id === item.transportLegId);
			return transportLeg?.mode === 'flight';
		});
		
		if (hasFlightHome) {
			return false; // Last day with flight home - no warning needed
		}
	}
	
	// City assigned but no lodging (and no flight home exception)
	return true;
}

/**
 * Get the color to use for a day's background in by-stay mode.
 * Returns undefined if the day should not have a colored background
 * (e.g., mixed stays, or by-kind mode).
 */
export function getDayBackgroundColor(
	colorScheme: ColorScheme,
	segments: StaySegment[],
	dayIndex: number
): string | undefined {
	if (colorScheme.mode !== 'by-stay') {
		return undefined;
	}
	
	const segment = getSegmentForDay(segments, dayIndex);
	if (!segment) {
		return undefined;
	}
	
	// Return a desaturated version for the day background
	return desaturateColor(segment.color, 0.7);
}
