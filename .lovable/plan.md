

# Remaining Gaps & Enhancements: Hourly Wage + Commission Pay

## Issues Found

### 1. `EmployeeProjection` doesn't carry hourly rate or source flag
**File:** `src/hooks/usePayrollForecasting.ts`
The `EmployeeProjection` interface has no `hourlyRate` or `isLevelFallback` field. The `TeamCompensationTable` expanded row hardcodes "80 hrs estimated" text but can't show the actual rate (e.g. "80 hrs × $18/hr") or indicate if the rate came from a level fallback — because that data isn't passed through.

### 2. TeamCompensationTable hardcodes "80 hrs estimated"
**File:** `src/components/dashboard/payroll/analytics/TeamCompensationTable.tsx` (line 128)
The expanded Base Pay cell says `80 hrs estimated` without the actual rate. For hourly employees, it should show `80 hrs × $X/hr` and a "(Level Rate)" indicator when using fallback — matching the My Pay card pattern.

### 3. `usePayrollForecasting` missing from `useMemo` dependency array
**File:** `src/hooks/usePayrollForecasting.ts` (line 310)
The `useMemo` deps include `resolveCommission` but are missing `allLevels`, `allCriteria`, and `employeeLevels`. This means the projection won't recalculate when levels or employee level assignments change until another dep triggers it.

### 4. `BlurredAmount` missing on TeamCompensationTable monetary values
**File:** `src/components/dashboard/payroll/analytics/TeamCompensationTable.tsx`
Per UI Canon, all monetary values must be wrapped in `BlurredAmount`. The table's `formatCurrency` calls render raw dollar amounts without privacy wrapping.

### 5. Duplicate Tips KPI card — low value
**File:** `src/components/dashboard/payroll/analytics/PayrollKPICards.tsx` (line 179-192)
"Tips Collected" uses the same `DollarSign` icon as "Next Payroll Forecast". Per design tokens, each KPI should have a distinct icon. Consider using a dedicated icon (e.g. `HandCoins` or `Banknote`).

### 6. `ai-commission-optimizer` edge function may not handle hourly wage data
The CommissionEconomicsTab now sends `hourly_wage_enabled` and `hourly_wage` in the payload, but the edge function itself may not use these fields in its prompt/logic. Should verify and update if needed.

## Plan

### A. Extend `EmployeeProjection` with hourly rate data (1 file)
- Add `hourlyRate: number | null` and `isLevelHourlyFallback: boolean` to the interface
- Populate them during the projection calculation in `usePayrollForecasting`

### B. Fix `useMemo` dependency array (1 file)
- Add `allLevels`, `allCriteria`, `employeeLevels` to the deps in `usePayrollForecasting`

### C. Enhance TeamCompensationTable expanded row (1 file)
- Show `X hrs × $Y/hr` for hourly employees using the new `hourlyRate` field
- Add "(Level Rate)" badge when `isLevelHourlyFallback` is true
- Wrap all monetary values in `BlurredAmount`

### D. Fix duplicate Tips icon (1 file)
- Change Tips KPI icon from `DollarSign` to a distinct icon (e.g. `Banknote`)

### E. Verify AI optimizer edge function handles hourly wage (1 file)
- Check the edge function prompt/logic includes hourly wage context
- Update if it doesn't reference the new fields

## Summary
- **~4-5 files modified**
- No database changes
- Fixes data flow gaps, privacy compliance, and reactivity bugs

