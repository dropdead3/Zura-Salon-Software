

# Bug & Gap Analysis — Pass 3

## Bugs

### Bug 1: Gift Cards PDF references non-existent columns `balance` and `status`
Line 268 in `useBatchReportGenerator.ts` maps `g.balance` and `g.status` but the `gift_cards` table has `current_balance` and `is_active` (boolean). Every gift card row will show `$0.00` balance and empty status.

**Fix:** Map `current_balance` instead of `balance`, and render `is_active ? 'Active' : 'Inactive'` instead of `status`.

### Bug 2: Vouchers PDF references `v.value` and `v.status` — `status` doesn't exist
Line 270 maps `v.value` (correct) and `v.status` (doesn't exist — table has `is_active` and `is_redeemed`). Voucher status will always be blank.

**Fix:** Derive status string from `is_redeemed` / `is_active` fields. Also use `created_at` (which does exist via `issued_by`? No — `vouchers` has no `created_at`). Replace `v.created_at` with `v.valid_from` or remove.

### Bug 3: `v_all_clients` query filters `.eq('is_archived', false)` but doesn't org-scope
Line 178-183: The clients query has no `organization_id` filter. RLS may cover it, but this violates the org-scoping doctrine. Gift cards and vouchers were fixed with `orgId`, but the clients query was missed.

**Fix:** Add `.eq('organization_id', orgId)` if orgId is available (same pattern as gift cards).

### Bug 4: `v_all_appointments` query has no org-scope filter
Lines 200-212: The appointments query lacks `organization_id` filtering. Same gap as clients.

**Fix:** The view may not have `organization_id` directly, but it does have `location_id` which implicitly scopes. However, when `locationId` is not passed (i.e. "All Locations"), the query fetches unscoped data — relying entirely on RLS. Should filter by org's location IDs if no specific location is selected.

### Bug 5: `ScheduledReportsManager` is dead code — imported nowhere
The search confirms `ScheduledReportsManager` is not imported or rendered by any parent component. It duplicates `ScheduledReportsSubTab` but lacks Run Now, uses different UI patterns, and will drift further. Dead code creates confusion.

**Fix:** Delete `ScheduledReportsManager.tsx`.

### Bug 6: `handleRunNow` uses current month but should respect schedule context
Lines 126-128 in `ScheduledReportsSubTab.tsx`: Run Now always uses `startOfMonth(now)` to `endOfMonth(now)`. If the schedule was for "last month" or has a custom date range in `filters`, Run Now ignores it. This is surprising — users expect Run Now to produce the same report the schedule would deliver.

**Fix:** Check `report.filters` for `dateFrom`/`dateTo` and fall back to current month only if absent. Or document this as "generates for the current period."

### Bug 7: `BatchReportDialog` closes immediately after generate completes (line 97)
`onOpenChange(false)` is called right after `generate()` resolves. But `generate()` sets `isGenerating = false` internally. The dialog closes before the user can see the 100% completion state. Minor UX issue.

**Fix:** Add a short delay or show a success state before closing.

### Bug 8: Vouchers query missing `created_at` column
Line 270: `v.created_at?.split('T')[0]` — the `vouchers` table has no `created_at` column. This will always render empty string.

**Fix:** Use `v.valid_from` instead.

## Gaps

### Gap 1: `ScheduleReportForm` doesn't filter report catalog by org tier
`BatchReportDialog` correctly uses `filterReportsByTier` to hide reports unavailable for the org's location count (e.g., single-location orgs don't see "Sales by Location"). `ScheduleReportForm` shows the full `REPORT_CATALOG` unfiltered — users can schedule reports that would produce no data.

**Fix:** Import `useLocations`, compute tier, and filter `REPORT_CATALOG` in the form.

### Gap 2: No `organization_id` column on `v_all_transaction_items` or `v_all_appointments`
These views expose `location_id` but not `organization_id`. This means batch reports for "All Locations" can't be org-filtered at the query level — they rely entirely on RLS. If RLS has any gap, data leaks. Consider adding `organization_id` to the views.

**Note:** This is a view schema change — not blocking but worth addressing in a hardening pass.

---

## Fix Plan

| File | Change |
|---|---|
| `useBatchReportGenerator.ts` | Fix gift card column mapping (`current_balance`, `is_active`); fix voucher column mapping (`is_active`/`is_redeemed`, `valid_from`); add org-scoping to client queries |
| `ScheduledReportsManager.tsx` | Delete (dead code) |
| `ScheduleReportForm.tsx` | Add tier-based report filtering |
| `ScheduledReportsSubTab.tsx` | Consider documenting or fixing Run Now date range behavior |

3 file edits + 1 deletion. No migrations.

