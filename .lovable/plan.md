

# Booking Embed + External Booking Page — Build Plan

## Current State

- **`PublicBooking.tsx`** (`/book`): Existing 6-step booking flow (service → location → stylist → datetime → details → confirm). Uses `phorest_services` directly, hardcoded time slots, basic Card UI. No theming, no org-scoping, no embed support.
- **`Booking.tsx`** (`/booking`): Lead capture form (consultation request), not real booking. Uses `Layout` wrapper.
- **`WebsiteBookingSettings`**: Minimal — `enabled`, `provider`, `booking_url`, `show_prices` stored in `site_settings`.
- **Theme infrastructure**: `website_themes` table exists with blueprint system, but no booking-specific theme tokens.
- **`useSiteSettings`**: Generic org-scoped key-value store — ideal for storing booking surface config.

## What's Missing

Everything. No embed system, no hosted booking page, no booking theme editor, no flow configuration, no deep linking, no embed code generation. The existing `PublicBooking.tsx` is a bare prototype with no theming or org-awareness.

## Build Scope — Phase 1 Only

Phase 1 delivers: **hosted booking page + core theme system + admin setup + service browsing**. Embed widget is Phase 2.

### 1. Database: `booking_surface_config` site_settings key

Store per-org config in `site_settings` with key `booking_surface_config`. No new table needed.

```text
BookingSurfaceConfig {
  mode: 'hosted' | 'embed' | 'both'
  published: boolean
  slug: string  // e.g. "mesa-salon"
  
  // Theme tokens
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    surfaceColor: string
    textColor: string
    mutedTextColor: string
    borderColor: string
    buttonRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
    cardRadius: 'none' | 'sm' | 'md' | 'lg'
    fontFamily: 'inter' | 'dm-sans' | 'plus-jakarta' | 'cormorant' | 'playfair'
    headingStyle: 'uppercase' | 'titlecase' | 'lowercase'
    elevation: 'flat' | 'subtle' | 'elevated'
    density: 'compact' | 'comfortable' | 'spacious'
    mode: 'light' | 'dark'
    logoUrl: string | null
    heroImageUrl: string | null
  }
  
  // Flow config
  flow: {
    template: 'category-first' | 'stylist-first' | 'location-first'
    showPrices: boolean
    showDuration: boolean
    showDescriptions: boolean
    showStylistBios: boolean
    showAddOns: boolean
    featuredCategoryIds: string[]
  }
  
  // Hosted page content
  hosted: {
    pageTitle: string
    introText: string | null
    showHero: boolean
    showFaq: boolean
    faqItems: { q: string; a: string }[]
    policyText: string | null
    poweredByVisible: boolean
  }
}
```

### 2. Hosted Booking Page — `/book/:orgSlug`

New public route. Renders a fully themed, standalone booking experience.

**Components** (new directory `src/components/booking-surface/`):
- `HostedBookingPage.tsx` — Shell: resolves org by slug, applies theme CSS vars, renders flow
- `BookingThemeProvider.tsx` — Converts config theme tokens into CSS custom properties
- `BookingServiceBrowser.tsx` — Category grid → service cards with descriptions, prices, durations
- `BookingServiceCard.tsx` — Individual service with optional photo, price, duration, popular badge
- `BookingStylistPicker.tsx` — Stylist cards with optional bio/photo
- `BookingLocationPicker.tsx` — Location cards with address
- `BookingDateTimePicker.tsx` — Date + time slot selection (reuse existing logic)
- `BookingClientForm.tsx` — Name, email, phone, notes
- `BookingConfirmation.tsx` — Summary + confirm
- `BookingFlowProgress.tsx` — Step indicator
- `BookingHeader.tsx` — Logo + salon name + optional nav

Data: Uses `usePublicServicesForWebsite` (already exists) + existing location/stylist queries, scoped by org ID resolved from slug.

### 3. Admin Setup Page — `/dashboard/admin/booking-surface`

New dashboard page with tabs:

- **Mode & Publishing** — Mode selector, slug input, publish toggle, copy link
- **Theme Editor** — Color pickers, font selector, radius/elevation/density controls, logo upload, live preview
- **Flow Config** — Template selector, toggle switches for prices/duration/descriptions/bios
- **Hosted Page** — Page title, intro text, hero toggle, FAQ editor, policy text
- **Preview** — Embedded iframe showing the hosted page with current config

