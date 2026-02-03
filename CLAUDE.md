# Travel Planner - AI Assistant Guide

> **Living Document**: This file is a living document and must be kept up to date as work progresses. When making significant changes to the codebase architecture, adapters, or APIs, update the relevant sections here.

This document helps AI assistants understand and work with this travel planner codebase effectively.

## Project Overview

A travel itinerary planning application built with **SvelteKit 5** and **Svelte 5 runes**. Users can create multi-city trips, plan stays (hotel, airbnb, vrbo, hostel, custom), schedule activities and meals, book flights/trains/buses, and view day-by-day itineraries with travel time calculations.

## Tech Stack

- **Framework**: SvelteKit 5 with TypeScript
- **State Management**: Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Modern CSS with variables, nesting, container queries, `:has()`, `color-mix()`
- **Persistence**: localStorage (trip data), SQLite (server cache)
- **Server**: Node.js with adapter-node, deployable via Docker
- **Export**: PDF (html2pdf.js), DOCX (docx library), JSON

## Server Architecture

External API calls (weather, flights, routing, geocoding, places) go through server endpoints:

```
Browser                           Server (SvelteKit)
┌─────────────────┐              ┌─────────────────────────┐
│ $lib/api/*      │──fetch──────►│ /api/weather            │
│ (client cache)  │              │ /api/flights/*          │
│                 │              │ /api/routing            │
│                 │              │ /api/geocoding          │
│                 │              │ /api/cities             │
│                 │              │ /api/places/food        │
│                 │              │ /api/places/attractions │
├─────────────────┤              ├─────────────────────────┤
│ localStorage    │              │ $lib/server/            │
│ (trip data)     │              │ - SQLite cache          │
└─────────────────┘              │ - Rate limiting         │
                                 │ - API adapters          │
                                 └──────────┬──────────────┘
                                            │
                                 ┌──────────▼──────────────┐
                                 │ External APIs           │
                                 │ - Open-Meteo            │
                                 │ - OSRM (routing)        │
                                 │ - AeroDataBox           │
                                 │ - Geoapify              │
                                 │ - Foursquare            │
                                 │ - TimezoneDB            │
                                 └─────────────────────────┘
```

### Key Server Directories

- `$lib/server/` - Server-only code (SvelteKit enforces this)
- `$lib/server/db/cache.ts` - SQLite cache with TTL
- `$lib/server/rateLimit.ts` - IP-based rate limiting
- `$lib/server/adapters/` - Server-side API adapters:
  - `geoapify.ts` - Geocoding, city search, timezone lookup
  - `foursquare.ts` - Food and attraction search
  - `googlePlaces.ts` - Place details (hours, pricing, amenities)
  - `weather.ts` - Weather data from Open-Meteo
  - `aerodatabox.ts` - AeroDataBox API client
  - `flights.ts` - Flight search orchestration
  - `routing.ts` - Travel times from OSRM
