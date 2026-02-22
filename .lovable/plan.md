
# Improve Service Ordering and Layout on Appointment Cards

## What Changes

### 1. Service ordering logic (in `appointment-card-utils.ts`)

Update `formatServicesWithDuration` to sort services before rendering:

1. **Primary services first**, ordered by duration longest-to-shortest
2. **Add-ons/Extras last**, ordered by price highest-to-lowest
3. Add-on detection: Any service whose category is "Extras" (identified via `serviceLookup`)

Currently the function just maps over comma-split names in their original order. The new version will sort using the `serviceLookup` map to access `duration_minutes`, `price`, and `category`.

### 2. Multi-service color band ordering (in `DayView.tsx` and `WeekView.tsx`)

The `serviceBands` memo already sorts by duration descending -- this is correct for primary services. Update to also push "Extras" category bands to the bottom of the card, so the visual band layout matches the text ordering.

### 3. Per-service time-slot positioning on cards (DayView only)

For non-compact cards with enough vertical space (duration >= 60min), render each service name at its corresponding vertical position within the card. This means:

- Calculate each service's start offset relative to the appointment start
- Position each service label at the proportional vertical point within the card
- Fall back to the current stacked list when the card is too short

This gives users an at-a-glance view of which service covers which time segment.

## Technical Details

### `appointment-card-utils.ts`

New function: `sortAndFormatServices(serviceName, serviceLookup)` that returns a sorted array of `{ name, duration, price, category, isExtra }` objects. The existing `formatServicesWithDuration` will use this sorted array internally.

### `DayView.tsx` changes (lines ~242-263, ~458-460)

- Update `serviceBands` memo to use the new sort order (primary by duration desc, extras by price desc, extras always last)
- For non-compact cards (duration >= 60min), render service names as absolutely-positioned labels within the card at their proportional vertical offset, instead of a single truncated line

### `WeekView.tsx` changes (lines ~128-150, ~265, ~281)

- Same `serviceBands` sort update
- Same text ordering update for the service line

### Files Modified

| File | Change |
|------|--------|
| `src/lib/appointment-card-utils.ts` | Add `sortServices` helper; update `formatServicesWithDuration` to use sorted order |
| `src/components/dashboard/schedule/DayView.tsx` | Update band sort; add per-service positioned labels on tall cards |
| `src/components/dashboard/schedule/WeekView.tsx` | Update band sort; use sorted service display |