**Components** (in `src/components/dashboard/booking-surface/`):
- `BookingSurfaceSettings.tsx` — Main tabbed layout
- `BookingThemeEditor.tsx` — Color/font/radius controls with live preview
- `BookingFlowConfigurator.tsx` — Flow template + toggles
- `BookingHostedPageEditor.tsx` — Content fields for hosted page
- `BookingPreviewPanel.tsx` — Side-by-side desktop/mobile preview
- `BookingPublishBar.tsx` — Publish status + copy link + slug

### 4. Deep Linking

Support URL params on the hosted page: `?location=X&stylist=Y&category=Z&service=S`

Pre-selects the relevant step and skips completed steps. Salon can generate specific booking links from the admin panel.

### 5. Route Registration

- Public: `/book/:orgSlug` → `HostedBookingPage`
- Dashboard: `admin/booking-surface` → `BookingSurfaceSettingsPage`

## Files

| File | Action |
|---|---|
| `src/hooks/useBookingSurfaceConfig.ts` | CREATE — CRUD hook for `booking_surface_config` in site_settings |
| `src/hooks/usePublicOrgBySlug.ts` | CREATE — Resolve org by booking slug |
| `src/components/booking-surface/BookingThemeProvider.tsx` | CREATE |
| `src/components/booking-surface/HostedBookingPage.tsx` | CREATE |
| `src/components/booking-surface/BookingServiceBrowser.tsx` | CREATE |
| `src/components/booking-surface/BookingServiceCard.tsx` | CREATE |
| `src/components/booking-surface/BookingStylistPicker.tsx` | CREATE |
| `src/components/booking-surface/BookingLocationPicker.tsx` | CREATE |
| `src/components/booking-surface/BookingDateTimePicker.tsx` | CREATE |
| `src/components/booking-surface/BookingClientForm.tsx` | CREATE |
| `src/components/booking-surface/BookingConfirmation.tsx` | CREATE |
| `src/components/booking-surface/BookingFlowProgress.tsx` | CREATE |
| `src/components/booking-surface/BookingHeader.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingSurfaceSettings.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingThemeEditor.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingFlowConfigurator.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingHostedPageEditor.tsx` | CREATE |
| `src/components/dashboard/booking-surface/BookingPublishBar.tsx` | CREATE |
| `src/pages/dashboard/admin/BookingSurfaceSettingsPage.tsx` | CREATE |
| `src/pages/BookingSurface.tsx` | CREATE — Route wrapper for `/book/:orgSlug` |
| `src/App.tsx` | UPDATE — Add routes |
| `src/config/dashboardNav.ts` | UPDATE — Add nav entry under Website Hub |

## Build Order

1. Create `useBookingSurfaceConfig` hook + `usePublicOrgBySlug`
2. Create `BookingThemeProvider` (CSS var injection from config)
3. Build client-facing booking components (ServiceBrowser, StylistPicker, LocationPicker, DateTimePicker, ClientForm, Confirmation, FlowProgress, Header)
4. Build `HostedBookingPage` shell assembling all components
5. Build admin components (ThemeEditor, FlowConfigurator, HostedPageEditor, PublishBar, Settings)
6. Create admin page + public page route wrappers
7. Register routes in App.tsx + nav entry
8. TypeScript build check

## Out of Scope (Phase 2+)

- Embed widget (inline, modal, popup, floating button)
- Embed code generation
- iframe fallback
- Custom domain for hosted page
- Per-location theme overrides
- Analytics tracking
- Advanced style controls (slim mode, image banner hero)
- FAQ and policy blocks on hosted page
- Stylist bio content management

## Technical Notes

- Theme CSS variables applied via inline `style` on the booking surface root — fully isolated from Zura's own theme
- Public route renders outside `PrivateAppShell` — no auth required
- Org resolution by slug uses a new lightweight query against `organizations` table
- All booking data queries scoped by resolved org ID
- Font families loaded via Google Fonts link tag injected dynamically by `BookingThemeProvider`
- Mobile: flow becomes full-screen stacked steps with sticky continue button
- No new database tables — config stored in existing `site_settings`

