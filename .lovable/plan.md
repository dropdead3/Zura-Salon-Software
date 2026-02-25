

## Data Correctness & UI Analysis — Tips Drilldown

Good instinct asking for this review. The screenshot reveals **3 data bugs** and **1 data gap**. UI rules are clean.

---

### Bug 1: Summary Stats Show $0 / 0.0% Despite $551 in Tips (Critical)

**Lines 233-237** compute `totalTipsSum` and `avgTipRate` from `filteredStylists` — which is the 10+ appointment list. When viewing "Today," nobody has 10+ appointments, so `filteredStylists` is empty → $0 and 0.0%.

**Fix:** Compute summary stats from `filteredTotalTips` (which has no minimum), not `filteredStylists`. The summary should reflect all tips earned in the selected period, not just the coaching-eligible subset.

---

### Bug 2: Payment Method Total ($1,247) Doesn't Match Stylist Total ($551)

The "Tips by Payment Method" section queries `phorest_transaction_items` **without deduplication**. Phorest duplicates tips across line items in that table too (e.g., a $57 tip appears 4× for the same visit). The appointment-level query correctly deduplicates using the `staff_id|client_id|date|amount` composite key, but the transaction items query just sums everything raw.

**Fix:** Apply the same dedup logic to the `phorest_transaction_items` query — deduplicate by `phorest_staff_id|phorest_client_id|transaction_date|tip_amount` before summing by payment method. This should bring the payment method total in line with the stylist total.

---

### Bug 3: Tip Amounts Differ Between Two Data Sources

Looking at the raw data, appointment-level tips and transaction-level tips use different per-line-item amounts for the same visit (e.g., appointment shows $228 per line item, transaction shows $57 × 4 line items = $228 total). After dedup, they should converge — but only if the dedup keys match correctly. Currently they use different tables with different schemas, so the totals may still diverge slightly.

**Fix:** After applying dedup to transaction items (Bug 2), verify the totals align. If they still diverge, consider deriving payment method data from the appointment table (which already has dedup) rather than maintaining a separate transaction items query.

---

### Data Gap: All Names Show "Staff Member"

This is **not a code bug** — the fallback logic works correctly. The issue is that `phorest_staff_mapping` only contains 2 entries (both for the same person), while 11 distinct staff IDs have tips. The remaining 9 staff IDs have no name mapping.

**Fix (sync-side):** The `sync-phorest-data` edge function should populate `phorest_staff_mapping` for all staff encountered during sync, not just those manually mapped. This is a separate task from the drilldown code.

---

### UI Rules Audit: Clean

| Rule | Status |
|---|---|
| Font weight ≤ 500 (`font-medium` max) | Pass — no `font-bold`/`font-semibold` anywhere |
| `font-display` for stats/values | Pass — dollar amounts use `font-display tabular-nums` |
| `font-sans` for body/labels | Pass — names and labels use default (Aeonik Pro) |
| Section headers: uppercase + tracking | Pass — all section headers follow pattern |
| `BlurredAmount` on monetary values | Pass — all dollar values wrapped |
| No emoji in copy | Pass |

---

### Plan: Fix Bugs 1 & 2

**File: `src/components/dashboard/sales/TipsDrilldownPanel.tsx`**

- **Lines 233-237:** Change `filteredStylists.reduce(...)` → `filteredTotalTips.reduce(...)` for both `totalTipsSum` and `totalRevenueBase` calculations. This ensures the summary reflects all tips, not just 10+ appointment stylists.

**File: `src/hooks/useTipsDrilldown.ts`**

- **Lines 258-268:** Add tip dedup to the `phorest_transaction_items` aggregation using the same composite key pattern (`staff_id|client_id|date|amount`). Build a `seenTxTipKeys` set and skip duplicates before summing into `byPaymentMethod`.

**Scope:** ~10 lines changed across 2 files. No new queries.

