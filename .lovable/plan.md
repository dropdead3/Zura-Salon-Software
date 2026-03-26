

## Third-Pass Gap Analysis — Service Price Recommendations Engine

The engine is now solid across core logic, UX safety, and audit trail. Here are the remaining refinements:

---

### 1. DB Function Missing Org Authorization Check (Security)

**Problem:** `accept_price_recommendation` is `SECURITY DEFINER` — it bypasses all RLS. But it trusts the caller-provided `_org_id` without verifying that the calling user is actually a member/admin of that org. A malicious caller could pass any `_org_id` and `_service_id` to modify another org's prices.

**Fix:** Add an authorization guard at the top of the function: `IF NOT public.is_org_admin(auth.uid(), _org_id) THEN RAISE EXCEPTION 'unauthorized'; END IF;`. This ensures the function can only be called by org admins.

---

### 2. Optimistic Cache Key Mismatch (Bug)

**Problem:** In `useAcceptPriceRecommendation.onMutate`, the optimistic update reads/writes `['computed-price-recommendations', orgId]`, but the query itself uses `['computed-price-recommendations', orgId, defaultMargin]` (3-segment key). The `setQueryData` call targets the wrong key, so the optimistic removal silently does nothing.

**Fix:** Either store the full query key consistently or use `queryClient.setQueriesData` with a partial key match: `{ queryKey: ['computed-price-recommendations'] }`. Same issue exists in `useDismissPriceRecommendation`.

---

### 3. DB Function Loops Can Be Single UPDATE Statements (Performance)

**Problem:** The `accept_price_recommendation` function loops over `service_level_prices` and `service_location_prices` row-by-row with `FOR ... LOOP`. For services with many tiers, this is slower than necessary.

**Fix:** Replace the loops with single `UPDATE` statements:
```sql
UPDATE service_level_prices
  SET price = ROUND((price * _ratio)::numeric, 2)
  WHERE service_id = _service_id;
```
Same for `service_location_prices`. Eliminates the loop overhead entirely.

---

### 4. No "Undo" or Revert Capability After Accept

**Problem:** Once a price is accepted, there's no way to revert to the previous price other than manually editing each tier. The history log stores the old price but there's no "undo" action.

**Fix:** Add a "Revert" button in the history view for recently accepted recommendations (e.g., within 24 hours). It would call a similar DB function that reverses the scaling ratio.

---

### 5. `service_price_recommendations` Table Grows Unbounded

**Problem:** Every accept and dismiss inserts a new row. There's no retention policy or cleanup. Over time this table will accumulate thousands of rows that slow down the dismissed-check query.

**Fix:** Add an index on `(organization_id, service_id, status)` if not already present, and optionally add a scheduled cleanup that archives rows older than 90 days.

---

### 6. No Export / Reporting Capability

**Problem:** Owners cannot export the recommendations table or share it with partners/accountants. There's no CSV/PDF export.

**Fix:** Add an "Export CSV" button to the page header that generates a download of the current table view (service, current price, recommended, delta, margin).

---

### 7. Missing Visual Indicator for Services Meeting Target

**Problem:** Services that are on-target show "On target" text in the Action column but have no visual differentiation in the row itself. The table feels like only problem services exist.

**Fix:** Add a subtle left-border color indicator: amber for below-target rows, emerald for on-target rows. This provides instant visual scanning.

---

### Summary

| Priority | Item | Effort |
|----------|------|--------|
| **High** | DB function authorization guard | Trivial |
| **High** | Optimistic cache key mismatch fix | Trivial |
| **Medium** | DB function loop → single UPDATE | Small |
| **Medium** | Index on recommendations table | Trivial |
| **Low** | Undo/revert capability | Medium |
| **Low** | CSV export | Small |
| **Low** | Row visual indicators | Trivial |

### Files Affected

| File | Changes |
|------|---------|
| New migration SQL | Auth guard, loop→UPDATE optimization, add index |
| `src/hooks/backroom/useServicePriceRecommendations.ts` | Fix optimistic cache key in both accept and dismiss mutations |
| `src/components/dashboard/backroom-settings/PriceRecommendationsTable.tsx` | Row border indicators |
| `src/pages/dashboard/admin/PriceRecommendations.tsx` | CSV export button |
| `src/components/dashboard/backroom-settings/PriceRecommendationHistory.tsx` | Revert button (if implementing undo) |

