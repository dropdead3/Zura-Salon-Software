

# Billing Guide Enhancements: Anchors, Changelog, and Calculator

## 1. Section Anchor Links & Jump Navigation

**In `BillingGuide.tsx`:**
- Add `id` attributes to each card section: `id="plans"`, `id="discounts"`, `id="how-it-works"`, `id="backroom"`, `id="quick-ref"`, `id="calculator"`, `id="changelog"`
- Add a sticky jump-nav bar at the top (below the page header) with pill-style anchor links for each section
- On mount, read `?section=` from the URL and `scrollIntoView` the matching element
- From `BillingConfigurationPanel.tsx`, update the "Billing Guide" link to pass `?section=promos` or similar when linking from specific fields (e.g. the promo config card could link to `?section=how-it-works`)

## 2. Changelog / Last Updated Section

**New card at the bottom of `BillingGuide.tsx`:**
- A "Changelog" card with a hardcoded list of dated entries describing billing logic changes (e.g. "2026-03-16 — Added cycle discount schedule", "2026-03-10 — Setup fee moved to Contract & Billing Terms card")
- Each entry is a simple date + description row
- The most recent entry date is displayed in the page header as "Last updated: Mar 16, 2026"
- Future updates are added by editing the changelog array in the component — simple and maintainable

## 3. Interactive Billing Calculator Widget

**New card in `BillingGuide.tsx` (between "How Billing Works" and the bottom grid):**
- A "Billing Calculator" card with interactive inputs:
  - **Plan** — dropdown from live `subscription_plans`
  - **Billing Cycle** — select (monthly/quarterly/semi-annual/annual)
  - **Custom Price Override** — optional number input
  - **Additional Locations / Users** — number inputs
  - **Promo Price** — optional number input
  - **Setup Fee** — number input with "paid" toggle
- Uses the existing `useBillingCalculations` hook (calling it with synthetic `OrganizationBilling` and `SubscriptionPlan` objects built from the form inputs)
- Displays computed results in a mini invoice preview: effective monthly, cycle amount, annual projection, first invoice, savings

This reuses the exact same calculation engine that powers the real account billing, so the calculator is always in sync.

## Files Changed
- **`src/pages/dashboard/platform/BillingGuide.tsx`** — add anchor IDs, sticky nav bar, changelog card, calculator widget, URL param scroll
- **`src/components/platform/billing/BillingConfigurationPanel.tsx`** — update Billing Guide link to include `?section=` param for contextual deep-links

