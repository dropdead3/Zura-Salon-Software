

# Fix Criteria Table UI + Resolve Build Errors

## Issues Identified

### 1. "Strange top left corner" — Sticky header cell clipping
The `Metric` header cell (line 267) uses `sticky left-0 bg-card z-10`. Because the parent `ScrollableTableWrapper` has `rounded-xl border`, the sticky cell's square `bg-card` background bleeds past the rounded corner, creating a visible artifact. The same issue affects all sticky `TableCell` elements in the body rows (lines 310, 338, 384).

**Fix:** Add `first:rounded-tl-xl` to the sticky header cell so its background respects the parent's border radius. Also ensure the first body row's sticky cell doesn't overlap the corner.

### 2. Build Errors — `formatCurrency` not found
The reported build errors at lines 374/377/381/554 reference bare `formatCurrency`. The current file uses `formatCurrencyLocal` at those positions, suggesting the build cache is stale. However, to be safe, I'll verify the file compiles cleanly and ensure no stale references exist.

### 3. UI Enhancements for the Criteria Table
- The `Metric` column header should use `tokens.table.columnHeader` per design canon (font-sans, Title Case)
- Level name headers in columns should also follow token styling
- Section header rows ("Compensation — At This Level", etc.) use `font-medium` which is acceptable but should use `font-display` per design canon for section kickers
- The `Edit` buttons under level names have inconsistent conditional logic (lines 272-290) — the `idx === 0 && !level.dbId` vs `idx === 0 && level.dbId` branches duplicate the same Edit button; simplify

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | Fix sticky corner radius on Metric header, simplify Edit button conditionals, apply `tokens.table.columnHeader` |
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | Verify/fix any remaining `formatCurrency` references (ensure `formatCurrencyLocal` is used everywhere) |

**2 files. No new files. No database changes.**

