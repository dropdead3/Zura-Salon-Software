

# Enhance Checkout Display Tab — Interactivity, Responsiveness, Visual Polish

## Overview

Three improvements to the Display tab: let users customize the simulator content, make the layout stack properly on narrow widths, and tighten visual hierarchy.

## Changes

### 1. Add Interactivity — Editable Cart Items & Business Name
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

- Add local state for `cartItems` array (pre-populated with current defaults)
- Add an "Edit Cart" toggle that reveals inline editable fields for item labels and amounts
- Add/remove item buttons
- Business name is already passed as a prop — add an inline editable field so users can preview different names on the simulator in real-time
- All changes are preview-only (no persistence) — clarify with a subtle "Preview only" label

### 2. Responsive Stacking
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

The layout already uses `flex-col lg:flex-row` (line 46), but at the user's 1260px viewport with sidebar, the `lg` breakpoint (1024px content) may not trigger. Change to `md:flex-row` so it stacks below ~768px content width but stays side-by-side at the current viewport. Also center the simulator when stacked.

### 3. Visual Polish
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

- Add stage indicator dots below the simulator (showing which of the 7 screens is active) for better orientation during auto-play
- Tighten the specs panel spacing and add subtle hover states on capability pills
- Add a thin progress bar at the bottom of the device frame showing auto-play timing

### 4. Stage Indicator in Simulator
**File:** `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx`

- Export `currentIndex` / `screens.length` or accept an `onScreenChange` callback so the parent can render stage dots
- Alternatively, render the dots inside the simulator component itself below the device frame

## Technical Notes

- No new dependencies needed
- Editable cart uses controlled `useState` with `Input` components from the existing UI library
- `fmt()` utility already handles cents-to-dollars formatting
- All changes are contained to two files in the terminal settings directory

