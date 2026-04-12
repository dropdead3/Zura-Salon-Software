

# Booking Surface Embed Architecture — Build Plan

## Current State

The system already has:
- **11 client-facing components** in `src/components/booking-surface/` (HostedBookingPage, service browser, stylist picker, date picker, client form, confirmation, flow progress, header, theme provider, location picker)
- **9 admin components** in `src/components/dashboard/booking-surface/` (mode selector, theme editor, flow configurator, hosted page editor, live preview, publish bar, link configurator, embed code generator)
- **Config hook** (`useBookingSurfaceConfig`) storing config in `site_settings` as JSON
- **Public route** at `/book/:orgSlug` rendering `HostedBookingPage`
- **Embed code generator** producing inline/modal/popup/iframe snippets (referencing a non-existent `embed.js`)

## What's Missing

The current system generates embed snippets that reference an `embed.js` loader that doesn't exist. There is no actual embeddable widget runtime, no style isolation, no cross-origin messaging, no embed-mode rendering, no booking session state abstraction, and no public bootstrap endpoint. The booking flow state is scattered across `useState` calls in `HostedBookingPage` rather than a reusable engine.

## Build Scope

### 1. Booking Session State Engine
Extract all booking state from `HostedBookingPage` into a shared `useBookingSession` hook that both hosted page and embedded widget consume.

**File**: `src/hooks/useBookingSession.ts`

Manages: selectedLocation, selectedService, selectedCategory, selectedStylist, selectedDate, selectedTime, clientInfo, currentStep, direction, isConfirmed. Provides: goNext, goBack, reset, applyDeepLinks. Accepts flow template to determine step sequence.

### 2. Embed-Aware Hosted Page
Update `HostedBookingPage` to detect `?embed=true` query param and render in embed mode (no header, no policy footer, no powered-by, compact padding). This makes the iframe fallback actually work.

**File**: `src/components/booking-surface/HostedBookingPage.tsx` — UPDATE

### 3. Embed Loader Script
Create a standalone vanilla JS embed loader that external sites include via `<script>` tag. Uses iframe-based embedding (most robust for third-party sites — avoids CSS conflicts entirely).

**File**: `public/embed.js` — CREATE

Responsibilities:
- Reads `data-zura-org`, `data-zura-mode` (inline|modal), `data-zura-*` preselection attributes from the script tag
- For **inline mode**: creates a responsive iframe in `#zura-booking` container pointing to `/book/{org}?embed=true&{params}`
- For **modal mode**: exposes `window.ZuraBooking.open()`, creates overlay + iframe on demand
- Listens for `postMessage` from iframe for height resize and booking completion
- Lightweight (~3KB), no framework dependencies

### 4. PostMessage Contract
Add postMessage dispatching inside the booking flow so the embed loader can react.

**File**: `src/lib/booking-embed-messages.ts` — CREATE

Message types: `ZURA_BOOKING_READY`, `ZURA_BOOKING_RESIZE`, `ZURA_BOOKING_STEP_CHANGE`, `ZURA_BOOKING_COMPLETE`, `ZURA_BOOKING_ERROR`, `ZURA_MODAL_CLOSE`

**Integration**: `HostedBookingPage` dispatches these messages when in embed mode via `window.parent.postMessage()`.

### 5. Auto-Resize Observer
In embed mode, attach a `ResizeObserver` to the booking root that posts height changes to the parent window, eliminating scroll-in-scroll.

Integrated into `HostedBookingPage` when `embed=true`.

### 6. Updated Embed Code Generator
Fix the admin snippet generator to produce working snippets that reference the real `embed.js` path and use correct `data-*` attributes.

**File**: `src/components/dashboard/booking-surface/EmbedCodeGenerator.tsx` — UPDATE

Snippets will reference `{origin}/embed.js` with proper data attributes (`data-zura-org`, `data-zura-mode`). Deep link configurator links will be reflected in generated snippets when preselections are set.

### 7. Config Model Extension
Add missing fields to `BookingSurfaceConfig` type for embed-specific settings.

**File**: `src/hooks/useBookingSurfaceConfig.ts` — UPDATE

Add to config: `allowedEmbedTypes: ('inline'|'modal'|'popup'|'iframe')[]` and deep link permission flags (`allowServicePreselect`, `allowStylistPreselect`, etc.). Add `version`, `publishedAt`, `updatedAt` metadata fields.

## Architecture Decision: iframe Over Shadow DOM

Using iframe-based embedding rather than Shadow DOM because:
- Complete style isolation without CSS leakage in either direction
- Works on all host sites regardless of framework
- The booking app already runs as a full React app — mounting it inside Shadow DOM would require significant rearchitecting
- postMessage provides clean cross-origin communication
- iframe fallback and script embed share the same rendering path

The embed loader script creates and manages the iframe, handling resize, modal overlay, and deep linking — making it feel native despite being an iframe.

## Files Summary

| File | Action |
|---|---|
| `src/hooks/useBookingSession.ts` | CREATE — shared booking state machine |
| `src/lib/booking-embed-messages.ts` | CREATE — postMessage type definitions + helpers |
| `public/embed.js` | CREATE — lightweight embed loader script |
| `src/components/booking-surface/HostedBookingPage.tsx` | UPDATE — embed mode, use session hook, postMessage dispatch |
| `src/hooks/useBookingSurfaceConfig.ts` | UPDATE — add embed config fields |
| `src/components/dashboard/booking-surface/EmbedCodeGenerator.tsx` | UPDATE — working snippets with real embed.js |

## Build Order

1. Create `booking-embed-messages.ts` (message types)
2. Create `useBookingSession.ts` (extract state from HostedBookingPage)
3. Update `useBookingSurfaceConfig.ts` (add embed fields)
4. Update `HostedBookingPage.tsx` (embed mode + session hook + postMessage)
5. Create `public/embed.js` (embed loader)
6. Update `EmbedCodeGenerator.tsx` (correct snippets)
7. TypeScript build check

