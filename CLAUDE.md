# Travel Planner - AI Assistant Guide

This document helps AI assistants understand and work with this travel planner codebase effectively.

## Project Overview

A travel itinerary planning application built with **SvelteKit 5** and **Svelte 5 runes**. Users can create multi-city trips, plan stays (hotel, airbnb, vrbo, address), schedule activities and meals, and view day-by-day itineraries with travel time calculations.

## Tech Stack

- **Framework**: SvelteKit 5 with TypeScript
- **State Management**: Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Modern CSS with variables, nesting, container queries, `:has()`, `color-mix()`
- **Persistence**: localStorage with debounced auto-save
- **Export**: PDF (html2pdf.js), DOCX (docx library), JSON

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
│   ├── adapters/                # Data fetching abstraction
│   │   ├── lodging/fakeAdapter.ts
│   │   ├── food/fakeAdapter.ts
│   │   ├── attractions/fakeAdapter.ts
│   │   ├── weather/fakeAdapter.ts
│   │   └── transport/fakeAdapter.ts
│   ├── services/
│   │   ├── storageService.ts    # localStorage persistence
│   │   ├── documentService.ts   # PDF/DOCX export
│   │   ├── geoService.ts        # Distance calculations
│   │   └── mapService.ts        # Google/Apple Maps links
│   ├── components/
│   │   ├── ui/                  # Reusable UI primitives
│   │   ├── itinerary/           # Day display components
│   │   ├── items/               # Item cards (Stay, Activity, Food, Transport)
│   │   ├── travel/              # Travel time/distance display
│   │   ├── search/              # Autocomplete search
│   │   └── weather/             # Weather badges
│   └── utils/
│       ├── ids.ts               # ID generation
│       ├── dates.ts             # Date formatting
│       └── colors.ts            # Color utilities
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
  search(query: string, location: GeoLocation): Promise<Stay[]>;
  getById(id: string): Promise<Stay | null>;
}
```

Currently using fake adapters with mock data. To add real APIs, create new adapters implementing the same interface.

### TypeScript Discriminated Unions

Stay types use discriminated unions:

```typescript
type Stay = HotelStay | AirbnbStay | VrboStay | HostelStay | CustomStay;

interface HotelStay extends StayBase {
  type: 'hotel';
  starRating?: 1 | 2 | 3 | 4 | 5;
  // hotel-specific fields
}
```

Use type guards (`isStayItem`, `isActivityItem`, etc.) for narrowing.

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
  id: string;
  name: string;
  homeCity: Location;
  startDate: string;        // ISO date
  endDate: string;
  cities: City[];
  activities: Activity[];
  foodVenues: FoodVenue[];
  transportLegs: TransportLeg[];
  itinerary: ItineraryDay[];
  colorScheme: ColorScheme;
}
```

### ItineraryDay

```typescript
interface ItineraryDay {
  id: string;
  date: string;
  dayNumber: number;
  title?: string;
  cityIds: string[];    // Which cities this day spans
  items: DailyItem[];   // Ordered list of items
}
```

### DailyItem (Discriminated Union)

```typescript
type DailyItem = StayDailyItem | ActivityDailyItem | FoodDailyItem | TransportDailyItem;

interface StayDailyItem {
  id: string;
  kind: 'stay';
  stayId: string;
  time?: string;
  isCheckIn?: boolean;
  isCheckOut?: boolean;
}
```

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
4. Update relevant store to use new adapter

### Adding a New Route

1. Create directory under `src/routes/`
2. Add `+page.svelte` for the page
3. Use `$page` from `$app/stores` for route params
4. Import tripStore for state access

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

## Color Coding

Two modes available:
1. **By Kind**: Each item type has a color (stays purple, activities green, food orange, transport blue)
2. **By Stay**: Items colored by which stay they belong to (useful for tracking belongings)

Colors defined in `src/lib/utils/colors.ts` using oklch color space.

## Testing

Manual testing checklist:
- [ ] Create trip with multiple cities
- [ ] Add stays to each city
- [ ] Add activities and food venues
- [ ] Verify travel times between items
- [ ] Test color mode toggle
- [ ] Export to all formats (PDF, DOCX, JSON)
- [ ] Import from JSON
- [ ] Test on mobile viewport

## Common Issues

### "Cannot find module" for .svelte.ts files
Ensure the file uses runes syntax and is imported correctly.

### State not updating
Check you're using `$state` and mutating the state object correctly, not reassigning.

### CSS not applying
Check variable names match those in `app.css`. Use browser DevTools to debug.

### Export failing
Ensure html2pdf.js and docx packages are installed. Check browser console for errors.

## Future Improvements

Areas planned for enhancement:
1. Real API adapters for lodging, food, attractions
2. Google Maps integration for accurate travel times
3. Collaborative trip planning
4. Mobile app with offline support
5. Calendar integration
