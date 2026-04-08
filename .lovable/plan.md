

# Analytics Audit Pass 15: Remaining Gaps

## Findings

### Bug 1 (HIGH) — `Transactions.tsx` and `AppointmentsHub.tsx` revenue excludes `tax_amount`

Both pages calculate `totalRevenue` as `sum(total_amount)` only — missing `tax_amount`. Per data integrity standards, Revenue = `total_amount + tax_amount`. These are user-facing summary stats at the top of two high-traffic pages.

- `Transactions.tsx` line 96: `sum + (Number(t.total_amount) || 0)`
- `AppointmentsHub.tsx` line 93: `sum + (Number(t.total_amount) || 0)`

**Fix:** Add `+ (Number(t.tax_amount) || 0)` to both.

### Bug 2 (MEDIUM) — 12 files still use case-sensitive `item_type === 'service'`

Pass 14 fixed the hooks listed in the plan but missed these files that still do direct case-sensitive comparisons:

- `useStylistPeerAverages.ts` (line 161)
- `useAvgTicketByStylist.ts` (line 74)
- `useSalesData.ts` (lines 154, 230)
- `useMyPayData.ts` (line 173)
- `usePayrollAnalytics.ts` (line 94)
- `usePayrollCalculations.ts` (line 115)
- `phorest-adapter.ts` (line 194)
- `YearOverYearComparison.tsx` (line 63)
- `Transactions.tsx` (line 97) — display-only, cosmetic risk
- `AppointmentsHub.tsx` (line 94) — display-only, cosmetic risk
- `TransactionList.tsx` (line 159) — display-only, cosmetic risk

The first 8 are analytics/revenue files where miscategorization affects numbers. The last 3 are display-only (icon/badge styling) — lower risk but should be consistent.

**Fix:** Apply `.toLowerCase()` before comparison in all 12 files.

### Bug 3 (LOW) — `useStylistIncomeForecast.ts` has no pagination (line 41)

Queries `phorest_appointments` for a single stylist's week without pagination. Extremely unlikely to exceed 1000 for one stylist in one week, but for consistency should use `fetchAllBatched`.

**Not fixing** — single-stylist, single-week scope makes truncation effectively impossible.

---

## Implementation Plan

### Task 1 — Fix revenue tax gap in `Transactions.tsx` and `AppointmentsHub.tsx`
Add `tax_amount` to the `totalRevenue` sum in both pages.

### Task 2 — Standardize case-insensitive `item_type` in remaining 8 analytics files
Apply `.toLowerCase()` to `item_type` comparisons in:
- `useStylistPeerAverages.ts`
- `useAvgTicketByStylist.ts`
- `useSalesData.ts`
- `useMyPayData.ts`
- `usePayrollAnalytics.ts`
- `usePayrollCalculations.ts`
- `phorest-adapter.ts`
- `YearOverYearComparison.tsx`

### Task 3 — Standardize case in 3 display files (cosmetic consistency)
Apply `.toLowerCase()` in `Transactions.tsx`, `AppointmentsHub.tsx`, and `TransactionList.tsx` for icon/badge rendering.

---

## Summary

| Type | Severity | Count | Files |
|---|---|---|---|
| Wrong revenue (missing tax) | HIGH | 2 | `Transactions.tsx`, `AppointmentsHub.tsx` |
| Case-sensitive item_type | MEDIUM | 8 | Analytics hooks + adapter |
| Case-sensitive item_type | LOW | 3 | Display components |

3 tasks, 13 files changed. No database changes. These are the stragglers from Pass 14's case-standardization that were missed.

