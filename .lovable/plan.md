

# Restructure Backroom Pricing: $20/Location + $0.50/Color Service

## New Model
- **$20/month flat fee per location** (replaces Starter/Professional/Unlimited tiers)
- **$0.50 per color service appointment** (usage-based, tracked via existing mix session data)
- **No annual discount, no free scale incentive**
- Scale hardware ($199 one-time) + $10/mo license per scale remains unchanged

## Stripe Setup
Need to create a new Stripe product + price for the $20/mo per-location base fee. The old tier products (Starter/Professional/Unlimited) will no longer be used for new subscriptions.

For the $0.50/color-service component: use Stripe metered billing (`usage_type: 'metered'`) so usage can be reported at the end of each billing period based on completed mix sessions.

## Files to Change

### 1. `src/hooks/backroom/useLocationStylistCounts.ts`
- Remove `getRecommendedTier()`, `getTierProgressInfo()`, `PLAN_PRICING`, `TierProgressInfo` interface
- Replace with simple constants:
  ```ts
  export const BACKROOM_BASE_PRICE = 20;
  export const BACKROOM_PER_SERVICE_FEE = 0.50;
  export const SCALE_LICENSE_MONTHLY = 10;
  ```
- Keep `useLocationStylistCounts` hook (still useful for display)

### 2. `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (major rewrite)
- Remove: 3-tier plan cards, `PLAN_KEYS`, `PLAN_FEATURES`, tier legend, tier override selectors, tier progression bars, annual toggle, free scale incentive card
- New layout: Hero → Features → Location selector (simple checkboxes, flat $20/loc) → Scale configurator → Price summary showing `$20 × N locations + scales`
- Usage pricing shown as informational: "$0.50 per color service — billed based on actual usage"

### 3. `src/pages/dashboard/admin/BackroomSubscription.tsx`
- Remove `PLAN_DISPLAY` 3-tier map, `UPGRADE_ORDER`, plan change card, `DowngradeConfirmDialog` usage
- Show flat $20/location base, usage info, scale licenses
- Remove annual badge logic

### 4. `src/components/dashboard/backroom-settings/DowngradeConfirmDialog.tsx`
- Delete this file entirely

### 5. `src/components/dashboard/settings/BackroomCostSummaryCard.tsx`
- Remove `TIER_PRICES`, `TIER_BADGE_STYLES`
- Show flat $20/location + scale costs, no tier badges

### 6. `src/components/dashboard/settings/BillingOverviewCard.tsx`
- Remove `BACKROOM_TIER_PRICES`, calculate as `activeLocations × $20 + scales × $10`

### 7. `src/components/platform/backroom/BackroomEntitlementsTab.tsx`
- Remove `planBadge()` function
- Remove plan tier column from location table
- Remove tier selector from expanded rows
- Backfill logic: set `plan_tier: 'standard'` instead of `'starter'`

### 8. `src/components/platform/backroom/AdminActivateDialog.tsx`
- Remove `BACKROOM_TIER_PRICES` 3-tier map and per-location tier selector
- Simplify to: toggle locations on/off + scale count, flat $20/location cost preview
- Remove annual toggle and discount badge

### 9. `src/components/platform/backroom/BackroomBillingTab.tsx`
- Remove "Plans" column from the billing health table
- Remove tier badges

### 10. `src/hooks/platform/useBackroomBillingHealth.ts`
- Remove `PLAN_PRICES` tier map
- Calculate MRR as `activeLocations × $20 + totalScales × $10`
- Remove `planTiers` from the interface and computation

### 11. Edge Functions

**`supabase/functions/create-backroom-checkout/index.ts`**
- Replace `BACKROOM_PLANS` 3-tier map with a single base product/price
- Create new Stripe product + price for "$20/mo Backroom Location" (will use stripe tools)
- Line items: `base_price × location_count + scale_license × scale_count + hardware × hardware_count`
- Add metered price for $0.50/color-service

**`supabase/functions/admin-activate-backroom/index.ts`**
- Same simplification: single plan, no tier selection

**`supabase/functions/stripe-webhook/index.ts`**
- Update backroom checkout handler: set `plan_tier: 'standard'` instead of parsing per-tier logic

### 12. Database
- No schema migration needed. `plan_tier` column stays — we'll just write `'standard'` going forward.

## Stripe Products to Create
Before implementing, I'll create via Stripe tools:
1. **Backroom Location Base** — $20/mo recurring per location
2. **Backroom Color Service Usage** — $0.50/unit metered price

