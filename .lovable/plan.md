

# Booking Surface UI/UX Enhancement — Build Plan

## Current State Assessment

Phase 1 infrastructure is in place: hooks (`useBookingSurfaceConfig`), 11 client-facing components, 5 admin components, routes registered. However the current build is a **functional skeleton** — it lacks the premium UX, guided admin experience, live preview, mode selector, deep link configurator, embed code generator, and theme presets described in the spec.

## What Needs to Be Built

### Gap Analysis (what exists vs what's needed)

| Area | Current | Needed |
|---|---|---|
| Admin layout | Flat tabs (Theme/Flow/Hosted) | Guided deployment studio with mode selector, live preview, deep link config, embed panel |
| Mode selector | `mode` field in config, no UI | Visual `BookingSurfaceModeSelector` with icons + descriptions |
| Theme editor | Basic color pickers + selects | Add theme presets dropdown, branding section (logo/favicon upload), reset to defaults |
| Live preview | None | Side-panel `BookingLivePreview` with desktop/mobile/widget mode switching |
| Deep link config | URL params read in hosted page, no admin UI | `BookingLinkConfigurator` — generate links for location/stylist/service/consultation |
| Embed code generator | None | `EmbedCodeGenerator` — inline/modal/popup/iframe snippets with copy buttons |
| Publish bar | Top card with toggle + copy link | Sticky bottom bar with draft/published state + unsaved changes indicator |
| Flow configurator | Basic template select + toggles | Add visual step preview per template, "best for" descriptions |
| Hosted page editor | Title, intro, policy, powered-by | Add slug input, hero toggle, FAQ builder, salon info block toggle |
| Client booking UX | Functional but basic inline styles | Add step transitions (framer-motion), sticky mobile CTA, better date picker polish, booking summary sidebar |

### Admin Components to Create/Rewrite

1. **`BookingSurfaceModeSelector.tsx`** (NEW) — Visual card selector for Embedded / Hosted / Both with icons, descriptions, recommended use cases
2. **`BookingLivePreview.tsx`** (NEW) — Side-panel iframe/render preview with desktop/mobile/widget mode tabs, reflects config changes in real-time
3. **`BookingLinkConfigurator.tsx`** (NEW) — Generate deep links for specific location/stylist/service/category/consultation. Copy buttons for each generated link
4. **`EmbedCodeGenerator.tsx`** (NEW) — Install method selector (inline/modal/popup/iframe), code snippets with copy, setup instructions per method
5. **`BookingThemeEditor.tsx`** (REWRITE) — Add theme presets dropdown (Minimal, Luxury, Editorial, Soft Modern, Bold Fashion), branding section with logo upload, reset to defaults button
6. **`BookingSurfaceSettings.tsx`** (REWRITE) — Restructure from flat tabs into guided section layout: Mode → Theme → Flow → Content → Deep Links → Embed → Publish. Two-column layout on desktop (settings left, live preview right)
7. **`BookingPublishBar.tsx`** (REWRITE) — Sticky bottom bar with draft/published badge, unsaved changes detection, Preview + Publish/Update buttons
8. **`BookingFlowConfigurator.tsx`** (ENHANCE) — Add visual step sequence preview per template, "best for" labels
9. **`BookingHostedPageEditor.tsx`** (ENHANCE) — Add slug input field, hero toggle, FAQ item builder, salon info block toggle, open/copy hosted page link

### Client-Facing Components to Enhance

10. **`HostedBookingPage.tsx`** (ENHANCE) — Add framer-motion step transitions (AnimatePresence), floating booking summary sidebar on desktop, policy text footer section
11. **`BookingDateTimePicker.tsx`** (ENHANCE) — Better selected state styling, loading skeleton for availability, smoother mobile UX with larger tap targets
12. **`BookingClientForm.tsx`** (ENHANCE) — Sticky submit button on mobile, better field focus states using theme primary color
13. **`BookingConfirmation.tsx`** (ENHANCE) — Add "Add to Calendar" link, richer success animation
14. **`BookingFlowProgress.tsx`** (ENHANCE) — Smoother transitions, better mobile compact mode

### Page-Level Changes

15. **`BookingSurfaceSettingsPage.tsx`** — Update title to "Booking Surfaces", add publish state badge + Preview/Publish actions in header

## Build Order

1. Create `BookingSurfaceModeSelector` + `BookingLinkConfigurator` + `EmbedCodeGenerator` (new admin components, no dependencies)
2. Enhance `BookingThemeEditor` (presets + branding section)
3. Enhance `BookingFlowConfigurator` + `BookingHostedPageEditor` (visual previews + new fields)
4. Create `BookingLivePreview` (renders booking components inline with config)
5. Rewrite `BookingSurfaceSettings` (guided layout with live preview panel)
6. Rewrite `BookingPublishBar` (sticky bottom, unsaved state)
7. Update `BookingSurfaceSettingsPage` header
8. Enhance client-facing components (transitions, mobile polish, summary sidebar)
9. TypeScript build check

## Files

| File | Action |
|---|---|
| `src/components/dashboard/booking-surface/BookingSurfaceModeSelector.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingLivePreview.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingLinkConfigurator.tsx` | CREATE |
| `src/components/dashboard/booking-surface/EmbedCodeGenerator.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingThemeEditor.tsx` | REWRITE |
| `src/components/dashboard/booking-surface/BookingFlowConfigurator.tsx` | ENHANCE |
| `src/components/dashboard/booking-surface/BookingHostedPageEditor.tsx` | ENHANCE |
| `src/components/dashboard/booking-surface/BookingSurfaceSettings.tsx` | REWRITE |
| `src/components/dashboard/booking-surface/BookingPublishBar.tsx` | REWRITE |
| `src/pages/dashboard/admin/BookingSurfaceSettingsPage.tsx` | UPDATE |
| `src/components/booking-surface/HostedBookingPage.tsx` | ENHANCE |
| `src/components/booking-surface/BookingDateTimePicker.tsx` | ENHANCE |
| `src/components/booking-surface/BookingClientForm.tsx` | ENHANCE |
| `src/components/booking-surface/BookingConfirmation.tsx` | ENHANCE |
| `src/components/booking-surface/BookingFlowProgress.tsx` | ENHANCE |

## Technical Notes

- Live preview renders booking components directly (not iframe) using the draft config, wrapped in a scaled container with device frame chrome
- Theme presets are static config objects that overwrite the theme section of draft config
- Embed code generator produces `<script>` + `<div>` snippets pointing to `/book/:orgSlug?embed=true&mode=inline|modal`
- Deep link configurator queries locations/stylists/services to populate dropdowns, generates URL with params
- Sticky publish bar uses `position: sticky; bottom: 0` with blur backdrop
- Step transitions use `motion` + `AnimatePresence` with slide direction based on navigation direction
- No new database tables or schema changes needed — all config stays in `site_settings`

