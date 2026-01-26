// ============ Identifiers ============

export type TripId = string;
export type CityId = string;
export type StayId = string;
export type ActivityId = string;
export type FoodVenueId = string;
export type TransportLegId = string;
export type ItineraryDayId = string;
export type DailyItemId = string;

// ============ Location ============

export interface GeoLocation {
	latitude: number;
	longitude: number;
}

export interface Address {
	street: string;
	city: string;
	state?: string;
	postalCode?: string;
	country: string;
	formatted: string;
}

export interface Location {
	name: string;
	address: Address;
	geo: GeoLocation;
	placeId?: string;
	timezone?: string;
}

// ============ Stays (Lodging) ============

export type StayType = 'hotel' | 'airbnb' | 'vrbo' | 'hostel' | 'custom';

export interface StayBase {
	id: StayId;
	type: StayType;
	name: string;
	location: Location;
	checkIn: string;
	checkOut: string;
	confirmationNumber?: string;
	pricePerNight?: number;
	totalPrice?: number;
	currency?: string;
	notes?: string;
	website?: string;
	phone?: string;
	amenities?: string[];
	images?: string[];
}

export interface HotelStay extends StayBase {
	type: 'hotel';
	roomType?: string;
	starRating?: number;
}

export interface AirbnbStay extends StayBase {
	type: 'airbnb';
	hostName?: string;
	propertyType?: 'entire_place' | 'private_room' | 'shared_room';
	listingUrl?: string;
}

export interface VrboStay extends StayBase {
	type: 'vrbo';
	propertyType?: string;
	listingUrl?: string;
}

export interface HostelStay extends StayBase {
	type: 'hostel';
	roomType?: 'dorm' | 'private';
	bedsInRoom?: number;
}

export interface CustomStay extends StayBase {
	type: 'custom';
	stayDescription?: string;
}

export type Stay = HotelStay | AirbnbStay | VrboStay | HostelStay | CustomStay;

// ============ Activities ============

export type ActivityCategory =
	| 'sightseeing'
	| 'museum'
	| 'tour'
	| 'outdoor'
	| 'entertainment'
	| 'shopping'
	| 'wellness'
	| 'nightlife'
	| 'sports'
	| 'other';

export interface DayHours {
	open: string;
	close: string;
	closed?: boolean;
}

export interface HoursException {
	date: string;
	open?: string;
	close?: string;
	closed?: boolean;
	reason?: string;
}

export interface OperatingHours {
	monday?: DayHours;
	tuesday?: DayHours;
	wednesday?: DayHours;
	thursday?: DayHours;
	friday?: DayHours;
	saturday?: DayHours;
	sunday?: DayHours;
	exceptions?: HoursException[];
}

export interface Activity {
	id: ActivityId;
	name: string;
	category: ActivityCategory;
	location: Location;
	description?: string;
	duration?: number;
	startTime?: string;
	endTime?: string;
	price?: number;
	currency?: string;
	bookingRequired?: boolean;
	bookingUrl?: string;
	confirmationNumber?: string;
	website?: string;
	phone?: string;
	openingHours?: OperatingHours;
	admissionInfo?: string;
	tips?: string;
	images?: string[];
	rating?: number;
	reviewCount?: number;
}

// ============ Food Venues ============

export type FoodVenueType =
	| 'restaurant'
	| 'cafe'
	| 'bar'
	| 'bakery'
	| 'street_food'
	| 'food_market'
	| 'fine_dining'
	| 'fast_food'
	| 'other';

export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'tea' | 'dinner' | 'dessert' | 'drinks';

export interface FoodVenue {
	id: FoodVenueId;
	name: string;
	venueType: FoodVenueType;
	cuisineTypes?: string[];
	location: Location;
	mealType?: MealType;
	scheduledTime?: string;
	priceLevel?: 1 | 2 | 3 | 4;
	estimatedCost?: number;
	currency?: string;
	reservationRequired?: boolean;
	reservationUrl?: string;
	reservationConfirmation?: string;
	menuUrl?: string;
	website?: string;
	phone?: string;
	openingHours?: OperatingHours;
	notes?: string;
	dietaryOptions?: string[];
	rating?: number;
	reviewCount?: number;
	images?: string[];
}

