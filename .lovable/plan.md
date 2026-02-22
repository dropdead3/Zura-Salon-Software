
# Add Stylist Badge to Appointment Cards

## Overview

Add a compact stylist avatar/initials badge in the top-right corner of appointment cards across DayView, WeekView, and AgendaView. Hovering the badge shows a tooltip with the primary stylist name and any assistants.

## What Changes

### 1. DayView Cards (`src/components/dashboard/schedule/DayView.tsx`)

**Top-right badge (replaces current drag handle position):**
- Add a stylist initials badge positioned `absolute top-0.5 right-0.5` (z-10) using a small circle with the stylist's first-name initial(s)
- Uses the stylist's `photo_url` if available (tiny Avatar), otherwise falls back to initials in a muted circle
- On compact cards (duration < 30min): hide the badge to preserve space
- On non-compact cards: always visible
- Move the existing drag handle (`GripVertical`) to appear on hover to the left of the badge, or shift it slightly

**Hover tooltip on the badge:**
- Primary stylist: `User` icon + stylist display name
- If assistants present: `Users` icon + "w/ AssistantName1, AssistantName2"

**Remove inline stylist/assistant text lines** (lines 480-491) from the card body on non-compact cards, since this info moves to the badge tooltip. This reclaims vertical space for services.

### 2. WeekView Cards (`src/components/dashboard/schedule/WeekView.tsx`)

Same pattern:
- Add stylist initials badge at `absolute top-0.5 right-0.5` on medium and full-size cards
- Tooltip with stylist + assistant names on hover
- Compact cards: no badge (too small)

### 3. AgendaView Cards (`src/components/dashboard/schedule/AgendaView.tsx`)

AgendaView has more horizontal space, so:
- Add a stylist avatar chip in the top-right area (within the existing flex layout at line 127)
- Include assistant info inline with a `Users` icon
- Tooltip on the avatar shows full stylist name + role + assistants

### 4. Visual Design

- Badge: `h-5 w-5` circle, `absolute top-1 right-1 z-10`
- Background: `bg-muted/80 backdrop-blur-sm` with `text-[8px] font-medium`
- If `photo_url` exists: use Avatar component at same size
- Tooltip content structured as:
  - Line 1: `User` icon + Stylist name (primary)
  - Line 2 (conditional): `Users` icon + "w/ Assistant1, Assistant2"
- Color: muted foreground, no bold weights

## Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/schedule/DayView.tsx` | Add stylist badge top-right with tooltip; remove inline stylist/assistant text from card body |
| `src/components/dashboard/schedule/WeekView.tsx` | Add stylist badge top-right with tooltip |
| `src/components/dashboard/schedule/AgendaView.tsx` | Add stylist avatar chip with tooltip in top-right area |
