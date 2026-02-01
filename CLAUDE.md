# Travel Planner - AI Assistant Guide

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
  - `weather.ts` - Weather data from Open-Meteo
  - `flights.ts` - Flight data from AeroDataBox
  - `routing.ts` - Travel times from OSRM
- `$lib/api/` - Client-side API wrappers with in-memory caching

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weather` | Weather data (forecast, historical, predictions) |
| `GET /api/flights/search` | Flight route lookup |
| `GET /api/flights/airlines` | Airline search |
| `GET /api/routing` | Travel time/distance calculation |
| `GET /api/geocoding` | Forward/reverse geocoding (address ↔ coordinates) |
| `GET /api/cities` | City search with autocomplete and timezone |
| `GET /api/places/food` | Food venue search (restaurants, cafes, bars) |
| `GET /api/places/attractions` | Attraction search (museums, landmarks, parks) |

### Environment Variables

External APIs require the following environment variables:

| Variable | API | Required | Get Key At |
|----------|-----|----------|------------|
| `GEOAPIFY_API_KEY` | Geocoding, City Search | Yes | https://myprojects.geoapify.com/ |
| `FOURSQUARE_API_KEY` | Food, Attractions | Yes | https://foursquare.com/developers/ |
| `TIMEZONEDB_API_KEY` | Timezone (fallback) | No | https://timezonedb.com/ |
| `AERODATABOX_API_KEY` | Flights | Yes | https://rapidapi.com/aedbx-aedbx/api/aerodatabox |

All APIs have free tiers sufficient for development and moderate usage. Without API keys, adapters fall back to fake data.

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte          # Root layout, localStorage init
│   ├── +page.svelte             # Home - trip list
│   └── trip/[id]/
│       └── +page.svelte         # Trip itinerary view
├── lib/
│   ├── types/
│   │   └── travel.ts            # All TypeScript interfaces
│   ├── stores/
│   │   └── tripStore.svelte.ts  # Main trip state (Svelte 5 runes)
│   ├── adapters/
│   │   ├── cities/fakeAdapter.ts      # City search (real API + fallback)
│   │   ├── lodging/fakeAdapter.ts     # Hotel, Airbnb, VRBO, Hostel data
│   │   ├── food/fakeAdapter.ts        # Food venues (real API + fallback)
│   │   ├── attractions/fakeAdapter.ts # Attractions (real API + fallback)
│   │   ├── weather/fakeAdapter.ts     # Weather forecasts
│   │   └── transport/
│   │       ├── fakeAdapter.ts         # Travel time/cost estimates (mock)
│   │       ├── flightAdapter.ts       # Flight search
│   │       └── trainBusAdapter.ts     # Train/Bus search
│   ├── api/
│   │   ├── clientCache.ts             # Client-side caching utilities
│   │   ├── flightApi.ts               # Flight API client
│   │   ├── routingApi.ts              # Routing API client
│   │   ├── weatherApi.ts              # Weather API client
│   │   ├── geocodingApi.ts            # City search, address geocoding
│   │   └── placesApi.ts               # Food and attraction search
│   ├── services/
│   │   ├── storageService.ts    # localStorage persistence
│   │   ├── documentService.ts   # PDF/DOCX export
│   │   ├── geoService.ts        # Distance calculations
│   │   └── mapService.ts        # Google/Apple Maps links
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
│   │   │   ├── MoveItemModal.svelte
│   │   │   ├── TransportKindModal.svelte
│   │   │   ├── FlightSearchModal.svelte
│   │   │   └── TrainBusSearchModal.svelte
│   │   ├── itinerary/           # Day display components
│   │   │   ├── ItineraryDay.svelte
│   │   │   ├── DayHeader.svelte
│   │   │   └── ItemList.svelte
│   │   ├── items/               # Item cards
│   │   │   ├── StayCard.svelte
│   │   │   ├── ActivityCard.svelte
│   │   │   ├── FoodCard.svelte
│   │   │   └── TransportCard.svelte
│   │   ├── travel/              # Travel time/distance display
│   │   │   └── TravelMargin.svelte
│   │   ├── search/              # Autocomplete search
│   │   │   └── SearchAutocomplete.svelte
│   │   └── weather/             # Weather badges
│   │       └── WeatherBadge.svelte
│   └── utils/
│       ├── ids.ts               # ID generation
│       ├── dates.ts             # Date formatting, timezone handling
│       └── colors.ts            # Color utilities, stay segments
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

Most adapters now use real APIs with automatic fallback to fake data when APIs are unavailable or return no results. Server-side adapters (`$lib/server/adapters/`) handle external API calls with SQLite caching, while client-side wrappers (`$lib/api/`) provide in-memory caching and request deduplication.

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

## Transport Search

### Flight Search

`FlightAdapter` interface with:
- Airline autocomplete search
- Flight lookup by airline code + flight number + date
- Support for multi-day flights (arrival next day)
- Currency support (USD, EUR, JPY)
- Fallback to manual entry if not found

### Train/Bus Search

`TrainBusAdapter` interface with:
- Station/terminal data for major cities
- Route search by city and date
- Support for custom manual entry

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

### Near-term (Planned)

1. **User Settings** (type defined, needs UI)
   - Home city preference
   - Default color scheme
   - Preferred map app (Google/Apple)
   - Temperature unit (celsius/fahrenheit)
   - Distance unit (km/miles)
   - Time format (12h/24h)
   - Auto-save settings (enabled, interval)
   - **Bike preferences** (e.g., prefer bike-friendly routes, bike rental defaults)

2. **Trip Settings** (per-trip overrides)
   - Custom color palettes for the trip
   - Override user settings for specific trips
   - Default travel mode preferences
   - Budget tracking preferences

### Implemented

3. **Real API Adapters**

   The following real APIs replace fake adapters:

   | Function | API | Documentation |
   |----------|-----|---------------|
   | City Search | Geoapify Geocoding | [apidocs.geoapify.com](https://apidocs.geoapify.com/docs/geocoding/) |
   | Geocoding | Geoapify Geocoding | Forward/reverse address lookup |
   | Food Venues | Foursquare Places | [docs.foursquare.com](https://docs.foursquare.com/) |
   | Attractions | Foursquare Places | 120M+ POIs globally |
   | Timezone | Geoapify + TimezoneDB | IANA timezone from coordinates |
   | Weather | Open-Meteo | Forecast and historical data |
   | Flights | AeroDataBox | Flight lookup by number |
   | Routing | OSRM | Travel time/distance |

   **Note**: Lodging uses manual entry with address auto-geocoding rather than hotel APIs (which require business partnerships).

### Medium-term

4. **Google Maps Integration**
   - Accurate travel time calculations
   - Route visualization
   - Place autocomplete

5. **Enhanced Features**
   - Packing list management
   - Budget tracking and spending
   - Photo/memory attachments
   - Notes and journal entries

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
