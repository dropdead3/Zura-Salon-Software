

## Second-Pass Gap Analysis — Service Price Recommendations Engine

After reviewing all implementation files, here are the remaining gaps and enhancements:

---

### 1. History Log Missing Service Name (UX Gap)

**Problem:** `PriceRecommendationHistory` displays price changes but doesn't show *which service* was affected. The `service_price_recommendations` table has no `service_name` column, and the history query doesn't join to `services`.

**Fix:** Join `services.name` in the history query (`usePriceRecommendationHistory`) and display the service name in each history row.

---

### 2. Accept Mutation Is Not Transactional (Data Integrity Risk)

**Problem:** `useAcceptPriceRecommendation` performs 4+ sequential Supabase calls (update base price, loop through level prices, loop through location prices, insert log). If any middle step fails, the service is left in a partially updated state — some tiers at the old price, some at the new price.

**Fix:** Move the accept logic into a database function (`accept_price_recommendation`) that performs all updates in a single transaction and call it via `.rpc()`. This ensures atomicity — either all prices update or none do.

---

### 3. No Sorting or Filtering on the Price Intelligence Table

**Problem:** The recommendations table has no way to sort by margin gap, delta, volume, or category. With many services this becomes hard to prioritize.

**Fix:** Add sortable column headers (click to toggle asc/desc) and a category filter dropdown above the table.

---

### 4. Appointments Query May Return Wrong Data

**Problem:** The appointment volume query filters by `service_id` on the `appointments` table, but appointments can have multiple services (via `appointment_services`). The `service_id` on `appointments` may be the primary service only, undercounting volume for secondary services.

**Fix:** Check if `appointment_services` is the correct join table for accurate per-service volume. If so, query that instead.

---

### 5. No Default Target Margin for New Services

**Problem:** When a new tracked service has no row in `service_price_targets`, the engine defaults to 60% in code. There's no UI to configure this organization-wide default, so the owner must manually set targets for every service.

**Fix:** Add an "Organization Default Margin" setting (stored in org settings or a dedicated config row) that the engine uses as fallback. Surface it as an editable field at the top of the Price Intelligence page.

---

### 6. Stale Recommendation After Price Accept

**Problem:** After accepting a recommendation, the inline `PriceRecommendationCard` may briefly re-render the old recommendation before query invalidation completes, causing a flash of outdated data.

**Fix:** Use optimistic updates — immediately remove the recommendation from the local cache on accept, then let the background refetch confirm.

---

### 7. Bulk Accept Shows Stale Button State

**Problem:** `handleAcceptAll` uses `Promise.allSettled` with individual `mutateAsync` calls, but the "Accept All" button only checks `acceptMutation.isPending`. Since `allSettled` doesn't throw, the button may not show a loading state for the full duration.

**Fix:** Add a local `isBulkAccepting` state that wraps the entire `handleAcceptAll` flow, disabling the button from start to finish.

---

### 8. Missing Mobile Responsiveness on Table

**Problem:** The 11-column `PriceRecommendationsTable` will overflow or be unusable on mobile/tablet viewports. No responsive handling is present.

**Fix:** On mobile, switch to a card-based layout (reuse `PriceRecommendationCard` per row) instead of the table. Use `useIsMobile()` to toggle.

---

### Summary

| Priority | Item | Effort |
|----------|------|--------|
| **High** | Transactional accept via DB function | Medium |
| **High** | History missing service name | Small |
| **Medium** | Table sorting & filtering | Medium |
| **Medium** | Appointment volume from correct table | Small |
| **Medium** | Org-wide default margin setting | Small |
| **Low** | Optimistic update on accept | Small |
| **Low** | Bulk accept loading state | Trivial |
| **Low** | Mobile responsive table | Medium |

