

## Implement All Price Recommendation Engine Improvements

### 1. Fix Dismiss Not Suppressing Alerts
**`useServicePriceRecommendations.ts`** — In `useComputedPriceRecommendations`, fetch dismissed recommendations from `service_price_recommendations` (status = 'dismissed') and exclude those service IDs from results. Only exclude if the dismissal was for the same `current_price` and `recommended_price` (so new cost changes re-trigger alerts).

### 2. Add Confirmation Dialog Before Accept
**New: `PriceAcceptConfirmDialog.tsx`** — AlertDialog showing:
- Service name, old price → new price, delta %
- Count of level tiers and location tiers that will be scaled
- "Confirm" and "Cancel" buttons

**`PriceRecommendationCard.tsx`** — Wrap Accept in the confirmation dialog.
**`PriceRecommendationsTable.tsx`** — Same confirmation wrapper for table Accept buttons.
**`PriceRecommendations.tsx`** — "Accept All" gets a confirmation dialog listing count of services and total impact.

### 3. Deep-Link from Inline Alert to Price Intelligence Page
**`PriceRecommendationCard.tsx`** — Add a "View all →" text link that navigates to the Price Intelligence page using the org dashboard path.

### 4. Accept All Error Isolation
**`PriceRecommendations.tsx`** — Replace sequential `mutateAsync` with `Promise.allSettled`, then report "X of Y applied" with failures listed via toast.

### 5. Target Margin Blur-Save
**`PriceRecommendationsTable.tsx`** — Add `onBlur` handler to the target margin input that saves valid values, matching existing Enter key logic.

### 6. Allowance Cost Comparison
**`PriceRecommendationCard.tsx`** and **`PriceRecommendationsTable.tsx`** — If a `service_allowance_policies` row exists, show the allowance amount alongside product cost for comparison context. Requires joining allowance data in the hook.

### 7. Revenue Impact Weighted by Volume (Best-effort)
**`useServicePriceRecommendations.ts`** — Query recent appointment counts per service (last 30 days from `appointments` table if available). Multiply delta × monthly volume for projected impact. Fall back to simple sum if no appointment data.

### 8. Recommendation History View
**New: `PriceRecommendationHistory.tsx`** — Collapsible section on the Price Intelligence page showing recent accept/dismiss actions with timestamps and user info, fetched from `service_price_recommendations`.

### Files Modified/Created
| File | Change |
|------|--------|
| `src/hooks/backroom/useServicePriceRecommendations.ts` | Dismiss filtering, allowance join, volume weighting, history query |
| `src/components/dashboard/backroom-settings/PriceAcceptConfirmDialog.tsx` | New confirmation dialog |
| `src/components/dashboard/backroom-settings/PriceRecommendationCard.tsx` | Confirmation wrapper, deep-link, allowance display |
| `src/components/dashboard/backroom-settings/PriceRecommendationsTable.tsx` | Confirmation wrapper, blur-save, allowance column |
| `src/components/dashboard/backroom-settings/PriceRecommendationHistory.tsx` | New history component |
| `src/pages/dashboard/admin/PriceRecommendations.tsx` | Accept All error isolation, history section, confirmation dialog |