- `$lib/api/` - Client-side API wrappers with in-memory caching

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weather` | Weather data (forecast, historical, predictions) |
| `GET /api/flights/search` | Flight route lookup |
| `GET /api/flights/airlines` | Airline search by code |
| `GET /api/routing` | Travel time/distance calculation |
| `GET /api/geocoding` | Forward/reverse geocoding (address ↔ coordinates) |
| `GET /api/cities` | City search with autocomplete and timezone |
| `GET /api/places/food` | Food venue search (restaurants, cafes, bars) |
| `GET /api/places/attractions` | Attraction search (museums, landmarks, parks) |
| `GET /api/places/lodging` | Lodging search (hotels, hostels, etc.) |
| `GET /api/places/details` | Place details (hours, pricing, amenities) |

### Environment Variables

External APIs require the following environment variables:

| Variable | API | Required | Free Tier | Get Key At |
|----------|-----|----------|-----------|------------|
| `GEOAPIFY_API_KEY` | Geocoding, City Search, Timezone | Yes | 3,000 req/day | https://myprojects.geoapify.com/ |
| `FOURSQUARE_API_KEY` | Food, Attractions, Lodging | Yes | $200/mo (~20k calls) | https://foursquare.com/developers/ |
| `GOOGLE_PLACES_API_KEY` | Place Details (hours, pricing) | No | $200/mo (~5k calls) | https://console.cloud.google.com/ |
| `TIMEZONEDB_API_KEY` | Timezone (fallback) | No | 1 req/sec unlimited | https://timezonedb.com/ |
| `AERODATABOX_API_KEY` | Flights | Yes* | 600 units/mo | https://rapidapi.com/aedbx-aedbx/api/aerodatabox |

\* Flight search works without key but with limited data. All other APIs return empty results without keys.

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte           # Root layout, localStorage init
│   ├── +page.svelte             # Home - trip list
│   ├── trip/[id]/
│   │   └── +page.svelte         # Trip itinerary view
│   └── api/                     # Server API endpoints
│       ├── cities/+server.ts
│       ├── geocoding/+server.ts
│       ├── weather/+server.ts
│       ├── routing/+server.ts
│       ├── flights/
│       │   ├── search/+server.ts
│       │   └── airlines/+server.ts
│       └── places/
│           ├── food/+server.ts
│           ├── attractions/+server.ts
│           ├── lodging/+server.ts
│           └── details/+server.ts
├── lib/
│   ├── types/
│   │   ├── travel.ts            # Core travel interfaces (Trip, City, Stay, etc.)
│   │   └── settings.ts          # Settings interfaces (UserSettings, TripSettings)
│   ├── stores/
│   │   ├── tripStore.svelte.ts      # Main trip state (Svelte 5 runes)
│   │   └── settingsStore.svelte.ts  # User/trip settings state
│   ├── adapters/                # Client-side data adapters
│   │   ├── airports/
│   │   │   └── airportAdapter.ts    # Airport code lookup
│   │   ├── cities/index.ts          # City search (via /api/cities)
│   │   ├── lodging/index.ts         # Manual entry with geocoding
│   │   ├── food/index.ts            # Food venues (via /api/places/food)
│   │   ├── attractions/index.ts     # Attractions (via /api/places/attractions)
│   │   ├── weather/index.ts         # Weather forecasts (via /api/weather)
│   │   └── transport/
│   │       ├── estimateAdapter.ts   # Haversine-based estimates (isEstimate: true)
│   │       └── flightAdapter.ts     # Flight search (via /api/flights)
│   ├── api/                     # Client-side API wrappers with caching
│   │   ├── clientCache.ts           # In-memory cache utilities
│   │   ├── flightApi.ts             # Flight API client
│   │   ├── routingApi.ts            # Routing/travel time client
│   │   ├── weatherApi.ts            # Weather API client
│   │   ├── geocodingApi.ts          # Geocoding + city search client
│   │   ├── placesApi.ts             # Food & attraction search client
│   │   └── placeDetailsApi.ts       # Place details (hours, pricing) client
│   ├── server/                  # Server-only code (SvelteKit enforced)
│   │   ├── rateLimit.ts             # IP-based rate limiting
│   │   ├── db/
│   │   │   └── cache.ts             # SQLite cache with TTL
│   │   ├── adapters/                # External API adapters
│   │   │   ├── geoapify.ts          # Geocoding, city search, timezone
│   │   │   ├── foursquare.ts        # Food & attraction search
│   │   │   ├── googlePlaces.ts      # Place details (hours, pricing)
│   │   │   ├── weather.ts           # Open-Meteo weather data
│   │   │   ├── aerodatabox.ts       # AeroDataBox flight lookup
│   │   │   ├── flights.ts           # Flight search orchestration
│   │   │   └── routing.ts           # OSRM travel times
│   │   └── data/                    # Static data files
│   ├── services/
│   │   ├── storageService.ts        # localStorage persistence
│   │   ├── documentService.ts       # PDF/DOCX export
│   │   ├── geoService.ts            # Distance calculations
│   │   ├── mapService.ts            # Google/Apple Maps links
│   │   ├── routingService.ts        # Travel time orchestration
│   │   └── placeDetailsService.ts   # Place details orchestration
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives
│   │   │   ├── Modal.svelte
│   │   │   ├── Button.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── Input.svelte
│   │   │   ├── Icon.svelte
│   │   │   ├── Badge.svelte
│   │   │   ├── ContextMenu.svelte
│   │   │   └── ContextMenuItem.svelte
│   │   ├── modals/              # Feature modals
│   │   │   ├── AddItemModal.svelte
│   │   │   ├── AddCityModal.svelte
│   │   │   ├── MoveItemModal.svelte
│   │   │   ├── TransportKindModal.svelte
│   │   │   ├── TransportEntryModal.svelte
│   │   │   ├── FlightSearchModal.svelte
│   │   │   └── CarRentalModal.svelte
│   │   ├── itinerary/           # Day display components
│   │   │   ├── ItineraryDay.svelte
│   │   │   ├── DayHeader.svelte
│   │   │   └── ItemList.svelte
│   │   ├── items/               # Item cards
│   │   │   ├── StayCard.svelte
│   │   │   ├── ActivityCard.svelte
│   │   │   ├── FoodCard.svelte
│   │   │   └── TransportCard.svelte
│   │   ├── settings/            # Settings UI
│   │   │   ├── UserSettingsModal.svelte
│   │   │   ├── TripSettingsModal.svelte
│   │   │   ├── controls/        # Setting control components
│   │   │   └── sections/        # Settings section components
│   │   ├── places/              # Place details display
│   │   │   ├── BusinessHours.svelte
│   │   │   ├── CategoryTagList.svelte
│   │   │   └── TagList.svelte
│   │   ├── travel/              # Travel time/distance display
│   │   │   └── TravelMargin.svelte
│   │   ├── search/              # Autocomplete search
│   │   │   └── SearchAutocomplete.svelte
│   │   └── weather/             # Weather badges
│   │       └── WeatherBadge.svelte
│   └── utils/
│       ├── ids.ts               # ID generation
│       ├── dates.ts             # Date formatting, timezone handling
│       ├── colors.ts            # Color utilities, stay segments
│       ├── units.ts             # Unit conversions (temp, distance)
│       ├── stayUtils.ts         # Stay helper functions
│       ├── addressParser.ts     # Address parsing utilities
│       ├── retry.ts             # Retry logic for API calls
│       └── url.ts               # URL utilities
└── app.css                      # Global styles, CSS variables
```

