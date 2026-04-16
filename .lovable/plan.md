

# Shrink-on-Hover Appointment Cards for Double-Booking

## Problem
Appointment cards fill the entire time slot width, blocking clicks on the underlying time slot. This makes it impossible to double-book by clicking the same time slot when an appointment already exists.

## Solution
Add a right-edge hover zone to each appointment card. When the user hovers near the right edge (~20% of card width), the card shrinks to ~75% width from the left, revealing the clickable time slot behind it. A subtle visual indicator (thin vertical line or grip dots) appears on the right edge to hint at this behavior.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Add hover state to `AppointmentCard`
- Track `isHoveredRight` state via `onMouseMove` / `onMouseLeave`
- When mouse is in the rightmost ~24px of the card, set `isHoveredRight = true`
- Apply a CSS transition: `width` shrinks from `calc(${widthPercent}% - 4px)` to `calc(${widthPercent * 0.7}% - 4px)` with a smooth `transition: width 200ms ease`
- Add `pointer-events: none` would NOT work here — instead we let the smaller card reveal the slot underneath

### 2. Visual affordance
- When hovering, show a subtle grip indicator (2-3 small dots or a thin vertical bar) on the right edge of the card to signal the shrink zone
- The card maintains its full click area for opening the appointment detail when clicking on the card body itself

### 3. Implementation detail
- Use `onMouseMove` with `getBoundingClientRect()` to detect right-edge proximity
- `onMouseLeave` resets the shrink state
- The drag overlay card (`isDragOverlay`) skips this behavior
- Transition uses `transition-all duration-200 ease-out` for smooth animation
- The z-index stays the same — the slot behind naturally becomes clickable when the card shrinks away

### 4. Also apply to `WeekView.tsx`
- Same hover-shrink pattern on `WeekAppointmentCard` for consistency

Single interaction pattern, two file changes, no new dependencies.

