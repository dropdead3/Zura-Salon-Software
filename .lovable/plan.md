

# Remove OperatorPerformanceStrip — Plan

## What's Happening

The `OperatorPerformanceStrip` (Revenue + Rebooking KPI tiles) duplicates data already available in the pinnable analytics cards. The user wants it deleted entirely.

## Changes

| File | Action |
|---|---|
| `src/components/dashboard/operator/OperatorPerformanceStrip.tsx` | **DELETE** |
| `src/pages/dashboard/DashboardHome.tsx` | Remove import and `operator_performance` section entry |
| `src/hooks/useDashboardLayout.ts` | Remove `'operator_performance'` from `DEFAULT_LAYOUT.sections`, `sectionOrder`, and the migration array |

3 files touched. No database changes. Straightforward deletion.

