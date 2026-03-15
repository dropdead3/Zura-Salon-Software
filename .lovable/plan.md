

# Smart Plan Recommendation & Per-Location Variable Pricing

## Current Problem

The paywall applies a single flat plan price across all locations, but each location may have a different number of active stylists. A 2-stylist location shouldn't pay the same as an 8-stylist location. The user also has to manually figure out which plan tier fits each location.

## Approach: Per-Location Stylist Count Drives Plan Assignment

Instead of selecting one plan for all locations, the paywall will:

1. **Query active stylist counts per location** — Count `employee_profiles` with `is_active = true` and the `stylist` role in `user_roles`, grouped by `location_id`.

2. **Auto-assign the correct plan tier per location** based on stylist count:
   - 1-3 stylists → Starter ($39/mo)
   - 4-10 stylists → Professional ($79/mo)
   - 11+ stylists → Unlimited ($129/mo)

3. **Show per-location pricing in the location selector** — Each location row displays its stylist count and auto-assigned plan tier with the corresponding price, replacing the single plan selector.

4. **Allow manual override** — Users can upgrade a location's tier (but not downgrade below the minimum for their stylist count).

5. **Dynamic total** — The price summary adds up each location's individual plan price rather than a flat rate × location count.

## UI Changes (`BackroomPaywall.tsx`)

- **Remove the "Choose Your Plan" card** as a global selector. Replace with a plan tier legend/explainer showing the three tiers and their stylist ranges.
- **Enhance the Location Selector** — each location row shows:
  - Location name and city
  - Active stylist count (e.g., "6 stylists")
  - Auto-recommended plan badge (e.g., "Professional · $79/mo")
  - Optional tier override dropdown (upgrade only)
- **Price Summary** — itemize per-location: "Location A (Professional) — $79/mo", "Location B (Starter) — $39/mo", etc.
- Keep the scale configurator, money-back guarantee, and ROI callout as-is.

## Data Fetching

- New hook or inline query in the paywall: fetch active stylist counts per location by joining `employee_profiles` (filtered `is_active = true`, `organization_id`) with `user_roles` (filtered `role = 'stylist'`), grouped by `location_id`.
- This runs client-side with the existing Supabase client — no new edge function needed.

## Checkout Payload Changes

- Instead of sending a single `plan` string, send a `location_plans` array: `[{ location_id, plan_tier, stylist_count }]`
- Update `create-backroom-checkout` to create line items per location/tier combination (group by tier, set quantity to the number of locations on that tier).
- Update `stripe-webhook` to read the per-location plan assignments from metadata and create entitlements with the correct `plan_tier` per location.

## Files to Modify

| File | Change |
|------|--------|
| `BackroomPaywall.tsx` | Replace global plan selector with per-location auto-assignment UI |
| `create-backroom-checkout/index.ts` | Accept `location_plans[]`, create grouped line items per tier |
| `stripe-webhook/index.ts` | Parse `location_plans` from metadata, set correct `plan_tier` per entitlement |

