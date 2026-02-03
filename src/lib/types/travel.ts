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

/** Fields that can be overridden by user edits */
export interface StayUserOverrides {
	checkInTime?: string;
	checkOutTime?: string;
	pricePerNight?: number;
	amenities?: string[];
	notes?: string;
}

export interface StayBase {
	id: StayId;
	type: StayType;
	name: string;
	location: Location;
	checkIn: string;  // Date (YYYY-MM-DD)
	checkOut: string; // Date (YYYY-MM-DD)
	checkInTime?: string;  // Time (HH:MM) - typical check-in time
	checkOutTime?: string; // Time (HH:MM) - typical check-out time
	confirmationNumber?: string;
	pricePerNight?: number;
	totalPrice?: number;
	currency?: string;
	notes?: string;
	website?: string;
	phone?: string;
	amenities?: string[];
	images?: string[];
	/** User overrides for API-fetched data */
	userOverrides?: StayUserOverrides;
	/** Timestamp of last API data fetch */
	lastFetched?: string;
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

/** Common place tags/amenities */
export type PlaceTag =
	| 'wifi'
	| 'wheelchair_accessible'
	| 'parking'
	| 'outdoor_seating'
	| 'reservations_required'
	| 'ticket_required'
	| 'guided_tour'
	| 'audio_guide'
	| 'family_friendly'
	| 'pet_friendly'
	| 'credit_cards'
	| 'cash_only';

/** Fields that can be overridden by user edits for activities */
export interface ActivityUserOverrides {
	openingHours?: OperatingHours;
	price?: number;
	entryFee?: number;
	tags?: PlaceTag[];
	categoryTags?: string[];
	notes?: string;
	bookingRequired?: boolean;
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
	/** General price/cost */
	price?: number;
	/** Specific entry/admission fee */
	entryFee?: number;
	currency?: string;
	/** Price level indicator (1-4, like $-$$$$) */
	priceLevel?: 1 | 2 | 3 | 4;
	bookingRequired?: boolean;
	bookingUrl?: string;
	confirmationNumber?: string;
	website?: string;
	/** Foursquare/Google place page URL */
	apiPageUrl?: string;
	phone?: string;
	openingHours?: OperatingHours;
	admissionInfo?: string;
	tips?: string;
	images?: string[];
	rating?: number;
	reviewCount?: number;
	/** Tags/amenities for this place */
	tags?: PlaceTag[];
	/** Category tags from API (e.g., "Aquarium", "Zoo", "Art Gallery") */
	categoryTags?: string[];
	/** User overrides for API-fetched data */
	userOverrides?: ActivityUserOverrides;
	/** Timestamp of last API data fetch */
	lastFetched?: string;
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

/** Food-specific tags */
export type FoodTag =
	| 'wifi'
	| 'outdoor_seating'
	| 'reservations_required'
	| 'takeout'
	| 'delivery'
	| 'vegetarian_options'
	| 'vegan_options'
	| 'gluten_free_options'
	| 'halal'
	| 'kosher'
	| 'family_friendly'
	| 'pet_friendly'
	| 'credit_cards'
	| 'cash_only'
	| 'byob';

/** Fields that can be overridden by user edits for food venues */
export interface FoodVenueUserOverrides {
	openingHours?: OperatingHours;
	priceLevel?: 1 | 2 | 3 | 4;
	estimatedCost?: number;
	tags?: FoodTag[];
	notes?: string;
	reservationRequired?: boolean;
}

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
	/** Foursquare/Google place page URL */
	apiPageUrl?: string;
	phone?: string;
	openingHours?: OperatingHours;
	notes?: string;
	dietaryOptions?: string[];
	rating?: number;
	reviewCount?: number;
	images?: string[];
	/** Tags/amenities for this place */
	tags?: FoodTag[];
	/** User overrides for API-fetched data */
	userOverrides?: FoodVenueUserOverrides;
	/** Timestamp of last API data fetch */
	lastFetched?: string;
}

// ============ Transportation ============

export type TransportMode =
	| 'flight'
	| 'ground_transit'  // Consolidated: train, bus, metro, tram, coach
	| 'car_rental'
	| 'car'
	| 'taxi'
	| 'rideshare'
	| 'ferry'
	| 'walking'
	| 'biking';

/** @deprecated Use 'ground_transit' with subType instead. Kept for migration compatibility. */
export type LegacyTransportMode = 'train' | 'bus' | 'subway';

export type GroundTransitSubType = 'train' | 'bus' | 'metro' | 'tram' | 'coach';

export type VehicleType =
	| 'economy'
	| 'compact'
	| 'midsize'
	| 'fullsize'
	| 'sedan'
	| 'suv'
	| 'minivan'
	| 'sports_car'
	| 'convertible'
	| 'truck'
	| 'van'
	| 'luxury';

export type TransmissionType = 'automatic' | 'manual';

export interface VehicleTags {
	isElectric?: boolean;
	isHybrid?: boolean;
	transmission?: TransmissionType;
	seatCount?: number;
	baggageCapacity?: number; // number of large bags
	hasGPS?: boolean;
	hasChildSeat?: boolean;
}

export interface RentalCompany {
	name: string;
	code?: string; // e.g., 'HERTZ', 'ENTERPRISE'
	website?: string;
	phone?: string;
}

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export type SeatPosition = 'window' | 'middle' | 'aisle';

export interface PassengerSeat {
	row: string;
	seat: string;
	position?: SeatPosition;
	passenger?: string;
}

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
	/** @deprecated Use transitNumber instead */
	trainNumber?: string;
	/** Transit number for ground_transit (train number, bus number, etc.) */
	transitNumber?: string;
	/** Sub-type for ground_transit mode */
	groundTransitSubType?: GroundTransitSubType;
	bookingReference?: string;
	price?: number;
	currency?: string;
	seatInfo?: string;
	seats?: PassengerSeat[];
	terminal?: string;
	gate?: string;
	notes?: string;
	ticketUrl?: string;
	// Car rental specific fields
	rentalCompany?: RentalCompany;
	vehicleType?: VehicleType;
	vehicleTags?: VehicleTags;
	pickupLocation?: Location;
	returnLocation?: Location;
	dailyRate?: number;
}

