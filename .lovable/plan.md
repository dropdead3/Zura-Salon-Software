

## Three Advanced Client Intelligence Enhancements

### 1. Smart Formula Diffing

Show what changed between consecutive formula entries in the Formula History timeline.

**Approach:**
- Add a `computeFormulaDiff` helper function that compares two consecutive `FormulaLine[]` arrays and returns:
  - Added products (in new but not old)
  - Removed products (in old but not new)
  - Changed quantities (same product, different amount — show delta)
  - Ratio shift (compute total weight ratio between old/new)
- In the Formula History section, render diff badges below each card (except the oldest):
  - Green `+Product` pills for additions
  - Rose `-Product` pills for removals
  - Amber `↑30g → 45g` for quantity changes
  - Violet `Ratio 1:2 → 1:3` if overall ratio shifted
- Products matched by `product_id` first, fallback to `product_name`
- Diff only shown between consecutive entries of the same `formula_type`

**File:** `src/components/dock/appointment/DockClientTab.tsx` — add helper + diff rendering in the formula history map

### 2. Retail Conversion Tracking

Track whether cross-sell recommendations lead to actual purchases, feeding back into recommendation quality.

**Approach:**
- **New table: `retail_recommendation_events`** — logs when a recommendation is surfaced and when it converts
  - `id`, `organization_id`, `client_id` (phorest_client_id), `recommended_product_name`, `service_name`, `recommended_at`, `converted_at` (null until purchase detected), `recommended_by` (staff user_id)
  - RLS: org members can read/write their org's data
- **Log on render:** When cross-sell products are displayed, insert a row per product (debounced, deduplicated by client+product+date)
- **Detect conversion:** A lightweight cron or on-demand check: when `phorest_transaction_items` shows a matching product purchase by the same client within 30 days of recommendation, stamp `converted_at`
- **Surface conversion rate:** In the "Suggested Retail" section header, show a small "X% conversion" badge if enough data exists (10+ recommendations)
- **Feed back into ranking:** Adjust cross-sell query to weight products by historical conversion rate (products that actually get bought rank higher)

**Files:**
- Database migration — create `retail_recommendation_events` table with RLS
- `src/components/dock/appointment/DockClientTab.tsx` — log recommendation events, show conversion badge

### 3. Session-Aware Recommendations

Factor in the current formula being mixed (not just service name) for more precise retail suggestions.

**Approach:**
- Pass `activeBowlId` (already available) to the cross-sell query
- When `activeBowlId` exists, fetch current `mix_bowl_lines` to get the actual products being used right now
- Use those product names/brands as additional filtering criteria: query `phorest_transaction_items` for retail products purchased in transactions that also included the same professional products
- This creates a "clients who used Product X also bought Shampoo Y" pattern
- Falls back to the existing service-name-based logic when no active bowl or no lines yet

**Files:**
- `src/components/dock/appointment/DockClientTab.tsx` — enhance cross-sell query to incorporate active bowl lines

### Files Summary

| Action | File |
|--------|------|
| Create | Migration for `retail_recommendation_events` table + RLS |
| Modify | `src/components/dock/appointment/DockClientTab.tsx` — formula diffing, conversion tracking, session-aware cross-sell |