// ============ Transportation ============

export type TransportMode =
	| 'flight'
	| 'train'
	| 'bus'
	| 'car'
	| 'taxi'
	| 'rideshare'
	| 'ferry'
	| 'subway'
	| 'walking'
	| 'biking';

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export interface TransportLeg {
	id: TransportLegId;
	mode: TransportMode;
	origin: Location;
	destination: Location;
	departureDate: string;
	departureTime?: string;
	arrivalDate?: string;
	arrivalTime?: string;
	duration?: number;
	distance?: number;
	carrier?: string;
	flightNumber?: string;
	trainNumber?: string;
	bookingReference?: string;
	price?: number;
	currency?: string;
	seatInfo?: string;
	terminal?: string;
	gate?: string;
	notes?: string;
	ticketUrl?: string;
}

// ============ Travel Calculation ============

export interface TravelEstimate {
	mode: TravelMode;
	duration: number;
	distance: number;
	estimatedCost?: number;
	currency?: string;
}

// ============ Weather ============

export type WeatherConditionType =
	| 'sunny'
	| 'partly_cloudy'
	| 'cloudy'
	| 'rain'
	| 'snow'
	| 'storm'
	| 'fog';

export interface WeatherCondition {
	date: string;
	location: Location;
	tempHigh: number;
	tempLow: number;
	condition: WeatherConditionType;
	precipitation?: number;
	humidity?: number;
	windSpeed?: number;
	uvIndex?: number;
	sunrise?: string;
	sunset?: string;
	isHistorical?: boolean;
}

// ============ Daily Items ============

export type DailyItemKind = 'stay' | 'activity' | 'food' | 'transport';

export interface BaseDailyItem {
	id: DailyItemId;
	kind: DailyItemKind;
	sortOrder: number;
	notes?: string;
	travelMode?: TravelMode;
	travelFromPrevious?: TravelEstimate;
}

export interface StayDailyItem extends BaseDailyItem {
	kind: 'stay';
	stayId: StayId;
	isCheckIn?: boolean;
	isCheckOut?: boolean;
}

export interface ActivityDailyItem extends BaseDailyItem {
	kind: 'activity';
	activityId: ActivityId;
}

export interface FoodDailyItem extends BaseDailyItem {
	kind: 'food';
	foodVenueId: FoodVenueId;
	mealSlot?: MealType;
}

export interface TransportDailyItem extends BaseDailyItem {
	kind: 'transport';
	transportLegId: TransportLegId;
}

export type DailyItem = StayDailyItem | ActivityDailyItem | FoodDailyItem | TransportDailyItem;

// Helper type for creating new daily items (without id and sortOrder)
export type NewStayDailyItem = Omit<StayDailyItem, 'id' | 'sortOrder'>;
export type NewActivityDailyItem = Omit<ActivityDailyItem, 'id' | 'sortOrder'>;
export type NewFoodDailyItem = Omit<FoodDailyItem, 'id' | 'sortOrder'>;
export type NewTransportDailyItem = Omit<TransportDailyItem, 'id' | 'sortOrder'>;
export type NewDailyItem = NewStayDailyItem | NewActivityDailyItem | NewFoodDailyItem | NewTransportDailyItem;

// ============ Itinerary Day ============

export interface ItineraryDay {
	id: ItineraryDayId;
	date: string;
	dayNumber: number;
	title?: string;
	cityIds: CityId[];
	items: DailyItem[];
	notes?: string;
}

// ============ City ============

export interface City {
	id: CityId;
	name: string;
	country: string;
	location: GeoLocation;
	timezone: string;
	startDate: string;
	endDate: string;
	stays: Stay[];
	arrivalTransportId?: TransportLegId;
	departureTransportId?: TransportLegId;
}

