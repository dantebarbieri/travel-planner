export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateTripId(): string {
	return `trip-${generateId()}`;
}

export function generateCityId(): string {
	return `city-${generateId()}`;
}

export function generateStayId(): string {
	return `stay-${generateId()}`;
}

export function generateActivityId(): string {
	return `activity-${generateId()}`;
}

export function generateFoodVenueId(): string {
	return `food-${generateId()}`;
}

export function generateTransportId(): string {
	return `transport-${generateId()}`;
}

export function generateDayId(): string {
	return `day-${generateId()}`;
}

export function generateItemId(): string {
	return `item-${generateId()}`;
}
