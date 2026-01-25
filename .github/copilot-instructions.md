# GitHub Copilot Instructions - Travel Planner

## Project Overview

A travel itinerary planning application built with **SvelteKit 5** and **Svelte 5 runes**. Users can create multi-city trips, plan stays, schedule activities and meals, and view day-by-day itineraries with travel time calculations.

## Tech Stack

- **Framework**: SvelteKit 5 with TypeScript
- **State Management**: Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Modern CSS with variables, nesting, container queries, `:has()`, `color-mix()`
- **Persistence**: localStorage with debounced auto-save
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

Use type guards (`isStayItem`, `isActivityItem`, etc.) for narrowing.

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

## Adapter Pattern

Data fetching uses adapters with consistent interfaces:

```typescript
interface LodgingAdapter {
  search(query: string, location: GeoLocation): Promise<Stay[]>;
  getById(id: string): Promise<Stay | null>;
}
```

Adapters are in `src/lib/adapters/{type}/`. Currently using fake adapters with mock data.

## State Mutations

All trip mutations go through `tripStore`:

```typescript
tripStore.addCity(tripId, { name: 'Paris', country: 'France', ... });
tripStore.addDayItem(tripId, dayId, { kind: 'activity', activityId: 'act-123' });
tripStore.reorderDayItems(tripId, dayId, newItemsOrder);
```

## Key File Locations

| Purpose | Location |
|---------|----------|
| TypeScript interfaces | `src/lib/types/travel.ts` |
| Main trip state | `src/lib/stores/tripStore.svelte.ts` |
| UI primitives | `src/lib/components/ui/` |
| Item cards | `src/lib/components/items/` |
| Global styles | `src/app.css` |
| Utilities | `src/lib/utils/` |
| Services | `src/lib/services/` |

## Color Coding System

Two modes:
1. **By Kind**: Item types have colors (stays purple, activities green, food orange, transport blue)
2. **By Stay**: Items colored by which stay they belong to

Colors defined in `src/lib/utils/colors.ts` using oklch color space.

## Common Pitfalls to Avoid

1. **Don't use legacy Svelte stores** - Use `$state` and `$derived` runes
2. **Don't reassign state** - Mutate the state object instead
3. **Don't forget type guards** - Use them when working with discriminated unions
4. **Don't hardcode colors** - Use CSS custom properties from `app.css`
