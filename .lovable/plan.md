

# Fix Build Errors — Two Quick Patches

## Issue 1: `kpis.wasteByCategory` / `kpis.totalWasteQty` don't exist

The `WasteCategoryBreakdownCard` in `BackroomDashboardOverview.tsx` (line 474-477) references `kpis.wasteByCategory` and `kpis.totalWasteQty`, but these fields aren't on the `kpis` object returned by `useBackroomDashboard`.

**Fix:** Add `wasteByCategory` and `totalWasteQty` to the dashboard hook's return value (from `analyticsQ.data`), then reference `dashboard.wasteByCategory` and `dashboard.totalWasteQty` in the overview component instead of `kpis.*`.

### `useBackroomDashboard.ts`
- Add to the return object:
  ```ts
  wasteByCategory: analyticsQ.data?.wasteByCategory ?? {},
  totalWasteQty: analyticsQ.data?.totalWasteQty ?? 0,
  ```

### `BackroomDashboardOverview.tsx` (lines 474-477)
- Change `kpis.wasteByCategory` → `dashboard.wasteByCategory`
- Change `kpis.totalWasteQty` → `dashboard.totalWasteQty`

## Issue 2: `ReorderApprovalCard.tsx` — Add batch approve + auto-generated badge

The previous edit didn't land. Apply:
- Add a "Batch Approve All" button in the card header (only when 2+ drafts)
- Add an "Auto" badge on POs where `import_source === 'auto_reorder'` or `notes` contains "auto"
- Wire batch approve to call `handleApprove` for all draft POs sequentially

### Files Modified
1. `src/hooks/backroom/useBackroomDashboard.ts` — add 2 fields to return
2. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — fix 2 references
3. `src/components/dashboard/analytics/ReorderApprovalCard.tsx` — batch approve + auto badge

