

# Gaps, Improvements & Enhancements: Hourly Wage + Commission Pay Systems

## Gaps Found

### 1. `usePayrollAnalytics` forecast ignores level-based hourly wage fallback
**File:** `src/hooks/usePayrollAnalytics.ts` (line 202)
The `calculateForecast` function uses `emp.hourly_rate || 0` directly without falling back to the level's `hourly_wage`. The same fallback we added to `usePayrollForecasting` was never mirrored here, so the PayrollKPICards "Next Payroll Forecast" will undercount base pay for hourly employees whose rate comes from their level.

### 2. `useMyPayData` doesn't pass `employeeLevelSlug` to `calculateEmployeeCompensation`
**File:** `src/hooks/useMyPayData.ts` (line 214)
The My Pay page calls `calculateEmployeeCompensation` without the 6th `employeeLevelSlug` parameter, so stylists with level-defined hourly wages but no personal `hourly_rate` will see $0 base pay on their My Pay page.

### 3. My Pay "Current Period" card doesn't show hourly rate source
**File:** `src/components/dashboard/mypay/CurrentPeriodCard.tsx`
When base pay comes from a level-defined hourly wage (fallback), there's no indication of the rate being used. Stylists see a dollar amount but don't know their effective rate or that it comes from their level.

### 4. Economics calculator hardcodes 160 hrs/month for hourly wage cost
**File:** `src/components/dashboard/settings/CommissionEconomicsTab.tsx` (line 343)
The `160` constant assumes full-time. Should use an assumption input (like `hours_per_month`) so part-time or varied schedules can be modeled. This is a material margin modeling error for salons with part-time hourly staff.

### 5. AI optimizer doesn't include hourly wage data
**File:** `src/components/dashboard/settings/CommissionEconomicsTab.tsx` (line 152)
The payload sent to `ai-commission-optimizer` doesn't include `hourly_wage_enabled` or `hourly_wage` per level, so AI recommendations can't factor in base wage costs when optimizing commission rates.

### 6. `computeEconomics` doesn't natively understand hourly wages
**File:** `src/hooks/useCommissionEconomics.ts`
The overhead adjustment for hourly wages is done ad-hoc in the UI component. The core `computeEconomics` function should accept an optional `hourly_wage_cost` parameter so all callers get consistent math.

### 7. Team Compensation Table doesn't show pay type breakdown for hourly employees
**File:** `src/components/dashboard/payroll/analytics/TeamCompensationTable.tsx`
The expanded row shows "Base Pay" generically but doesn't distinguish hourly rate × hours from salary. Hourly employees should see their effective rate and estimated hours.

### 8. PayrollKPICards missing "Hourly vs Commission" split KPI
**File:** `src/components/dashboard/payroll/analytics/PayrollKPICards.tsx`
No KPI showing the ratio of hourly base pay to commission pay across the team. Owners need this to understand their compensation structure mix.

### 9. Earnings Breakdown card level matching is fragile
**File:** `src/components/dashboard/mypay/EarningsBreakdownCard.tsx` (line 31-38)
Level detection uses reverse-engineering from commission rate math (`effectiveRate ≈ level.service_commission_rate`). Should instead fetch the employee's `stylist_level` slug from their profile for accurate matching.

## Plan

### Phase 1: Fix Critical Gaps (data correctness)

**A. Wire level-based hourly fallback into `usePayrollAnalytics`** (1 file)
- In `calculateForecast`, accept `allLevels` and `employeeLevels` arrays
- Apply same fallback logic: if `emp.hourly_rate` is 0/null, look up level's `hourly_wage`
- Requires fetching `employee_profiles` with `stylist_level` in the hook

**B. Pass `employeeLevelSlug` in `useMyPayData`** (1 file)
- Fetch current user's `stylist_level` from `employee_profiles`
- Pass it as the 6th arg to `calculateEmployeeCompensation`

**C. Fix `EarningsBreakdownCard` level detection** (1 file)
- Fetch employee's `stylist_level` slug from profile instead of reverse-engineering from rate
- Use it to look up the correct level from `useStylistLevels`

### Phase 2: Economics Calculator Improvements

**D. Add configurable hours/month assumption** (2 files)
- Add `hours_per_month` to `EconomicsAssumptions` (default 160)
- Surface as a 4th input in the Business Assumptions panel
- Use `hours_per_month * hourly_wage` instead of hardcoded `160`

**E. Include hourly wage in AI optimizer payload** (1 file)
- Add `hourly_wage_enabled` and `hourly_wage` to the level data sent to the edge function

**F. Move hourly wage cost into `computeEconomics`** (2 files)
- Add optional `hourlyWageCost` param to `computeEconomics` and `computeMarginAtRevenue`
- Simplify the UI component to just pass the value

### Phase 3: Pay Visibility Enhancements

**G. Show effective hourly rate on My Pay** (1 file)
- In `CurrentPeriodCard`, show "Hourly Pay (X hrs × $Y/hr)" when applicable
- Add a subtle badge "(Level Rate)" when fallback is used

**H. Enhance Team Compensation expanded row** (1 file)
- Show hourly rate × hours breakdown for hourly pay types
- Show "(from level)" indicator when using level fallback

**I. Add Hourly vs Commission Mix KPI** (2 files)
- Add `hourlyVsCommissionRatio` to `PayrollKPIs`
- Show as a new KPI card: "Base vs Commission" with percentage split

### Summary
- **~10 files modified** across hooks, UI components, and economics calculator
- **No database changes** needed
- Phase 1 fixes data correctness bugs introduced by incomplete hourly wage wiring
- Phase 2 improves the margin modeling accuracy
- Phase 3 enhances pay transparency for both owners and stylists