## Key Patterns

### Svelte 5 Runes (NOT Traditional Stores)

State is managed using Svelte 5 runes in `.svelte.ts` files:

```typescript
// tripStore.svelte.ts
let state = $state<TripStoreState>({
  trips: [],
  currentTripId: null
});

const currentTrip = $derived(
  state.trips.find(t => t.id === state.currentTripId) ?? null
);
```

**Important**: Do NOT use `writable()`, `readable()`, or `derived()` from `svelte/store`. Use `$state` and `$derived` runes instead.

### Adapter Pattern

Data fetching is abstracted through adapters with consistent interfaces:

```typescript
interface LodgingAdapter {
  search(params: LodgingSearchParams): Promise<Stay[]>;
  getById(id: string): Promise<Stay | null>;
  getDetails(stay: Stay): Promise<Stay>;
}
```

Most adapters use real APIs exclusively. Server-side adapters (`$lib/server/adapters/`) handle external API calls with SQLite caching, while client-side wrappers (`$lib/api/`) provide in-memory caching and request deduplication.

**Adapter Status:**

| Adapter | Data Source | Notes |
|---------|-------------|-------|
| Cities | Geoapify API | Real geocoding data with timezone |
| Food | Foursquare API | Real venue data |
| Attractions | Foursquare API | Real attraction data |
| Lodging | Foursquare API | Search available; users can also create custom stays |
| Airports | Static data | Airport code lookup from bundled data |
| Transport | OSRM (real) / Haversine (estimate) | `isEstimate: true` for fallback |
| Weather | Open-Meteo API | Real forecast data (16-day + historical) |
| Flights | AeroDataBox API | Real flight data via RapidAPI |
| Place Details | Google Places API | Hours, pricing, amenities (optional) |

