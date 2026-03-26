

## Improve Allowance Calculator UX

### Current Issues
1. **Product search is per-bowl** — each bowl has its own search input, but there's a shared `productSearch` state so typing in one bowl affects all
2. **No visual distinction between color products and developers** — lines all look the same
3. **Search requires typing** — no browse-by-brand option; users must know product names
4. **No empty state guidance** — Bowl 1 just shows a search input with no hint of what to do
5. **Tiny touch targets** — weight pills and ratio buttons are 10px text with minimal padding
6. **No bottle support** — dialog only says "bowls" but services can use bottles too (container_types from phorest_services)
7. **Product search dropdown clips** — max-h-40 is tight; hard to browse catalog
8. **No "Add Developer" shortcut** — Vish shows a dedicated "Add Developer" button per bowl rather than requiring search

### Plan

**File: `AllowanceCalculatorDialog.tsx`**

1. **Add empty state with instructions** — When a bowl has no lines, show a friendly prompt: "Search and add color products, then pair with a developer" with an icon

2. **Scope search state per-bowl** — Change `productSearch` from a single string to `Record<number, string>` so each bowl's picker is independent

3. **Visual developer distinction** — Add a `FlaskConical` icon and lighter background row for developer lines to differentiate them from color products

4. **Larger touch targets** — Increase pill button padding from `px-2 py-0.5 text-[10px]` to `px-2.5 py-1 text-xs` for better tap accuracy

5. **"Quick Add Developer" button** — After color products in a bowl, show a prominent "+ Add Developer" dashed button that opens a filtered search showing only developer-category products

6. **Bowl subtotal shows weight too** — Add weight subtotal next to cost subtotal in bowl footer (e.g., "45g · $19.69")

7. **Always-visible product picker** — Show the search input always (not gated behind typing); show popular/recent products by default before user types

8. **Per-line weight display for developers** — Show the computed developer weight (e.g., "60g at 2×") so users understand what the ratio produces

### Files Modified
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

