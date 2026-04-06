

# Final Gaps: Hourly Wage + Commission Pay Systems

## Issues Found

### 1. RunPayrollWizard doesn't pass `employeeLevelSlug` to `calculateEmployeeCompensation`
**File:** `src/components/dashboard/payroll/RunPayrollWizard.tsx` (line 76)
The actual payroll run wizard — the one that generates real paychecks — calls `calculateEmployeeCompensation` without the 6th `employeeLevelSlug` parameter. This means when an owner runs payroll, hourly employees whose rate comes from their stylist level will calculate at $0/hr base pay. This is the most critical bug remaining.

### 2. CompensationBreakdownChart missing `BlurredAmount` on monetary values
**File:** `src/components/dashboard/payroll/analytics/CompensationBreakdownChart.tsx` (line 131)
The legend values (`formatCurrencyWhole(item.value)`) and chart tooltip are rendered without `BlurredAmount` wrapping. Per UI Canon, all monetary values must be privacy-wrapped.

### 3. `usePayrollAnalytics` forecast uses median level commission for all employees
**File:** `src/hooks/usePayrollAnalytics.ts` (lines 206-245)
The `calculateForecast` function uses the median level's commission rate for every employee, ignoring individual overrides or assigned levels. This produces inaccurate forecasts when team members span multiple levels with different rates.

### 4. `calculateCompensationBreakdown` uses fallback multipliers instead of real data
**File:** `src/hooks/usePayrollAnalytics.ts` (lines 272-273)
When `total_base_pay` or `total_service_commissions` are missing from payroll runs, it falls back to `total_gross_pay * 0.55` and `total_commissions * 0.8` — arbitrary ratios that misrepresent the actual compensation mix in the donut chart.

### 5. PayrollKPICards `commissionRatio` uses last run data, not current forecast
**File:** `src/hooks/usePayrollAnalytics.ts` (lines 155-157)
The "Commission Ratio" KPI is derived from the last completed payroll run, while "Base vs Commission" uses the current forecast. These two KPIs measure different time periods, which could confuse owners comparing them side by side.

## Plan

### A. Wire `employeeLevelSlug` into RunPayrollWizard (1 file)
- Fetch `employee_profiles` with `stylist_level` for all active employees
- Pass the matched slug as the 6th arg to `calculateEmployeeCompensation`
- Add to `useMemo` dependency array

### B. Add `BlurredAmount` to CompensationBreakdownChart (1 file)
- Wrap legend values in `BlurredAmount`
- Wrap tooltip formatter output in a privacy-safe pattern (or disable tooltip values when numbers are hidden)

### C. Use per-employee level rates in analytics forecast (1 file)
- In `calculateForecast`, look up each employee's assigned level via `employeeLevels` to get their specific commission rate instead of using the median
- Fall back to median only for employees without an assigned level

### D. Align commission ratio KPI to current forecast (1 file)
- Derive `commissionRatio` from `totalCommissionPay / forecast` instead of last run, so both KPIs reference the same time window

## Summary
- **~3 files modified** (`RunPayrollWizard.tsx`, `CompensationBreakdownChart.tsx`, `usePayrollAnalytics.ts`)
- No database changes
- Fix A is critical — it affects real payroll calculations
- Fixes B-D are correctness and privacy compliance