When a data source is unavailable, adapters return empty results rather than fake data.

### TypeScript Discriminated Unions

Stay types and daily items use discriminated unions:

```typescript
type Stay = HotelStay | AirbnbStay | VrboStay | HostelStay | CustomStay;
type DailyItem = StayDailyItem | ActivityDailyItem | FoodDailyItem | TransportDailyItem;
```

Use type guards (`isStayItem`, `isActivityItem`, `isFoodItem`, `isTransportItem`) for narrowing.

### CSS Conventions

- **Variables**: All values use CSS custom properties (`--space-4`, `--color-primary`)
- **Colors**: oklch color space with `color-mix()` for variations
- **Responsive**: Container queries for component-level responsiveness
- **Nesting**: CSS nesting for related selectors

```css
.item-card {
  --item-color: var(--color-kind-activity);
  border-left: 4px solid var(--item-color);

  &:hover {
    background: color-mix(in oklch, var(--item-color), transparent 95%);
  }

  @container day (max-width: 600px) {
    padding: var(--space-2);
  }
}
```

## Core Data Types

### Trip

```typescript
interface Trip {
  id: TripId;
  name: string;
  description?: string;
  homeCity: Location;
  startDate: string;        // ISO date
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
```

### City

```typescript
interface City {
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
```

### Stay Types

All stay types extend `StayBase` with type-specific fields:

```typescript
type Stay = HotelStay | AirbnbStay | VrboStay | HostelStay | CustomStay;

interface HotelStay extends StayBase {
  type: 'hotel';
  roomType?: string;
  starRating?: number;
}

interface AirbnbStay extends StayBase {
  type: 'airbnb';
  hostName?: string;
  propertyType?: 'entire_place' | 'private_room' | 'shared_room';
  listingUrl?: string;
}

interface HostelStay extends StayBase {
  type: 'hostel';
  roomType?: 'dorm' | 'private';
  bedsInRoom?: number;
}
```

### Transport Modes

Supports 10 transport modes:

```typescript
type TransportMode = 'flight' | 'train' | 'bus' | 'car' | 'taxi' | 'rideshare' | 'ferry' | 'subway' | 'walking' | 'biking';
```

Transport legs include mode-specific fields:

```typescript
interface TransportLeg {
  id: TransportLegId;
  mode: TransportMode;
  origin: Location;
  destination: Location;
  departureDate: string;
  departureTime?: string;
  arrivalDate?: string;       // Can differ from departure (multi-day journeys)
  arrivalTime?: string;
  duration?: number;
  carrier?: string;
  flightNumber?: string;      // For flights
  trainNumber?: string;       // For trains
  terminal?: string;          // For flights
  gate?: string;              // For flights
  price?: number;
  currency?: string;
  bookingReference?: string;
  // ...
}
```

### DailyItem (Discriminated Union)

```typescript
type DailyItem = StayDailyItem | ActivityDailyItem | FoodDailyItem | TransportDailyItem;

interface TransportDailyItem extends BaseDailyItem {
  kind: 'transport';
  transportLegId: TransportLegId;
  isDeparture?: boolean;      // Departure from origin
  isArrival?: boolean;        // Arrival at destination
}
```

## Color System

### Two Color Modes

1. **By Kind** (`by-kind`): Each item type has a distinct color
   - Stays: purple
   - Activities: green
   - Food: orange
   - Transport: blue
   - Flights: special flight color

2. **By Stay** (`by-stay`): Items colored by which lodging they belong to
   - Real stays get assigned colors from an 8-color palette
   - Days without booked lodging use "inferred" stays based on city
   - Useful for tracking belongings across different accommodations

