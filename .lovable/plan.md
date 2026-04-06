

# Critical Gap: Payroll Commission Resolution Uses Median Level for All Employees

## The Problem

`calculateEmployeeCompensation` in `usePayrollCalculations.ts` (line 177) calls a local `calculateCommission` function that **uses the median level's commission rate for every employee**. It completely ignores:

1. **Per-stylist commission overrides** (from `stylist_commission_overrides` table)
2. **Location-based commission overrides** (from `level_commission_overrides` table)
3. **The employee's assigned stylist level** (from `employee_profiles.stylist_level`)

Meanwhile, the forecasting system (`usePayrollForecasting`) correctly uses `useResolveCommission` which handles the full 4-tier override hierarchy: individual override → location override → level default → unassigned.

This means **every actual payroll run** calculates commissions using the wrong rate for any stylist who isn't coincidentally at the median level. This is the most impactful remaining bug — it directly affects real paychecks.

The same bug affects `useMyPayData` — stylists see incorrect commission estimates on their My Pay page.

## Plan

### A. Replace `calculateCommission` with `resolveCommission` in `usePayrollCalculations` (1 file)

**File:** `src/hooks/usePayrollCalculations.ts`

- Import and call `useResolveCommission` inside `usePayrollCalculations`
- Remove the local `calculateCommission` function (lines 120-134) that uses the median level
- Update `calculateEmployeeCompensation` to accept `resolveCommission` as a parameter (or use the hook's instance) and call it with the employee's ID and sales data
- This automatically handles: individual overrides, location overrides, level defaults, and the unassigned fallback

### B. Wire `resolveCommission` through `RunPayrollWizard` (1 file)

**File:** `src/components/dashboard/payroll/RunPayrollWizard.tsx`

- Pass the employee ID into the commission resolution so the correct rate is used per employee during actual payroll generation

### C. Wire `resolveCommission` through `useMyPayData` (1 file)

**File:** `src/hooks/useMyPayData.ts`

- Ensure the current user's commission estimate on My Pay uses the same resolution hierarchy (their override → location → level → default)

## Technical Detail

The `useResolveCommission` hook already exists and is battle-tested in the forecasting path. The fix is to make the payroll calculation path use the same resolution instead of the naive median-level fallback.

```text
Current (broken):
  calculateEmployeeCompensation
    → calculateCommission (median level for ALL employees)

Fixed:
  calculateEmployeeCompensation
    → resolveCommission(userId, serviceRev, productRev, locationId)
      → 1. per-stylist override
      → 2. location commission override
      → 3. stylist level default
      → 4. unassigned (0%)
```

## Summary
- **3 files modified** (`usePayrollCalculations.ts`, `RunPayrollWizard.tsx`, `useMyPayData.ts`)
- No database changes
- This is the single most critical remaining bug — it affects real paycheck amounts for every employee not at the median level

