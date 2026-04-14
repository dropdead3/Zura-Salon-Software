

## Problem

The S710 simulator's splash screen is a generic animated placeholder (gradient icon, generic layout). It doesn't match the actual splash screen shown on the physical device (screenshot reference: solid black background, centered "ZURA PAY" + "POWERED BY INTELLIGENCE" + divider + location name + footer). More critically, it's not wired to display the actual splash image that's been uploaded/generated via the Splash Screen Uploader.

## Plan

### 1. Wire the simulator to the actual splash screen data

**File: `CheckoutDisplayConcept.tsx`**
- Import `useTerminalSplashScreen`, `useTerminalLocations`, `useLocations` hooks
- Fetch the active splash screen URL for the first available terminal location
- Pass `splashImageUrl` prop down to `S710CheckoutSimulator`

### 2. Redesign the SplashScreen component to match reality

**File: `S710CheckoutSimulator.tsx`**

Add a new `splashImageUrl` prop to the simulator. The `SplashScreen` sub-component behavior changes:

- **If `splashImageUrl` is set**: Render the actual uploaded image as a full-bleed cover image inside the screen frame. No animations, no placeholder — just the real splash.
- **If no splash image**: Render a default that matches the actual canvas-generated design:
  - Solid black background (not the themed gradient)
  - Two subtle corner radial glows (top-left, bottom-right) using theme accent
  - "ZURA PAY" in Termina, centered
  - "POWERED BY INTELLIGENCE" subtitle
  - Thin accent-colored divider line
  - Location/business name below divider
  - Footer: Z icon + "POWERED BY ZURA" at bottom

This matches what the canvas generator produces (lines 220-301 of SplashScreenUploader) so the simulator preview is a faithful representation.

### 3. Update prop threading

**File: `S710CheckoutSimulator.tsx`**
- Add `splashImageUrl?: string | null` to `S710SimulatorProps`
- Pass through to `SplashScreen`

**File: `CheckoutDisplayConcept.tsx`**
- Pass `splashImageUrl` to the simulator component

### Technical details

- Files changed: `S710CheckoutSimulator.tsx`, `CheckoutDisplayConcept.tsx`
- The splash URL comes from the existing `useTerminalSplashScreen` hook's `splash_url` field
- Uses the first available location's terminal for the query (same pattern as `SplashScreenUploader`)
- The default (no-image) splash design mirrors the canvas generator's output for visual consistency
- The themed gradient background (`screenBg`) should still apply to other screens (idle, cart, tip) but splash uses solid black when showing the default design

