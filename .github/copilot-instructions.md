# GitHub Copilot Instructions - Travel Planner

## Project Overview

A travel itinerary planning application built with **SvelteKit 5** and **Svelte 5 runes**. Users can create multi-city trips, plan stays (hotel, airbnb, vrbo, hostel, custom), schedule activities and meals, book flights/trains/buses, and view day-by-day itineraries with travel time calculations.

> **For detailed architecture and API reference, see `CLAUDE.md`.**

## Tech Stack

- **Framework**: SvelteKit 5 with TypeScript
- **State Management**: Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Modern CSS with variables, nesting, container queries, `:has()`, `color-mix()`
- **Persistence**: localStorage (trips), SQLite (server cache)
- **Server**: Node.js with adapter-node
- **Export**: PDF (html2pdf.js), DOCX (docx library), JSON

## Critical: Svelte 5 Runes (NOT Traditional Stores)

**Always use Svelte 5 runes syntax. Never use legacy Svelte stores.**

```typescript
// ✅ CORRECT - Svelte 5 runes
let state = $state<TripStoreState>({ trips: [], currentTripId: null });
const currentTrip = $derived(state.trips.find(t => t.id === state.currentTripId));

// ❌ WRONG - Legacy stores (DO NOT USE)
import { writable, derived } from 'svelte/store';
```

## Component Props Pattern

Use `$props()` for component props:

```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
  }
  let { title, count = 0 }: Props = $props();
</script>
```

## TypeScript Discriminated Unions

Stay types use discriminated unions with a `type` field:

```typescript
type Stay = HotelStay | AirbnbStay | VrboStay | HostelStay | CustomStay;
```

Daily items use discriminated unions with a `kind` field:

```typescript
type DailyItem = StayDailyItem | ActivityDailyItem | FoodDailyItem | TransportDailyItem;
```

Use type guards (`isStayItem`, `isActivityItem`, `isFoodItem`, `isTransportItem`) for narrowing.

## Transport Modes

Supports 10 transport modes:

```typescript
type TransportMode = 'flight' | 'train' | 'bus' | 'car' | 'taxi' | 'rideshare' | 'ferry' | 'subway' | 'walking' | 'biking';
```

Use `addTransportWithDailyItems()` to automatically create departure/arrival items:

```typescript
tripStore.addTransportWithDailyItems(tripId, transportLeg);
```

## CSS Conventions

- Use CSS custom properties: `--space-4`, `--color-primary`
- Use oklch color space with `color-mix()` for variations
- Use container queries for component-level responsiveness
- Use CSS nesting for related selectors

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

## State Mutations

All trip mutations go through `tripStore`:

```typescript
tripStore.addCity(tripId, { name: 'Paris', country: 'France', ... });
tripStore.addDayItem(tripId, dayId, { kind: 'activity', activityId: 'act-123' });
tripStore.reorderDayItems(tripId, dayId, newItemsOrder);
tripStore.addTransportWithDailyItems(tripId, transportLeg);
```

Settings mutations go through `settingsStore`:

```typescript
settingsStore.updateSettings({ theme: 'dark' });
```

## Key File Locations

| Purpose | Location |
|---------|----------|
| Core travel types | `src/lib/types/travel.ts` |
| Settings types | `src/lib/types/settings.ts` |
| Trip state | `src/lib/stores/tripStore.svelte.ts` |
| Settings state | `src/lib/stores/settingsStore.svelte.ts` |
| UI primitives | `src/lib/components/ui/` |
| Item cards | `src/lib/components/items/` |
| Settings UI | `src/lib/components/settings/` |
| Feature modals | `src/lib/components/modals/` |
| Global styles | `src/app.css` |
| Client API wrappers | `src/lib/api/` |
| Server adapters | `src/lib/server/adapters/` |

## Adapter Pattern

Adapters use real APIs (Geoapify, Foursquare, AeroDataBox, etc.). Server-side adapters (`$lib/server/adapters/`) handle external API calls with SQLite caching. Client-side wrappers (`$lib/api/`) provide in-memory caching.

## Common Pitfalls to Avoid

1. **Don't use legacy Svelte stores** - Use `$state` and `$derived` runes
2. **Don't reassign state** - Mutate the state object instead
3. **Don't forget type guards** - Use them when working with discriminated unions
4. **Don't hardcode colors** - Use CSS custom properties from `app.css`
5. **Don't forget timezone handling** - Use IANA timezone names (e.g., 'America/New_York')
