

# Billing Explainer — Internal Reference Page + Quick-Access Button

## What
A new **Billing Guide** page at `/dashboard/platform/billing-guide` that serves as a living internal reference for how organizations are billed. Accessible from:
1. **Left sidebar navigation** — new item in the Intelligence group
2. **Quick-access button** inside the Billing tab on any account detail page

The page will pull live data from `subscription_plans` and display the billing logic constants from `useBillingCalculations.ts`, so it stays in sync when plans or pricing rules change.

## Page Content

### Sections
1. **Plans Overview** — live table from `subscription_plans`: name, monthly price, annual price, max locations, max users, description
2. **Billing Cycle Discounts** — the cycle discount schedule (Monthly 0%, Quarterly 5%, Semi-Annual 10%, Annual 20%)
3. **How Billing Works** — plain-language walkthrough:
   - Base price comes from the plan (or custom override)
   - Promo pricing applies if active (time-limited)
   - Discounts (% or fixed) apply when no promo is active
   - Per-location and per-user overage fees for exceeding plan limits
   - Purchased add-on locations/users are billed monthly on top
   - Cycle discount applied to total monthly amount × cycle months
   - Setup fee added to first invoice only (if not already paid)
   - Trial period = $0 first invoice until trial ends
4. **Backroom Add-On** — $20/mo per location + $0.50 per color service (from memory context)
5. **Quick Reference** — contract lengths, auto-renewal behavior, promo mechanics

### Data Sources
- `subscription_plans` table (live query via `useSubscriptionPlans`)
- Billing constants hardcoded in `useBillingCalculations.ts` (cycle multipliers, discounts) — imported directly so changes propagate

## Changes

### 1. New page: `src/pages/dashboard/platform/BillingGuide.tsx`
- Uses `useSubscriptionPlans()` to render live plan table
- Imports `CYCLE_DISCOUNTS` (will need to export from `useBillingCalculations.ts`) for the discount table
- Platform-themed cards for each section
- Clean, scannable layout optimized for phone-call reference

### 2. Export constants from `useBillingCalculations.ts`
- Export `CYCLE_MULTIPLIERS` and `CYCLE_DISCOUNTS` (currently module-private `const`)

### 3. Add route in `App.tsx`
- `/dashboard/platform/billing-guide` → lazy-loaded `BillingGuide`

### 4. Add nav item in `platformNav.ts`
- New entry in the Intelligence group: `{ href: '/dashboard/platform/billing-guide', label: 'Billing Guide', icon: BookOpen }` (or `HelpCircle`)

### 5. Add button in `BillingConfigurationPanel.tsx`
- Small "Billing Guide" button (outline variant, `HelpCircle` icon) in the billing tab header area, links to `/dashboard/platform/billing-guide` via router

### Files Changed
- `src/pages/dashboard/platform/BillingGuide.tsx` — **new**
- `src/hooks/useBillingCalculations.ts` — export 2 constants
- `src/config/platformNav.ts` — add nav item
- `src/App.tsx` — add route
- `src/components/platform/billing/BillingConfigurationPanel.tsx` — add link button

