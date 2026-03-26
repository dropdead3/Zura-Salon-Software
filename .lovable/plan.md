

## Product Allowance Calculator — All Improvements

Implementing all 13 items from the gap analysis across priority tiers.

---

### P0 — Critical

**1. Transactional save (prevent data loss)**
Refactor `handleSave` to collect all delete + insert operations, then execute them in sequence with a try/catch that rolls back on failure. Wrap the delete-all-then-recreate pattern so if any insert fails, the user sees a clear error and existing data is preserved. Use a Supabase RPC or at minimum batch the deletes and inserts so partial failure is detectable.

*File: `AllowanceCalculatorDialog.tsx` (lines 400–475)*

**2. Unsaved changes guard**
- Track `initialBowlsSnapshot` (JSON stringified) on dialog open
- Derive `isDirty` by comparing current bowls to snapshot
- Intercept `onOpenChange(false)` — if dirty, show a sonner warning toast with "Discard & Close" action (matching existing pattern from Business Configuration settings)

*File: `AllowanceCalculatorDialog.tsx`*

---

### P1 — Important

**3. Clamp quantity to minimum 1g**
Change `parseInt(e.target.value) || 0` to `Math.max(1, parseInt(e.target.value) || 1)` on line 840.

*File: `AllowanceCalculatorDialog.tsx` (line 840)*

**4. Fix `as any` type casts**
Update `ServiceRecipeBaseline` interface in `useServiceRecipeBaselines.ts` to include the 4 missing fields: `bowl_id`, `cost_per_unit_snapshot`, `is_developer`, `developer_ratio`. Then remove all `(bl as any)` casts in the dialog's load logic (lines 225–238) and the save update call (line 446).

*Files: `useServiceRecipeBaselines.ts`, `AllowanceCalculatorDialog.tsx`*

**5. Loading skeleton for picker**
Show a skeleton placeholder (3 rows) in `renderPickerPanel` while `catalogProducts` query is loading.

*File: `AllowanceCalculatorDialog.tsx`*

---

### P2 — UX Polish

**6. Cross-bowl duplicate warning**
When adding a product that already exists in another bowl, show an amber badge on the line: "Also in Bowl 1". Non-blocking — just informational.

*File: `AllowanceCalculatorDialog.tsx` (in `addProductToBowl` + render)*

**7. Empty bowl warning on save**
Before saving, if any non-first bowl has 0 lines, show a sonner info toast: "Bowl X is empty and won't be saved."

*File: `AllowanceCalculatorDialog.tsx` (in `handleSave`)*

**8. Undo toast for line removal**
Replace immediate deletion with a sonner toast that includes an "Undo" action. Hold the removed line in a ref for 5 seconds; if undo is clicked, re-insert it.

*File: `AllowanceCalculatorDialog.tsx` (in `removeLineFromBowl`)*

**9. Wholesale cost per line**
Add wholesale cost display inline on each product line: `$X.XX retail · $Y.YY wholesale` (already have the data via `getWholesaleCostPerGram`).

*File: `AllowanceCalculatorDialog.tsx` (line ~816)*

---

### P3 — Enhancements

**10. Duplicate bowl action**
Add a "Copy" icon button next to the delete button on each vessel header. Deep-clones the bowl's lines with new `localId`s.

*File: `AllowanceCalculatorDialog.tsx` (vessel header area, line ~753)*

**11. Bulk quantity adjustment**
Add a small dropdown/popover on each bowl header: "Set all color lines to Xg" with preset options (15, 30, 45, 60, 90g).

*File: `AllowanceCalculatorDialog.tsx`*

**12. Per-bowl health indicator**
Show a small cost-percentage badge on each vessel header (e.g., "4.2% of service") so operators can see which bowl drives cost.

*File: `AllowanceCalculatorDialog.tsx` (vessel header)*

**13. Keyboard navigation in picker**
Add arrow key + Enter support in the brand/category/product lists for power users.

*File: `AllowanceCalculatorDialog.tsx` (renderPickerPanel)*

---

### Summary

| Priority | # | Change | File(s) |
|----------|---|--------|---------|
| P0 | 1 | Transactional save | AllowanceCalculatorDialog.tsx |
| P0 | 2 | Unsaved changes guard | AllowanceCalculatorDialog.tsx |
| P1 | 3 | Clamp qty to min 1g | AllowanceCalculatorDialog.tsx |
| P1 | 4 | Fix `as any` casts | useServiceRecipeBaselines.ts, AllowanceCalculatorDialog.tsx |
| P1 | 5 | Loading skeleton for picker | AllowanceCalculatorDialog.tsx |
| P2 | 6 | Cross-bowl duplicate warning | AllowanceCalculatorDialog.tsx |
| P2 | 7 | Empty bowl warning on save | AllowanceCalculatorDialog.tsx |
| P2 | 8 | Undo toast for line removal | AllowanceCalculatorDialog.tsx |
| P2 | 9 | Wholesale cost per line | AllowanceCalculatorDialog.tsx |
| P3 | 10 | Duplicate bowl action | AllowanceCalculatorDialog.tsx |
| P3 | 11 | Bulk quantity adjustment | AllowanceCalculatorDialog.tsx |
| P3 | 12 | Per-bowl health indicator | AllowanceCalculatorDialog.tsx |
| P3 | 13 | Keyboard navigation | AllowanceCalculatorDialog.tsx |

