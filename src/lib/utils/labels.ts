import type {
	ActivityCategory,
	FoodVenueType,
	MealType,
	StayType,
	TransportMode,
	GroundTransitSubType
} from '$lib/types/travel';

const activityCategoryLabels: Record<ActivityCategory, string> = {
	sightseeing: 'Sightseeing',
	museum: 'Museum',
	tour: 'Tour',
	outdoor: 'Outdoor',
	entertainment: 'Entertainment',
	shopping: 'Shopping',
	wellness: 'Wellness',
	nightlife: 'Nightlife',
	sports: 'Sports',
	other: 'Activity'
};

export function getActivityCategoryLabel(category: ActivityCategory): string {
	return activityCategoryLabels[category] || 'Activity';
}

const venueTypeLabels: Record<FoodVenueType, string> = {
	restaurant: 'Restaurant',
	cafe: 'Café',
	bar: 'Bar',
	bakery: 'Bakery',
	street_food: 'Street Food',
	food_market: 'Food Market',
	fine_dining: 'Fine Dining',
	fast_food: 'Fast Food',
	other: 'Food'
};

export function getVenueTypeLabel(type: FoodVenueType): string {
	return venueTypeLabels[type] || 'Restaurant';
}

const mealTypeLabels: Record<MealType, string> = {
	breakfast: 'Breakfast',
	brunch: 'Brunch',
	lunch: 'Lunch',
	tea: 'Tea',
	dinner: 'Dinner',
	dessert: 'Dessert',
	drinks: 'Drinks'
};

export function getMealTypeLabel(type: MealType): string {
	return mealTypeLabels[type] || type;
}

const stayTypeLabels: Record<StayType, string> = {
	hotel: 'Hotel',
	airbnb: 'Airbnb',
	vrbo: 'VRBO',
	hostel: 'Hostel',
	custom: 'Accommodation'
};

export function getStayTypeLabel(type: StayType): string {
	return stayTypeLabels[type] || 'Stay';
}

const transportModeLabels: Record<TransportMode, string> = {
	flight: 'Flight',
	ground_transit: 'Transit',
	car: 'Drive',
	taxi: 'Taxi',
	rideshare: 'Rideshare',
	ferry: 'Ferry',
	walking: 'Walk',
	biking: 'Bike',
	car_rental: 'Rental Car'
};

// Legacy modes kept for backwards compatibility
const legacyTransportModeLabels: Record<string, string> = {
	train: 'Train',
	bus: 'Bus',
	subway: 'Subway'
};

export function getTransportModeLabel(mode: TransportMode | string): string {
	return transportModeLabels[mode as TransportMode] || legacyTransportModeLabels[mode] || 'Transport';
}

const groundTransitSubTypeLabels: Record<GroundTransitSubType, string> = {
	train: 'Train',
	bus: 'Bus',
	metro: 'Metro',
	tram: 'Tram',
	coach: 'Coach'
};

export function getTransportSubTypeLabel(subType: string): string {
	return groundTransitSubTypeLabels[subType as GroundTransitSubType] || 'Transit';
}

const currencySymbols: Record<string, string> = {
	USD: '$',
	EUR: '€',
	JPY: '¥',
	GBP: '£'
};

export function getCurrencySymbol(currency: string): string {
	return currencySymbols[currency] || '$';
}
