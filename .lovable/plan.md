

# Add Hourly Wage Toggle and Starting Wage to Stylist Levels

## Overview
Add `hourly_wage_enabled` (boolean) and `hourly_wage` (numeric) columns to the `stylist_levels` table, then wire the toggle and input into the Stylist Levels Editor UI and downstream payroll systems.

## Database Migration

Add two columns to `stylist_levels`:
```sql
ALTER TABLE public.stylist_levels
  ADD COLUMN hourly_wage_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN hourly_wage numeric DEFAULT null;
```

## UI Changes

### File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Extend `LocalStylistLevel` type** — add `hourlyWageEnabled: boolean` and `hourlyWage: string`.

**2. Collapsed header row** — widen grid to include a new column showing the hourly wage when enabled (e.g. `$18/hr` or `—`). Adjust `grid-cols` from 7 to 8.

**3. Expanded card details** — below the Service/Retail commission fields, add:
- A `Switch` toggle labeled "Hourly Wage" with a `MetricInfoTooltip` explaining: "Enable if stylists at this level receive an hourly base wage in addition to or instead of commission."
- When toggled on, show an input field for "Starting Hourly Wage" with a `$` prefix and `/hr` suffix.

**4. Criteria Comparison Table** — add an "Hourly Wage" row in the Compensation section (alongside Service/Retail Commission) showing `$X/hr` or `—`.

**5. Quick Setup Wizard** — no hourly wage defaults (leave off). Users enable per-level after generation.

**6. Hydration and save logic** — update `useEffect` that seeds local state and `handleSave`/`handleQuickSetup` to include `hourly_wage_enabled` and `hourly_wage`.

### File: `src/hooks/useStylistLevels.ts`

**7. Extend `StylistLevel` interface** — add `hourly_wage_enabled: boolean` and `hourly_wage: number | null`.

**8. `useSaveStylistLevels`** — include `hourly_wage_enabled` and `hourly_wage` in both update and insert operations. Add audit logging for hourly wage changes.

### File: `src/hooks/usePayrollForecasting.ts`

**9. Fallback hourly rate** — when calculating base pay for `hourly` or `hourly_plus_commission` employees, if the employee's `hourly_rate` in `employee_payroll_settings` is null/0 but their assigned stylist level has `hourly_wage_enabled` with a value, use the level's `hourly_wage` as the default rate.

### File: `src/hooks/usePayrollCalculations.ts`

**10. Same fallback logic** — mirror the level-based hourly wage fallback in the payroll calculation engine.

### File: `src/components/dashboard/settings/CommissionEconomicsTab.tsx`

**11. Economics calculator** — include hourly wage cost in the margin model when a level has hourly enabled, so overhead calculations reflect the base wage liability.

### File: `src/components/dashboard/settings/LevelRequirementsPDF.ts`

**12. PDF export** — include hourly wage info in the exported progression roadmap when enabled for a level.

## Summary
- **1 migration** (2 columns on `stylist_levels`)
- **~6 files modified** across editor UI, hooks, payroll calculations, and PDF export
- No RLS changes needed (existing policies on `stylist_levels` already cover these columns)

