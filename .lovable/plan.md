

## Configure Allowance & Product Allowance Calculator — Gap Analysis (Round 6)

After five rounds, the dialog is at 1,771 lines. Reviewing remaining edge cases, accessibility, error handling, and architectural concerns.

---

### Bugs

**1. `handleSave` keyboard shortcut has stale closure (P1)**
Line 678: The `useEffect` for `Cmd+S` captures `handleSave` in its closure but doesn't list it as a dependency. When bowls change, `handleSave` references the old `bowls` state. Pressing `Cmd+S` after editing may save stale data or fail silently.

**Fix:** Add `handleSave` to the dependency array (wrap `handleSave` in `useCallback` first to avoid infinite re-registrations).

**2. Picker cross-bowl lookup is still O(n) inline IIFE (P2)**
Line 895–900: The product picker's cross-bowl indicator uses an inline `bowls.find(...)` IIFE per product row. This was fixed for bowl lines via `productBowlMap` (line 291) but the picker still does the raw lookup. For large catalogs with many products visible, this is redundant computation.

**Fix:** Reuse the existing `productBowlMap` inside `renderPickerPanel` instead of the inline find.

**3. `clearBowl` has no undo (P2)**
Line 393–401: `clearBowl` removes all lines from a bowl with `toast.success('Bowl cleared')` but provides no undo mechanism. Unlike `removeBowl` and `removeLineFromBowl` which both have undo toasts, clearing a bowl with 10+ products is destructive with no recovery.

**Fix:** Capture the lines before clearing and provide an undo toast that restores them.

**4. Popover doesn't close after confirming suggested price (P2)**
Lines 1603–1629 and 1662–1688: The confirmation Popovers for "Use suggested price" and "Use $X price" have no `onOpenChange` state or programmatic close. After clicking "Confirm", the popover stays open until the user clicks elsewhere, even though the mutation has fired.

**Fix:** Add controlled open state to each Popover and close it in the mutation's `onSuccess`.

---

### Accessibility

**5. Dialog traps focus but scroll area has no keyboard nav (P2)**
The `ScrollArea` containing bowls doesn't support keyboard navigation between bowls. Tab order flows through all interactive elements linearly, which is painful with multiple bowls containing many products. There's no skip-to-footer or skip-to-next-bowl mechanism.

**Fix:** Add `aria-label` to each bowl section and consider a "Skip to footer" link at the top of the scroll area for keyboard users.

**6. Weight preset buttons lack accessible labels (P3)**
Lines 1256–1267: The gram preset buttons (`15g`, `30g`, etc.) have no `aria-label`. Screen readers would announce "15g" which is reasonable but doesn't convey context (e.g., "Set quantity to 15 grams").

**Fix:** Add `aria-label={`Set quantity to ${g} grams`}` to preset buttons.

---

### Data Integrity

**7. `duplicateBowl` doesn't recalculate line costs (P1)**
Line 409–418: When duplicating a bowl, lines are shallow-copied with `{ ...l, localId: crypto.randomUUID() }` but `lineCost` is carried over from the source. If the source bowl's costs were computed with a different `colorQty` context (e.g., after removing a line), the cloned bowl inherits stale costs. The costs aren't recalculated for the new bowl context.

**Fix:** Recalculate `lineCost` for all cloned lines after creating the duplicate bowl.

**8. Empty bowls beyond the first are silently skipped during save (P1)**
Line 604: `if (bowl.lines.length === 0) continue;` skips empty bowls. But the toast on line 576 says they "won't be saved" — the user may not realize their empty Bowl 2 label and position are lost. On next open, they'll only see Bowl 1. If they intentionally kept an empty bowl as a placeholder, it vanishes.

**Fix:** Either save empty bowls (without baselines) so the structure is preserved, or auto-remove empty bowls from state before save and update bowl numbers.

---

### UX Polish

**9. No visual distinction between saved and unsaved allowances in ServiceTrackingSection (P2)**
Line 648–649: The "Unconfigured" badge shows for any tracked service without a finalized config, but there's no distinction between "has allowance but not finalized" vs. "no allowance at all." Both show the same badge.

**Fix:** Add an intermediate state badge like "Allowance Set" (with a different color) for services that have an allowance policy but haven't been marked as configured.

**10. Copy summary uses `catalogProducts.find()` per line (P3)**
Line 1727: Inside the copy summary builder, each line does `catalogProducts.find(p => p.id === l.productId)` to get wholesale cost. The `wholesaleCostMap` already has this data pre-computed.

**Fix:** Use `wholesaleCostMap.get(l.productId)` instead of the find loop.

**11. File size — 1,771 lines is approaching maintenance ceiling (P2)**
The dialog is a single monolithic component. The picker panel (~280 lines), the bowl renderer (~350 lines), and the footer (~290 lines) are all inline. This makes the component hard to review and modify.

**Fix:** Extract `AllowancePickerPanel`, `AllowanceBowlCard`, and `AllowanceFooter` as sub-components in the same directory. Pass state via props or a shared context.

---

### Summary

| Priority | # | Change | Scope |
|----------|---|--------|-------|
| P1 | 1 | Fix stale handleSave in Cmd+S effect | AllowanceCalculatorDialog.tsx |
| P1 | 7 | Recalculate costs in duplicateBowl | AllowanceCalculatorDialog.tsx |
| P1 | 8 | Decide: save empty bowls or auto-remove | AllowanceCalculatorDialog.tsx |
| P2 | 2 | Reuse productBowlMap in picker | AllowanceCalculatorDialog.tsx |
| P2 | 3 | Add undo to clearBowl | AllowanceCalculatorDialog.tsx |
| P2 | 4 | Close popover after price confirmation | AllowanceCalculatorDialog.tsx |
| P2 | 5 | Accessibility — bowl section labels | AllowanceCalculatorDialog.tsx |
| P2 | 9 | Intermediate allowance badge in list | ServiceTrackingSection.tsx |
| P2 | 11 | Extract sub-components (refactor) | New files in backroom-settings/ |
| P3 | 6 | Aria labels on preset buttons | AllowanceCalculatorDialog.tsx |
| P3 | 10 | Use wholesaleCostMap in copy summary | AllowanceCalculatorDialog.tsx |

### Technical Approach

- **Item 1**: Wrap `handleSave` in `useCallback` with proper deps (`bowls`, `orgId`, `serviceId`, etc.), then add it to the `Cmd+S` effect dependency array.
- **Item 7**: After cloning lines in `duplicateBowl`, run the same `colorQty` + `computeLineCost` recalculation loop used elsewhere.
- **Item 8**: Recommend auto-removing empty bowls from state before save (cleaner than saving empty shell rows). Remove the info toast about empty bowls and instead filter them out silently.
- **Item 4**: Add `const [pricePopoverOpen, setPricePopoverOpen] = useState(false)` for each popover and set to `false` in mutation `onSuccess`.
- **Item 11**: Extract three sub-components. The dialog component becomes ~400 lines of state management + composition. Props pass down `bowls`, `setBowls`, callbacks, and computed maps.