### Stay Segments

For `by-stay` mode, the system computes `StaySegment` objects:

```typescript
interface StaySegment {
  id: string;               // Real stay ID or inferred key (e.g. 'inferred:cityId' or 'inferred:unknown:dayIndex')
  color: string;
  startDayIndex: number;
  endDayIndex: number;
  isInferred: boolean;      // No lodging booked
  cityId?: CityId;
  stayId?: StayId;
}
```

### Color Utilities (`src/lib/utils/colors.ts`)

- `lightenColor()`, `darkenColor()`, `desaturateColor()`
- `getContrastColor()` for text contrast
- `getDayBackgroundColor()` for visual day grouping
- `computeStaySegments()` for segment calculation

## Settings System

The app uses a two-tier settings system with inheritance:

### User Settings (`UserSettings`)

Global defaults stored in localStorage via `settingsStore`:

```typescript
interface UserSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system';

  // Units & Localization
  temperatureUnit: 'celsius' | 'fahrenheit' | 'trip-location';
  distanceUnit: 'km' | 'miles' | 'trip-location';
  timeFormat: '12h' | '24h';

  // Map & Navigation
  preferredMapApp: 'google' | 'apple' | 'system';

  // Transport preferences
  disabledTransportModes: ('biking' | 'walking' | 'rideshare' | 'ferry')[];

  // Color customization
  defaultColorMode: 'by-kind' | 'by-stay';
  customColorSchemes: CustomColorScheme[];
  defaultColorSchemeId?: string;

  // Home location
  homeCity?: Location;

  // Persistence
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
}
```

### Trip Settings (`TripSettings`)

Per-trip overrides using `MaybeOverridden<T>` wrapper:

```typescript
interface TripSettings {
  temperatureUnit?: MaybeOverridden<TemperatureUnit>;
  distanceUnit?: MaybeOverridden<DistanceUnit>;
  timeFormat?: MaybeOverridden<TimeFormat>;
  disabledTransportModes?: MaybeOverridden<DisableableTransportMode[]>;
  colorModeOverridden?: boolean;
  colorSchemeOverridden?: boolean;
}

// Override wrapper
interface OverriddenSetting<T> {
  value: T;
  isOverridden: true;
}
```

### Settings Resolution

Use `getSettingValue()` to resolve with inheritance:

```typescript
import { getSettingValue } from '$lib/types/settings';

// Returns trip override if set, otherwise user default
const tempUnit = getSettingValue(trip.settings?.temperatureUnit, userSettings.temperatureUnit);
```

### Location-Based Units

When set to `'trip-location'`, units automatically adapt to the destination country:

```typescript
import { resolveLocationBasedTemperature, resolveLocationBasedDistance } from '$lib/types/settings';

// Returns 'fahrenheit' for USA, 'celsius' for most other countries
const unit = resolveLocationBasedTemperature(city.country);
```

### Settings Store (`settingsStore.svelte.ts`)

```typescript
import { settingsStore } from '$lib/stores/settingsStore.svelte';

// Read settings
const theme = settingsStore.settings.theme;

// Update settings
settingsStore.updateSettings({ theme: 'dark' });

// Reset to defaults
settingsStore.resetToDefaults();
```

## Transport Search

### Flight Search

`FlightAdapter` interface with:
- Airline autocomplete search
- Flight lookup by airline code + flight number + date
- Support for multi-day flights (arrival next day)
- Currency support (USD, EUR, JPY)
- Fallback to manual entry if not found

## Common Tasks

### Adding a New Component

1. Create in appropriate directory under `src/lib/components/`
2. Use Svelte 5 `$props()` for props
3. Use CSS with scoped styles and design system variables
4. Export from component file

### Adding a New Adapter

1. Create in `src/lib/adapters/{type}/`
2. Implement the interface from `src/lib/types/travel.ts`
3. Export adapter instance
4. Update relevant store/component to use new adapter