// ============ Color Theming ============

export type ColorMode = 'by-kind' | 'by-stay';

export interface KindColors {
	stay: string;
	activity: string;
	food: string;
	transport: string;
	flight: string;
}

export interface ColorScheme {
	mode: ColorMode;
	kindColors: KindColors;
	stayColors?: Record<StayId, string>;
}

// ============ Trip ============

export interface Trip {
	id: TripId;
	name: string;
	description?: string;
	homeCity: Location;
	startDate: string;
	endDate: string;
	cities: City[];
	activities: Activity[];
	foodVenues: FoodVenue[];
	transportLegs: TransportLeg[];
	itinerary: ItineraryDay[];
	colorScheme: ColorScheme;
	createdAt: string;
	updatedAt: string;
}

// ============ User Settings ============

export interface UserSettings {
	homeCity?: Location;
	defaultColorScheme: ColorScheme;
	preferredMapApp: 'google' | 'apple';
	temperatureUnit: 'celsius' | 'fahrenheit';
	distanceUnit: 'km' | 'miles';
	timeFormat: '12h' | '24h';
	autoSaveEnabled: boolean;
	autoSaveInterval: number;
}

// ============ Adapter Interfaces ============

export interface SearchParams {
	query?: string;
	location?: Location;
	radius?: number;
	limit?: number;
}

export interface LodgingSearchParams extends SearchParams {
	checkIn?: string;
	checkOut?: string;
	guests?: number;
	minPrice?: number;
	maxPrice?: number;
	amenities?: string[];
}

export interface FoodSearchParams extends SearchParams {
	cuisineTypes?: string[];
	priceLevel?: number[];
	openNow?: boolean;
	mealType?: MealType;
}

export interface ActivitySearchParams extends SearchParams {
	categories?: ActivityCategory[];
	date?: string;
	minRating?: number;
}

export interface LodgingAdapter {
	search(params: LodgingSearchParams): Promise<Stay[]>;
	getById(id: string): Promise<Stay | null>;
	getDetails(stay: Stay): Promise<Stay>;
}

export interface FoodAdapter {
	search(params: FoodSearchParams): Promise<FoodVenue[]>;
	getById(id: string): Promise<FoodVenue | null>;
	getDetails(venue: FoodVenue): Promise<FoodVenue>;
}

export interface AttractionAdapter {
	search(params: ActivitySearchParams): Promise<Activity[]>;
	getById(id: string): Promise<Activity | null>;
	getDetails(activity: Activity): Promise<Activity>;
}

export interface WeatherAdapter {
	getForecast(location: Location, dates: string[]): Promise<WeatherCondition[]>;
	getHistorical(location: Location, dates: string[]): Promise<WeatherCondition[]>;
	/** Smart fetch - uses forecast for near dates (within 2 weeks), historical estimates otherwise */
	getWeather(location: Location, dates: string[]): Promise<WeatherCondition[]>;
}

export interface TransportAdapter {
	getEstimate(origin: Location, destination: Location, mode: TravelMode): Promise<TravelEstimate>;
	getAllModeEstimates(origin: Location, destination: Location): Promise<TravelEstimate[]>;
	getRidesharePrice(
		origin: Location,
		destination: Location
	): Promise<{ min: number; max: number; currency: string }>;
}

// ============ Helper Types ============

export interface ResolvedDailyItem {
	item: DailyItem;
	data: Stay | Activity | FoodVenue | TransportLeg;
	location: Location;
}

export function isStayItem(item: DailyItem): item is StayDailyItem {
	return item.kind === 'stay';
}

export function isActivityItem(item: DailyItem): item is ActivityDailyItem {
	return item.kind === 'activity';
}

export function isFoodItem(item: DailyItem): item is FoodDailyItem {
	return item.kind === 'food';
}

export function isTransportItem(item: DailyItem): item is TransportDailyItem {
	return item.kind === 'transport';
}
