

# Add Ecosystem Page

## Problem
The marketing nav and footer link to `/ecosystem`, but no route exists -- users hit the 404 page.

## What the page should be
A dedicated marketing page expanding on the four platform surfaces previewed on the landing page: Intelligence Brief (Live), Marketing OS (Phase 2), Simulation Engine (Phase 3), Automation Layer (Phase 4). This is the "Infrastructure that compounds" story told in full.

## Changes

### 1. Create `src/pages/Ecosystem.tsx`
- Marketing layout page (uses `MarketingNav` + `MarketingFooter` wrapper like `PlatformLanding`)
- Hero section: "Infrastructure that compounds" headline with supporting copy about the four interconnected surfaces
- Expanded cards for each surface (reuse the data from `EcosystemPreview` but with richer descriptions, phase status badges, and feature lists)
- Final CTA section linking to demo request / login
- Fully wrapped in the `.marketing-surface` class for CSS namespacing

### 2. Add route in `src/App.tsx`
- Add `/ecosystem` route pointing to the new `Ecosystem` page
- Place alongside other public marketing routes (outside `PrivateAppShell`)
- Use `lazyWithRetry` for code splitting (non-critical path)

### Technical Notes
- Page renders outside `OrganizationProvider` (public route) -- no dashboard context dependencies
- Reuses existing brand tokens (`SIMULATION_ENGINE_NAME`, `MARKETING_OS_NAME`, etc.) from `src/lib/brand.ts`
- Follows marketing surface typography: `font-display` for headlines, `font-sans` for body, violet accents, max `font-medium`
- Responsive grid layout matching existing marketing pages

