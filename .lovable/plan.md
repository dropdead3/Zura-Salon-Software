

# Refinement Pass — 10-Point Polish

## Files Changed
| File | Changes |
|------|--------|
| `StockTab.tsx` | Decision header → flat command strip, supplier Create PO for unassigned |
| `CommandCenterRow.tsx` | Human days text, row tint reduction, Add to PO polish, suggested order weight bump |

---

## 1. Decision Header → Command Strip
**StockTab.tsx lines 330-385**

Remove the bordered card feel. Changes:
- Remove `border border-destructive/20` and `bg-destructive/[0.02]` → use `bg-transparent`
- Thin the left accent bar from `w-1` to `w-0.5`
- Keep layout: count + "Items Need Action" on left, buttons on right
- Buttons already correct (filled primary + outline secondary)

## 2. Days Remaining — Human Text
**CommandCenterRow.tsx lines 278-294**

Replace `~{daysRemaining}d` and `0d` with:
- `0` or `out_of_stock` with no intelligence → `"Out now"` in `text-destructive`
- `daysRemaining === 0` → `"Out now"` in `text-destructive`
- `1-3` → `"~Xd left"` in `text-destructive/70`
- `4-7` → `"~Xd left"` in `text-warning/70`
- `8+` → `"~Xd left"` in `text-muted-foreground/40`

## 3. Suggested Order — Slight Weight Bump
**CommandCenterRow.tsx line 331**

Change `text-xl font-medium` → `text-xl font-semibold` for slightly more dominance.

## 4. Row Tint — Further Reduction
**CommandCenterRow.tsx lines 223-224**

- Critical: `bg-destructive/[0.02]` → `bg-destructive/[0.015]`, hover `bg-destructive/[0.03]`
- Low: `bg-warning/[0.015]` → `bg-warning/[0.01]`, hover `bg-warning/[0.025]`

## 5. Unassigned Supplier — Add Create PO
**StockTab.tsx lines 686-708**

Add "Create PO" button for unassigned supplier when `reorderCount > 0`, alongside existing "Assign Supplier" button. Currently only non-unassigned suppliers get "Create PO".

## 6. Usage Context in Expanded Row
**CommandCenterRow.tsx lines 473-484**

Enhance the activity/usage display:
- Change "Active — used daily" → `"Active — ~X/day avg"`
- Change "Slow mover — <1/day" → `"Low activity — ~X/day avg"`
- These already exist; just make the labels more data-rich.

## 7. Auto/Manual Confidence — Already Done
Current styling matches request (Auto = `text-muted-foreground/30`, Manual = `bg-accent/10` pill). No changes.

## 8. "Affects Upcoming Appointments" — Deferred
Requires appointment-to-product data join not currently available. Noted for future.

## 9. Add to PO — Polish
**CommandCenterRow.tsx lines 419-433**

- Add `px-3` (from `px-2.5`) for slightly more padding
- Add `active:scale-[0.98]` for tactile click feel
- Keep existing color states (success/10 for added, primary/10 for not)

## 10. Auto Build PO → Dialog — Already Done
Line 377 already calls `setAutoPoDialog(true)`. The `AutoCreatePODialog` serves as preview. No changes needed.

