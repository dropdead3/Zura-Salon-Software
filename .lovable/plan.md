# Claim Offer — Full Loop Closure (Preview + Live + Consultation Policy)

## What you confirmed

1. **Schedule a consultation** = a real popup destination, but **only** surfaces in the editor when the org has set "new clients must consult first" as a policy.
2. **Custom URL destination** = yes, with operator-authored "how to claim" instructions on the booking page.
3. **CTA label auto-fills** based on destination (operator can override).

## What I confirmed in the codebase

- **No org-wide consultation policy exists yet** — only per-service `requiresConsultation` flags. We need to add it.
- **`?consultation=true` is dead wire today** — it's read into booking session state but nothing downstream uses it. We'll wire it up.
- `BookingSurfaceConfig` is the right home for the new policy (already has `allowConsultationMode` on the embed side, so the concept is structurally present).
- Booking page never reads `?promo=` today, so the popup's promise is currently unkept on the live site.

## Build plan — three concurrent layers

### Layer A — Org-wide "New Client Booking Policy" (Booking Surface Config)

Add a new field to `BookingSurfaceConfig`:

```ts
newClientPolicy: 'open' | 'consultation-required';
```

- Default: `'open'` (current behavior preserved)
- New editor row in the Booking Surface settings (under Flow): **"New Client Policy"** with two options:
  - *Open booking* — anyone can book any service directly
  - *Consultation required* — new visitors must schedule a consultation before booking services
- When `consultation-required` is set:
  - Booking page checks for an existing-client cookie/session marker
  - If new visitor + arrived without `?consultation=true` → show inline gate explaining policy + offer "Schedule Consultation" CTA that re-routes with the param
  - If `?consultation=true` is set → filter service browser to services where `requiresConsultation === true` (or show all but pre-flag them as "consultation step")

### Layer B — Promotional Popup Destination Toggle

Add to `PromotionalPopupSettings`:

```ts
acceptDestination: 'booking' | 'consultation' | 'custom-url';
customUrl?: string;
customUrlInstructions?: string;  // shown on the booking page banner when destination='custom-url' is impossible — actually used only for in-popup tooltip; see Layer C
```

Editor UI (new section under "Call-to-action" in `PromotionalPopupEditor`):

