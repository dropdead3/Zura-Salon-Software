

## Configure Allowance & Product Allowance Calculator — Gap Analysis (Round 3)

Full review of AllowanceCalculatorDialog.tsx (1,483 lines), ServiceTrackingSection integration, allowance-health.ts, and supporting hooks.

---

### Bugs / Technical Debt

**1. `(policy as any)` casts in ServiceTrackingSection (lines 750–751)**
`allowance_health_status` and `allowance_health_pct` are accessed via `(policy as any)` even though these columns exist in the generated types for `service_allowance_policies`. The policy type in the hook should include these fields natively, removing the need for unsafe casts.

**2. `(err: any)` in handleSave catch block (line 608)**
The `catch (err: any)` in `handleSave` should use `catch (err: unknown)` with a type guard (`err instanceof Error ? err.message : 'Unknown error'`) for proper TypeScript safety.

**3. Save Phase 2 race condition: upsert then update by composite key**
Lines 564–583: For each line, a baseline is first inserted via `upsertBaseline.mutateAsync()`, then immediately updated by matching `(org_id, service_id, product_id)`. If the same product exists in multiple bowls (which is valid — same color in Bowl 1 and Bowl 2), the update at line 573 will match the wrong row because it filters by `product_id` without `bowl_id`. This means the second bowl's baseline overwrites the first bowl's `bowl_id`.

**4. Missing error handling on the Phase 2 update call (line 573)**
The `supabase.from('service_recipe_baselines').update(...)` at line 573 doesn't check for errors. A failed update silently continues, leaving baselines with null `bowl_id`.

**5. `retailCostPerGram` rounds to 2 decimal places (line 52 in allowance-health.ts)**
`calculateRetailCostPerGram` uses `r2()` which rounds to 2 decimal places. For per-gram costs that are fractions of a cent (e.g., $0.0347/g), this rounds to $0.03 — a 14% error. Should use 4 decimal places for per-gram costs.

---

### UX Gaps

**6. No loading state while save is in progress**
The save button shows a spinner, but the entire dialog body remains interactive. Users can modify bowls mid-save, creating inconsistency between what was saved and what's on screen. The dialog body should be disabled or overlaid during save.

**7. Dirty-state detection ignores label edits and modeled price**
The `isDirty` check (line 182) only tracks product/quantity/ratio/vesselType changes. Editing a bowl label or changing the modeled service price doesn't flag the dialog as dirty, so closing silently discards those changes.

**8. Modeled service price is not persisted**
When a user types a custom price in the footer input (line 1326), it's only held in state and discarded on close. There's no "Apply this price" action — the "Use suggested price" button (line 1402) only appears for the health-recommended price. Users who model a different scenario price have no way to save it.

**9. Product picker empty state shows skeleton even when catalog is genuinely empty**
Line 624: `catalogProducts.length === 0` triggers skeleton loading. But if the catalog genuinely has zero Supplies products, the user sees infinite skeleton instead of an empty state message like "No supply products found."

**10. Bowl label input doesn't auto-select text on edit**
When clicking a bowl label to edit (line 923), the input appears but the text isn't selected. The user has to manually select-all before typing a new name.

**11. No visual distinction between bowl and bottle vessel types**
Bowls and bottles use different icons, but the card styling is identical. For multi-vessel services, a subtle color or border difference would help operators quickly distinguish container types.

---

### Enhancements

**12. Suggested allowance amount not surfaced for "low" health status**
`calculateAllowanceHealth` computes `suggestedAllowance` when status is "low" (line 87), but the UI only surfaces `suggestedServicePrice` for "high" status (line 1395). When allowance is below 6%, the user gets advisory text but no actionable number or button to auto-adjust.

**13. Health badge in service table row should link to calculator**
The health badge in ServiceTrackingSection (line 758–771) shows the percentage but isn't clickable. Clicking it should open the calculator for that service, same as the "Edit" button next to it.

**14. No confirmation when "Use suggested price" is clicked**
Line 1402: Clicking "Use $X suggested price" immediately mutates the service price in the database. This is a destructive action that should have a brief confirmation or at minimum an undo toast, since it changes a price visible to other parts of the system.

**15. Copy summary doesn't include wholesale costs**
The clipboard summary (line 1436) includes product names, quantities, and line costs, but doesn't include the wholesale vs. retail breakdown or the margin. Operators sharing recipes with finance teams need this context.

**16. No way to reorder products within a bowl**
Products appear in the order they were added. For operators managing 8+ products per bowl, drag-to-reorder or at minimum a sort-by-cost/name option would improve usability.

---

### Summary

| Priority | # | Change | File(s) |
|----------|---|--------|---------|
| P0 | 3 | Fix multi-bowl same-product save bug | AllowanceCalculatorDialog.tsx |
| P0 | 4 | Add error handling to baseline update | AllowanceCalculatorDialog.tsx |
| P1 | 1 | Remove `as any` casts in ServiceTrackingSection | ServiceTrackingSection.tsx, useServiceAllowancePolicies.ts |
| P1 | 2 | Fix `catch (err: any)` to use unknown | AllowanceCalculatorDialog.tsx |
| P1 | 5 | Fix retail cost per gram rounding | allowance-health.ts |
| P1 | 6 | Disable dialog body during save | AllowanceCalculatorDialog.tsx |
| P1 | 9 | Fix skeleton vs empty catalog state | AllowanceCalculatorDialog.tsx |
| P2 | 7 | Include label/price in dirty detection | AllowanceCalculatorDialog.tsx |
| P2 | 8 | Add "Apply modeled price" action | AllowanceCalculatorDialog.tsx |
| P2 | 10 | Auto-select label text on edit | AllowanceCalculatorDialog.tsx |
| P2 | 12 | Surface suggested allowance for "low" | AllowanceCalculatorDialog.tsx |
| P2 | 14 | Add undo toast for suggested price | AllowanceCalculatorDialog.tsx |
| P3 | 11 | Visual distinction for vessel types | AllowanceCalculatorDialog.tsx |
| P3 | 13 | Make health badge clickable | ServiceTrackingSection.tsx |
| P3 | 15 | Include wholesale in copy summary | AllowanceCalculatorDialog.tsx |
| P3 | 16 | Product reorder within bowl | AllowanceCalculatorDialog.tsx |
