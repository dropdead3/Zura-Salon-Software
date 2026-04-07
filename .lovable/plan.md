

# Fix Level Criteria Table PDF to Match UI for Level 1

## Problem
The PDF export only reads from `promotion_criteria` for all levels in the PROMOTION section. But the UI shows **retention minimums** for Level 1's promotion KPI rows (Revenue, Retail %, Rebooking %, etc.). This causes Level 1 values like "$2.5K Revenue" to appear as "—" in the PDF.

## Root Cause
In the UI (`StylistLevelsEditor.tsx`), Level 1 (index 0) promotion KPI rows are sourced from `retention_criteria` fields (`revenue_minimum`, `retail_pct_minimum`, etc.) instead of `promotion_criteria`. The PDF generator (`LevelCriteriaTablePDF.ts`) doesn't have this logic — it calls `findPromo()` for every level uniformly.

## Fix

### File: `src/components/dashboard/settings/LevelCriteriaTablePDF.ts`
- For each promotion KPI row (Revenue, Retail %, Rebooking %, Avg Ticket, Client Retention, New Clients, Utilization, Rev/Hr), check if the level is index 0
- If index 0, read from retention criteria fields (`revenue_minimum`, `retail_pct_minimum`, etc.) instead of promotion criteria
- Non-KPI rows (Level Tenure, Eval Window, Approval) remain promotion-only for all levels — matching the UI behavior
- Add a `findRetention` lookup parameter to each promo row lambda for Level 1 fallback

The logic mirrors the `isBaseLevelRetention` pattern already established in the UI component.

## Files Changed
| File | Change |
|---|---|
| `LevelCriteriaTablePDF.ts` | Add Level 1 retention-fallback logic for promotion KPI rows |

1 file, no database changes.

