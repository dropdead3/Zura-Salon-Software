

# AgendaView Parity + Card Enhancements (New Client Badge, Per-Service Duration, Price, Client Avatar)

## Overview

Five enhancements to appointment cards across all calendar views, with AgendaView as the primary focus for parity with DayView/WeekView.

## Changes

### 1. AgendaView Parity -- Phone, Stylist, Assistant, Category Color

**File:** `src/components/dashboard/schedule/AgendaView.tsx`

- Add props: `assistantNamesMap`, `serviceLookup`, `colorBy`, and category color map
- Import `formatPhoneDisplay` from `@/lib/utils` and replace raw `appointment.client_phone` display with formatted output
- Stylist name is already rendered (lines 111-121) -- no change needed
- Show assistant names: when `assistantNamesMap` has entries for the appointment, render "w/ AssistantName" below the stylist row
- Add a small category color swatch (8px circle) next to the vertical status divider, using the service lookup to resolve category colors
- Import `useServiceCategoryColorsMap` and `getCategoryColor` for color resolution

**File:** `src/pages/dashboard/Schedule.tsx`

- Pass `assistantNamesMap`, `serviceLookup`, and `colorBy` to `AgendaView` (currently only passed to DayView/WeekView)

### 2. New Client Badge

**Files:** `DayView.tsx`, `WeekView.tsx`, `AgendaView.tsx`

The `is_new_client` field exists on `PhorestAppointment` and is already fetched.

- On non-compact DayView/WeekView cards: render a small "NEW" chip (`text-[8px] px-1 py-px rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`) next to the client name
- On compact cards: render a small star icon (`Star` from lucide, h-2.5 w-2.5, amber color) to save space
- On AgendaView: render a "NEW" badge next to the client name in the header row
- Condition: `appointment.is_new_client === true`

### 3. Per-Service Duration Display

**Files:** `DayView.tsx`, `WeekView.tsx`, `AgendaView.tsx`

For multi-service appointments, replace the plain comma-separated service name with individual durations when space allows.

- Parse `service_name` by comma, look up each in `serviceLookup` for duration
- On non-compact DayView cards (duration >= 45min): render "Haircut 60min + Glaze 30min" format
- On WeekView medium/large cards: same treatment
- On AgendaView: always show per-service duration since there is more horizontal space
- Single-service appointments: no change (show service name only, duration already visible in the time column)
- Fallback: if a service is not found in the lookup map, show just the name without duration

### 4. Price on Card

**Files:** `DayView.tsx`, `WeekView.tsx`, `AgendaView.tsx`

The `total_price` field exists on `PhorestAppointment`.

- On non-compact DayView cards (duration >= 60min): show formatted price in the bottom-right corner using `useFormatCurrency` hook, wrapped in `BlurredAmount` for privacy toggle support
- On WeekView large cards: same treatment
- On AgendaView: show price next to the status badge (right-aligned)
- Condition: `appointment.total_price != null && appointment.total_price > 0`
- Import `useFormatCurrency` from `@/hooks/useFormatCurrency`

### 5. Client Avatar Initials

**Files:** `DayView.tsx`, `WeekView.tsx`, `AgendaView.tsx`

- On non-compact DayView cards: add a tiny avatar circle (h-5 w-5) with client initials before the client name
- On AgendaView: already has an avatar-like structure; add initials circle (h-7 w-7) at the start of the main content area
- On WeekView medium/large cards: add h-4 w-4 initials circle
- Initials extraction: first character of first name + first character of last name (split by space)
- Colors: use a deterministic color based on client name hash (modulo a set of 8 muted background colors) for visual scanning variety
- Compact cards: skip avatar to preserve space

## Tooltip Updates

All three views' tooltips will be updated to include:
- New client indicator ("New Client" label)
- Per-service durations
- Total price (formatted)

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/AgendaView.tsx` -- full parity + all 5 enhancements |
| Modify | `src/components/dashboard/schedule/DayView.tsx` -- new client badge, per-service duration, price, avatar |
| Modify | `src/components/dashboard/schedule/WeekView.tsx` -- new client badge, per-service duration, price, avatar |
| Modify | `src/pages/dashboard/Schedule.tsx` -- pass missing props to AgendaView |

No new files, no database changes, no new dependencies.