### Adding Transport with Auto Daily Items

Use `addTransportWithDailyItems()` to automatically create departure/arrival items:

```typescript
// Adds transport leg AND creates daily items on departure/arrival days
tripStore.addTransportWithDailyItems(tripId, transportLeg);
```

### Modifying State

All trip mutations go through `tripStore`:

```typescript
// Add a city
tripStore.addCity(tripId, { name: 'Paris', country: 'France', ... });

// Add activity to a day
tripStore.addDayItem(tripId, dayId, {
  kind: 'activity',
  activityId: 'act-123'
});

// Reorder items in a day
tripStore.reorderDayItems(tripId, dayId, newItemsOrder);
```

## Testing

Manual testing checklist:
- [ ] Create trip with multiple cities
- [ ] Add stays to each city (hotel, airbnb, hostel)
- [ ] Add activities and food venues
- [ ] Add flights with departure/arrival items auto-created
- [ ] Add train/bus transport
- [ ] Verify travel times between items
- [ ] Test color mode toggle (by-kind vs by-stay)
- [ ] Export to all formats (PDF, DOCX, JSON)
- [ ] Import from JSON
- [ ] Test on mobile viewport
- [ ] Test timezone display for flights

## Common Issues

### "Cannot find module" for .svelte.ts files
Ensure the file uses runes syntax and is imported correctly.

### State not updating
Check you're using `$state` and mutating the state object correctly, not reassigning.

### CSS not applying
Check variable names match those in `app.css`. Use browser DevTools to debug.

### Export failing
Ensure html2pdf.js and docx packages are installed. Check browser console for errors.

### Flight times showing wrong timezone
Verify `Location.timezone` is set correctly for origin/destination. Use IANA timezone names (e.g., 'America/New_York').

## Future Improvements

### Implemented ✅

1. **User Settings**
   - Home city preference
   - Default color scheme with custom palettes
   - Preferred map app (Google/Apple/System)
   - Temperature unit (celsius/fahrenheit/trip-location)
   - Distance unit (km/miles/trip-location)
   - Time format (12h/24h)
   - Auto-save settings (enabled, interval)
   - Transport mode preferences (disable specific modes)

2. **Trip Settings** (per-trip overrides)
   - Override user settings for specific trips
   - Custom color scheme per trip
   - Location-based unit resolution

3. **Real API Adapters**

   | Function | API | Documentation |
   |----------|-----|---------------|
   | City Search | Geoapify Geocoding | [apidocs.geoapify.com](https://apidocs.geoapify.com/docs/geocoding/) |
   | Geocoding | Geoapify Geocoding | Forward/reverse address lookup |
   | Timezone | Geoapify + TimezoneDB | IANA timezone from coordinates |
   | Food Venues | Foursquare Places | [docs.foursquare.com](https://docs.foursquare.com/) |
   | Attractions | Foursquare Places | 120M+ POIs globally |
   | Lodging Search | Foursquare Places | Hotels, hostels, etc. |
   | Place Details | Google Places | Hours, pricing, amenities |
   | Weather | Open-Meteo | Forecast and historical data |
   | Flights | AeroDataBox | Flight lookup by number |
   | Routing | OSRM | Travel time/distance |

### Near-term (Planned)

4. **Enhanced Features**
   - Packing list management
   - Budget tracking and spending
   - Photo/memory attachments
   - Notes and journal entries
   - Bike-friendly route preferences

5. **Google Maps Integration**
   - Accurate travel time calculations
   - Route visualization
   - Place autocomplete

### Long-term

6. **Collaborative Features**
   - Share trips with travel companions
   - Real-time collaborative editing
   - Comments and suggestions

7. **Mobile & Offline**
   - Progressive Web App (PWA)
   - Offline support with sync
   - Mobile-optimized UI

8. **Integrations**
   - Calendar sync (Google Calendar, iCal)
   - Email itinerary summaries
   - Travel document storage
