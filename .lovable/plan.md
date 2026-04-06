
# Final Median-Level Commission Fallbacks

## Issues Found

### 1. `ExecutiveSummaryCard` uses median-level commission for liability estimate
**File:** `src/components/dashboard/analytics/ExecutiveSummaryCard.tsx` (lines 248-254)
The "Commission Liability" KPI calculates total commission using the median level's rate for ALL stylists. Since `useSalesByStylist` returns `user_id` per stylist, we can resolve each user's actual rate via `useResolveCommission`.

### 2. `PayrollSummaryReport` uses median-level commission for PDF report
**File:** `src/components/dashboard/reports/PayrollSummaryReport.tsx` (lines 60-71)
The downloadable Payroll Summary PDF calculates commissions using the same median-level fallback, producing inaccurate per-stylist commission figures in the report.

## Plan

### A. Fix ExecutiveSummaryCard (1 file)
- Import `useResolveCommission`
- Replace local `calculateCommission` with `resolveCommission(userId, serviceRev, productRev)`
- The stylist data from `useSalesByStylist` already includes `user_id`

### B. Fix PayrollSummaryReport (1 file)
- Import `useResolveCommission`
- Replace local `calculateCommission` with per-user resolution
- Update commission row mapping to use `resolveCommission(s.user_id, ...)`

## Summary
- **2 files modified** — no database changes
- Eliminates the last remaining median-level fallback instances
- Commission liability and PDF reports will now reflect actual per-stylist rates
