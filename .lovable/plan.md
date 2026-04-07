

# Disable Scroll-Wheel Value Changes on Number Inputs

## Problem

When scrolling a page that contains `<input type="number">`, the browser natively increments/decrements the value if the input is focused. This hijacks the scroll and changes data unintentionally.

## Fix

Add an `onWheel` handler to the base `Input` component that calls `e.currentTarget.blur()` when `type="number"`. This is the standard React pattern — it defocuses the input on wheel events so the browser doesn't adjust the value, and normal page scrolling continues uninterrupted.

Also apply the same fix to `PlatformInput` for consistency.

## Changes

| File | Change |
|------|--------|
| `src/components/ui/input.tsx` | Add `onWheel` handler that blurs number inputs on scroll |
| `src/components/platform/ui/PlatformInput.tsx` | Same fix |

Single-line addition in each file — no database or logic changes.