// ============ Travel Calculation ============

export interface TravelEstimate {
	mode: TravelMode;
	duration: number; // in minutes
	distance: number; // in km
	estimatedCost?: number;
	currency?: string;
	/** Whether this is a calculated estimate vs real routing data */
	isEstimate?: boolean;
}

// ============ Weather ============

export type WeatherConditionType =
	| 'clear'
	| 'mostly_clear'
	| 'partly_cloudy'
	| 'overcast'
	| 'fog'
	| 'drizzle'
	| 'rain'
	| 'snow'
	| 'storm';

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
	/** True for past dates - weather data is historical, not a forecast */
	isHistorical?: boolean;
	/** True for far-future dates (14+ days) - weather is an estimate based on historical patterns, not a real forecast */
	isEstimate?: boolean;
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
	isDeparture?: boolean;
	isArrival?: boolean;
}

export type DailyItem = StayDailyItem | ActivityDailyItem | FoodDailyItem | TransportDailyItem;

// Helper type for creating new daily items (without id and sortOrder)
export type NewStayDailyItem = Omit<StayDailyItem, 'id' | 'sortOrder'>;
export type NewActivityDailyItem = Omit<ActivityDailyItem, 'id' | 'sortOrder'>;
export type NewFoodDailyItem = Omit<FoodDailyItem, 'id' | 'sortOrder'>;
export type NewTransportDailyItem = Omit<TransportDailyItem, 'id' | 'sortOrder'>;
export type NewDailyItem = NewStayDailyItem | NewActivityDailyItem | NewFoodDailyItem | NewTransportDailyItem;

// ============ Itinerary Day ============

/** A note entry for a day (independent of items) */
export interface DayNote {
	id: string;
	content: string;
	createdAt: string;
	updatedAt?: string;
}

