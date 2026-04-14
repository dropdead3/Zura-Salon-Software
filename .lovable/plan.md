

# Add "Powered by Zura" Footer & Organization Logo on Welcome Screen

## Problem
The simulator screens lack platform attribution and don't show the organization's logo on the welcome/idle screen — missing both branding hierarchy and partnership identity.

## Changes

### 1. Pass Organization Logo to Simulator
**File:** `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx`

- Import `useBusinessSettings` hook
- Extract `logo_dark_url` from business settings (dark variant since the simulator has a dark background)
- Pass it as a new `orgLogoUrl` prop to `S710CheckoutSimulator`

### 2. Update Simulator Component
**File:** `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx`

**Add `orgLogoUrl?: string | null` prop** to the interface.

**Splash Screen** — Replace the generic CreditCard icon box with the org logo:
- If `orgLogoUrl` exists, render an `<img>` with the logo (max height ~48px, object-contain)
- If no org logo, keep the existing CreditCard icon as fallback
- Keep "ZURA PAY" title and "Powered by Intelligence" tagline

**Idle (Welcome) Screen** — Show org logo above the business name:
- If `orgLogoUrl` exists, render `<img>` (max height ~40px) above the "Welcome to" text
- If no org logo, keep current text-only layout

**"Powered by Zura" footer** — Add a persistent footer at the bottom of every screen:
- Replace the current `Zura Pay` text at line 386 with a layout containing the Zura "Z" icon (import `ZuraZIcon`) + "Powered by Zura" text
- Style: `text-white/20 text-[7px]` with the Z icon at ~8px, matching the existing minimal footer treatment
- Use `PLATFORM_NAME` token from `brand.ts` for the text

### 3. ZuraPayDisplayTab — Thread Logo Prop
**File:** `src/components/dashboard/settings/terminal/ZuraPayDisplayTab.tsx`

- Import `useBusinessSettings`
- Pass `orgLogoUrl={business?.logo_dark_url}` to `CheckoutDisplayConcept`
- Thread it through to the simulator

## Technical Notes
- `logo_dark_url` is the correct variant since the simulator background is near-black (`#0a0a0c`)
- Falls back gracefully if no org logo is configured — existing CreditCard icon remains
- Uses `PLATFORM_NAME` token, not hardcoded "Zura"
- `ZuraZIcon` is already a reusable SVG component with `currentColor` fill