- **Radio group: "Where does Claim Offer send the visitor?"**
  - *Direct booking* — `/booking?promo=CODE`
  - *Schedule a consultation* — `/booking?promo=CODE&consultation=true` (only enabled when org's `newClientPolicy === 'consultation-required'`; otherwise grayed with helper text *"Enable 'Consultation required' in Booking Surface settings to use this destination."*)
  - *Custom URL* — operator pastes a URL (validated as `https://`, `tel:`, or `mailto:`) + a short instructions field
- **CTA label auto-fills** when destination changes:
  - `booking` → "Claim Offer" (current default)
  - `consultation` → "Book Consultation"
  - `custom-url` → "Learn More"
  - Operator can always override; we just rewrite the label at the moment they switch destinations and the field still matches the previous default

### Layer C — Booking-page promo banner + custom-URL flow

When `?promo=CODE` arrives on `/booking`:

1. Resolve `CODE` against the org's promotional popup config (only if `enabled`)
2. Render a slim accent-colored banner above the booking form:
   - **Standard:** *"Offer applied — {headline}. Code {CODE} will be honored at checkout."*
   - **Consultation variant** (if `?consultation=true` also set): *"Offer applied — schedule a consultation and we'll honor {CODE} at your next visit."*
3. Banner uses the popup's `accentColor` so the visual handoff feels continuous

For custom-URL destination: the operator-authored `customUrlInstructions` are surfaced **inside the popup itself** (small text below the CTA, e.g. *"Call (555) 123-4567 to claim — mention code {CODE}"*), since the visitor never lands on `/booking` for that path. Removes the need for a separate landing copy.

### Layer D — Editor preview fix (the original bug)

In `PromotionalPopup.handleAccept()`, when `isPreview === true`:
- Show a sonner toast describing the simulated downstream action:
  - `booking` → *"Visitor would be sent to /booking with code {CODE}"*
  - `consultation` → *"Visitor would be sent to consultation booking with code {CODE}"*
  - `custom-url` → *"Visitor would be sent to {customUrl}"* (or *"Visitor sees instructions: {customUrlInstructions}"* if no URL)
- Popup still closes — no actual navigation. Operator now has clear feedback.

## Files to change

```
src/hooks/usePromotionalPopup.ts
  + acceptDestination, customUrl, customUrlInstructions on PromotionalPopupSettings + DEFAULT_PROMO_POPUP

src/hooks/useBookingSurfaceConfig.ts
  + newClientPolicy on BookingSurfaceConfig + DEFAULT (= 'open')

src/components/dashboard/website-editor/PromotionalPopupEditor.tsx
  + destination radio group + custom-URL fields + CTA auto-fill logic
  + reads newClientPolicy from booking config to enable/disable consultation option

src/components/dashboard/booking-editor/<existing flow settings>
  + new client policy radio (locate exact file during implementation)

src/components/public/PromotionalPopup.tsx
  + handleAccept switches on acceptDestination
  + preview-mode toast feedback
  + custom-URL instructions rendered in popup body when applicable

src/components/booking-surface/HostedBookingPage.tsx
  + read ?promo= param, resolve via popup config, render banner
  + enforce newClientPolicy: gate new visitors who arrived without ?consultation=true

src/components/booking-surface/BookingPromoBanner.tsx (new)
  + small accent-colored banner component, standard + consultation variants

src/components/booking-surface/NewClientGate.tsx (new)
  + inline gate shown when policy=consultation-required + new visitor + no ?consultation=true
```

No DB migration needed — both new fields live inside existing `site_settings` JSON payloads (`promotional_popup` and `booking_surface_config`). Site-settings persistence canon (read-then-update/insert) already handled by the existing hooks.

## What this does NOT do (deferred, with revisit triggers)

- **Per-service offer linking** (Layer 2 from prior chat): operator can't yet say "this offer is *for* the Gloss Treatment service." Defer until at least one operator asks. Revisit trigger: an operator requests service-specific promo targeting in-product.
- **Promo redemption analytics**: writing `promo_redemptions` rows on booking confirmation. Defer until Marketing OS Phase 2 — the data is currently captured client-side via `record_promo_response('accepted')` clicks, which is enough for operator confidence today. Revisit trigger: first operator asks "did anyone actually book using my offer?"
- **Existing-client recognition** for the new-client gate: Layer A relies on a cookie/session marker. We'll set the marker on first booking confirmation. Revisit trigger: returning clients report being incorrectly gated.

## Verification path before shipping

1. Open promotional popup editor with org policy `open` → consultation destination is disabled with helper text
2. Switch booking config to `consultation-required` → consultation destination unlocks; switching to it auto-renames CTA to "Book Consultation"
3. In editor preview, click each CTA variant → toast describes the correct downstream action
4. On real public site, click Claim Offer (booking destination) → land on `/booking?promo=CODE` with banner
5. Same with consultation destination → land on `/booking?promo=CODE&consultation=true` with consultation-variant banner + service browser filtered/flagged
6. Custom URL destination → instructions render inside popup; CTA opens URL in new tab

## Doctrine alignment

- **Structural Enforcement Gates**: `consultation-required` becomes a real gate on the booking surface, not a popup-only contract
- **Visibility Contracts**: consultation destination on the popup editor returns a configuration stub (helper text + disabled state) when policy isn't set, never silent
- **Routing**: all internal navigation uses React Router (no `window.location.href`), even custom URLs use `<a target="_blank" rel="noopener noreferrer">` for external escape
- **Site Settings Persistence**: both schemas use the existing read-then-update hooks
- **Stylist Privacy / RLS**: nothing tenant-sensitive added; both fields scope to existing `site_settings.organization_id`
