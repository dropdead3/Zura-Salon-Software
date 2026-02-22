

# Fix: Wire Appointment Cards to Service Category Colors + Multi-Service Color Banding

## Root Cause (Why the card is solid green)

Two issues combine to produce the wrong color:

1. **`color_by` is stuck on `'status'`** -- The existing user's `calendar_preferences` row still has `color_by: 'status'` from before we changed the default. So confirmed appointments render with the green status color, not service category colors.

2. **`service_category` is never set on new bookings** -- The `create-phorest-booking` edge function builds the appointment record but never includes `service_category` in the insert. It is always NULL. Even if `color_by` were `'service'`, the lookup would hit the fallback gray color.

## Multi-Service Color Banding (New Feature)

For appointments with multiple services (e.g., "Glaze Add On, Signature Haircut"), the card should display stacked color bands proportional to each service's duration, sorted largest-to-smallest from top to bottom.

The data needed (category + duration per service) already exists in `phorest_services` and can be resolved at render time.

## Changes

### 1. Update existing user's calendar preference

Run a data fix to set `color_by = 'service'` for existing users who still have `'status'`.

### 2. Fix edge function to set `service_category` on new bookings

**File:** `supabase/functions/create-phorest-booking/index.ts`

- When fetching service details (line 214-217), also select `category`
- If all services share the same category, set `service_category` to that value
- If mixed categories, set `service_category` to the category of the longest-duration service (primary category)

### 3. Create a service lookup hook for render-time category resolution

**File:** `src/hooks/useServiceLookup.ts` (new)

- Fetches all active services from `phorest_services` with `name`, `category`, `duration_minutes`
- Returns a Map keyed by service name for O(1) lookup
- Used by appointment cards to resolve per-service categories when `service_category` is null or when multi-service banding is needed

### 4. Update DayView AppointmentCard to support multi-service color banding

**File:** `src/components/dashboard/schedule/DayView.tsx`

- Accept the service lookup map as a prop
- Parse `service_name` by comma to get individual service names
- Look up each service's category and duration from the lookup map
- Sort by duration descending (biggest block on top)
- Render stacked color bands as absolutely-positioned divs within the card, each sized proportionally to its share of total duration
- Text content overlays the bands (positioned with z-index above the bands)
- Single-service appointments continue to render as a solid color (no visual change)

### 5. Update WeekView AppointmentCard with the same banding logic

**File:** `src/components/dashboard/schedule/WeekView.tsx`

- Same multi-service color banding as DayView
- For very compact cards (under 30min), skip banding and use the primary service's color

### 6. Fix null `service_category` on existing appointments

Run a data fix to update the two Eric Day appointments with the correct `service_category` based on their services.

### 7. Pass service lookup from Schedule page

**File:** `src/pages/dashboard/Schedule.tsx`

- Call `useServiceLookup()` and pass the result to DayView and WeekView

## Visual Behavior

For a 90-minute appointment with "Signature Haircut" (60min, Haircuts category) and "Glaze Add On" (30min, Color category):

```text
+---------------------------+
|  Haircuts color (67%)     |  <- light blue (#e0f2fe)
|  Client Name, Phone       |
|                           |
|---------------------------|
|  Color color (33%)        |  <- pink (#fbcfe8)
|  12:00 PM - 1:30 PM       |
+---------------------------+
```

- Biggest time block on top, smallest on bottom
- Text overlays all bands with a subtle text-shadow for readability
- Single-service appointments show a single solid color (unchanged behavior)

## File Summary

| Action | File |
|--------|------|
| Data fix | Update `calendar_preferences` to `color_by = 'service'` for existing users |
| Data fix | Update Eric Day appointments with correct `service_category` |
| Modify | `supabase/functions/create-phorest-booking/index.ts` -- set `service_category` from service data |
| Create | `src/hooks/useServiceLookup.ts` -- service name to category/duration lookup |
| Modify | `src/pages/dashboard/Schedule.tsx` -- pass service lookup to views |
| Modify | `src/components/dashboard/schedule/DayView.tsx` -- multi-service color banding |
| Modify | `src/components/dashboard/schedule/WeekView.tsx` -- multi-service color banding |
