

# Refinement Pass — 10 Polish Points

## Files Changed
| File | Changes |
|------|--------|
| `CommandCenterRow.tsx` | Human-friendly days remaining text, row tint reduction, Add to PO padding/contrast, Auto/Manual styling refinement |
| `StockTab.tsx` | Decision header → command strip, supplier Assign button for all + Create PO for selected, column header "Order" micro-label |

---

## 1. Decision Header → Command Strip

**StockTab.tsx lines 329-385**

Remove border glow and card-like feel. Change to a minimal command strip:
- Remove `border border-destructive/20` and `bg-destructive/[0.02]` — use `bg-transparent` or very subtle `bg-muted/10`
- Keep the left accent bar but make it `w-0.5` (thinner)
- Increase the count text clarity: keep `text-2xl font-display` but ensure high contrast
- The overall feel: a flat directive strip, not a bordered alert card

## 2. Days Remaining — Human-Friendly Text

**CommandCenterRow.tsx lines 277-293**

Replace cryptic `~Xd` and `0d` with human-readable labels:
- `0` or out_of_stock → `"Out now"` in `text-destructive`
- `1-3` → `"~Xd left"` in `text-destructive/70`  
- `4-7` → `"~Xd left"` in `text-warning/70`
- `8-14` → `"~Xd left"` in `text-muted-foreground/50`
- `>14` → `"~Xd"` in `text-muted-foreground/40`

## 3. Suggested Order Column Header

**StockTab.tsx — TableHead for Suggested Order**

Add micro-label: change header text from "Suggested Order" to include a secondary `"Order"` label or just simplify the header. The column already says "Suggested Order" — keep as is but the visual dominance from the row values handles this.

## 4. Row Tint — Further Reduction

**CommandCenterRow.tsx lines 222-224**

- Critical: `bg-destructive/[0.02]` → `bg-destructive/[0.015]`, hover stays `bg-destructive/[0.04]`
- Low: `bg-warning/[0.015]` → `bg-warning/[0.01]`, hover stays `bg-warning/[0.03]`

## 5. Supplier Section — Assign Button for All Suppliers

**StockTab.tsx lines 686-708**

Currently "Assign Supplier" only shows for unassigned. Add it for assigned suppliers too (to reassign). Also ensure "Create PO" shows for any supplier with reorder items (already done for non-unassigned). For unassigned with reorder items, also show "Create PO" alongside "Assign Supplier".

## 6. Expanded Row — Usage Context

**CommandCenterRow.tsx lines 458-470**

Enhance the activity label to be more contextual:
- Instead of just "Active — used daily", show "Active — ~X/day avg"
- Keep "Slow mover — <1/day" as is

## 7. Auto vs Manual Confidence — Already Good

Current implementation matches the request. Auto is `text-muted-foreground/30`, Manual is `bg-accent/10` with accent text. No changes needed.

## 8. "Affects Upcoming Appointments" — Deferred

This requires joining inventory data with appointment/service data. Not implementable without a new query joining products → services → appointments. Flag for future implementation.

## 9. Add to PO — Slight Polish

**CommandCenterRow.tsx lines 405-419**

- Increase horizontal padding from `px-2.5` to `px-3`
- Ensure hover state is crisp: add `active:scale-[0.98]` for tactile feel

## 10. Auto Build PO — Already Wired to Dialog

Current implementation already opens `AutoCreatePODialog` when clicking "Auto Build PO" (line 377: `onClick={() => setAutoPoDialog(true)}`). The dialog serves as the preview/confirmation step. No changes needed.

---

## Summary of Actual Edits

1. **StockTab.tsx**: Strip decision header down to flat command strip (remove border/bg), add Create PO for unassigned suppliers with reorder items
2. **CommandCenterRow.tsx**: Human-friendly days text ("Out now", "~Xd left"), reduce row tints further, polish Add to PO button padding