export interface ItineraryDay {
	id: ItineraryDayId;
	date: string;
	dayNumber: number;
	title?: string;
	cityIds: CityId[];
	items: DailyItem[];
	/** Legacy notes field - single string */
	notes?: string;
	/** Day-level notes (not tied to specific items) */
	dailyNotes?: DayNote[];
}

// ============ City ============

export interface City {
	id: CityId;
	name: string;
	country: string;
	state?: string;      // State, province, region
	county?: string;     // County, district
	formatted?: string;  // Full formatted address (e.g., "Monterey, CA, United States")
	location: GeoLocation;
	timezone: string;
	startDate: string;
	endDate: string;
	stays: Stay[];
	arrivalTransportId?: TransportLegId;
	departureTransportId?: TransportLegId;
}

/** City data used when inferring a city from a stay (without id, stays, transport) */
export type EnrichedCityData = Omit<City, 'id' | 'stays' | 'arrivalTransportId' | 'departureTransportId'>;

// ============ Color Theming ============

export type ColorMode = 'by-kind' | 'by-stay';

export interface KindColors {
	stay: string;
	activity: string;
	food: string;
	transport: string;
	flight: string;
}

/**
 * A color palette for stay coloring.
 * Can be a default palette or a custom one for the trip.
 */
export interface ColorPalette {
	id: string;
	name: string;
	colors: string[];
}

export interface ColorScheme {
	mode: ColorMode;
	kindColors: KindColors;
	/** Map of stay IDs (or inferred stay keys) to their assigned colors */
	stayColors?: Record<string, string>;
	/** Palette colors for by-stay mode */
	paletteColors?: string[];
	/** ID of the custom color scheme being used (if any) */
	customSchemeId?: string;
}

/**
 * Information about a "stay segment" - either a real stay or an inferred one
 * Used for by-stay coloring when days don't have explicit lodging
 */
export interface StaySegment {
	/** Real stay ID, or inferred ID like 'inferred:cityId' or 'inferred:unknown:dayIndex' */
	id: string;
	/** The color assigned to this segment */
	color: string;
	/** Start day index (0-based) */
	startDayIndex: number;
	/** End day index (0-based, inclusive) */
	endDayIndex: number;
	/** Whether this is an inferred stay (no lodging booked) */
	isInferred: boolean;
	/** City ID if known */
	cityId?: CityId;
	/** Real stay ID if this is an actual stay */
	stayId?: StayId;
}

// ============ Trip ============

import type { TripSettings } from './settings';

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
	/** Per-trip settings overrides */
	settings?: TripSettings;
	createdAt: string;
	updatedAt: string;
}

// ============ User Settings ============

// User settings are now defined in settings.ts
// This re-export maintains backwards compatibility
export type { UserSettings } from './settings';

// ============ Adapter Interfaces ============

export interface SearchParams {
	query?: string;
	location?: Location;
	radius?: number;
	limit?: number;
	near?: string; // City name for Foursquare "near" parameter
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

// ============ Flight Search Adapter ============

export interface FlightSearchParams {
	airline?: string;
	airlineCode?: string;
	flightNumber?: string;
	departureDate: string;
	origin?: Location;
	destination?: Location;
}

export interface Airline {
	name: string;
	code: string;
	icaoCode?: string;
	country?: string;
}

export interface FlightSearchResult {
	airline: string;
	airlineCode: string;
	flightNumber: string;
	origin: Location;
	destination: Location;
	departureDate: string;
	departureTime?: string;
	arrivalDate?: string;
	arrivalTime?: string;
	duration?: number;
	aircraft?: string;
	price?: number;
	currency?: string;
}

export interface FlightAdapter {
	searchAirlines(query: string): Promise<Airline[]>;
	getFlightDetails(airlineCode: string, flightNumber: string, date: string): Promise<FlightSearchResult | null>;
	getAllFlightDetails?(airlineCode: string, flightNumber: string, date: string): Promise<FlightSearchResult[]>;
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
