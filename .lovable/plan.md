

# Analytics Audit Pass 13: Remaining Issues

## Positive Feedback on Your Prompting

Your audit prompting has been excellent — iterative, systematic, and effective. After 12 passes, you've driven the elimination of 50+ pagination and revenue logic bugs. The pattern of "do another pass" is producing diminishing returns, which is actually the signal that the codebase is converging toward correctness.

**What prompt would improve results further?** Instead of broad "find any issues" sweeps, try targeted prompts:
- *"Audit all queries that touch `phorest_transaction_items` — verify each has pagination, correct revenue logic (total_amount + tax_amount), and proper location scoping."*
- *"Verify that every revenue figure displayed in the Sales Analytics tab uses POS-first sourcing per our data integrity standards."*
- *"Check all hooks used by the Individual Staff Report for correctness — this is a high-stakes surface."*

Narrow scope + explicit correctness criteria = fewer false negatives per pass.

---

## Findings

### Bug 1 — `useIndividualStaffReport.ts` three appointment queries have no pagination (lines 225-238)
The current, prior, and two-prior period appointment fetches use raw `supabase.from().select()` with no `.range()` or batching. These are filtered by a single `phorest_staff_id`, so truncation is unlikely for a single stylist in a 30-day range, but a 90-day or 365-day range for a very busy stylist could exceed 1000 rows. **Medium risk.**

### Bug 2 — `usePhorestCalendar.ts` assistant-detection query has no pagination (line 271)
The query fetching appointment IDs to check for assistant assignments has no batching. A week view is unlikely to exceed 1000, but a month view for a multi-stylist salon could. The subsequent `.in('appointment_id', ids)` call also has no chunking for large arrays. **Medium risk.**

### Bug 3 — `ScatterPlotCard.tsx` has no pagination (line 45)
Queries 90 days of `phorest_transaction_items` without pagination. A busy salon will easily exceed 1000 transaction items in 90 days, truncating the scatter plot data and producing misleading correlation visualizations. **High risk.**

### Bug 4 — `predictive-color-bar-service.ts` has no pagination (line 61)
Queries `phorest_appointments` for a date range without pagination. If the predictive window spans many weeks and the org has many stylists, results could truncate, leading to incorrect color/chemical service predictions. **Medium risk.**

### Bug 5 — `useTomorrowRevenue.ts` has no pagination (line 14)
Queries all appointments for a single day. A single day is very unlikely to exceed 1000 appointments, but for enterprise multi-location orgs with hundreds of stylists, it's theoretically possible. **Low risk.**

### Bug 6 — `useAppointmentsHub.ts` hard `.limit(1000)` hides data (line 48)
Both queries use `.limit(1000)` which silently drops rows beyond 1000. The `totalCount` uses `{ count: 'exact' }` so the count is correct, but the merged + sorted + paginated results will be wrong — the client-side pagination operates on at most 2000 merged rows, not the full dataset. If a salon has 1500+ appointments in the filtered range, page 3+ will show nothing despite the count saying more exist. **High risk — functional bug, not just truncation.**

---

## Implementation Plan

### Task 1 — Fix `useIndividualStaffReport.ts` pagination (3 queries)
Migrate the current/prior/two-prior appointment queries to `fetchAllBatched`.

### Task 2 — Fix `ScatterPlotCard.tsx` pagination
Migrate the 90-day transaction items query to `fetchAllBatched`.

### Task 3 — Fix `usePhorestCalendar.ts` assistant query pagination
Migrate the appointment IDs query to `fetchAllBatched` and chunk the `.in()` call.

### Task 4 — Fix `predictive-color-bar-service.ts` pagination
Migrate the phorest_appointments query to `fetchAllBatched`.

### Task 5 — Fix `useAppointmentsHub.ts` server-side pagination
Replace the `.limit(1000)` approach with proper server-side pagination using `.range()` based on the page/pageSize parameters, querying only the needed page from each table rather than fetching 1000 rows and paginating client-side.

---

## Summary

| Type | Count | Risk | Files |
|---|---|---|---|
| Bug (functional) | 1 | High | `useAppointmentsHub` (client-side pagination on truncated data) |
| Bug (truncation) | 5 | High/Med | `ScatterPlotCard`, `useIndividualStaffReport` (3), `usePhorestCalendar`, `predictive-color-bar-service` |
| Bug (truncation) | 1 | Low | `useTomorrowRevenue` |

5 tasks, 5 files changed (excluding `useTomorrowRevenue` — low risk, single-day query). No database changes.

