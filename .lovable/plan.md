

## Goal
Two cleanup passes the user flagged after the Top Performers fix:

1. **Rename misnamed helper** so the next dev doesn't burn an hour on the same wire I just hit.
2. **Apply the wide-row layout + whole-dollar rounding** to the sibling ranking cards in the Sales hub.

---

## Pass 1: Fix the misnamed currency helper

### What's wrong
`formatCurrencyWhole` (in both `src/lib/formatCurrency.ts` and `src/hooks/useFormatCurrency.ts`) routes to `formatCurrencyUnified(..., { decimals: 2 })`. The name promises "whole dollars," the implementation emits `$583.00`. Every consumer who trusts the name gets the wrong output.

### Fix
**`src/lib/format.ts`** — add a true whole-dollar shortcut:
```ts
export function formatCurrencyWhole(value, opts) {
  return formatCurrency(value, { ...opts, decimals: 0 });
}
```

**`src/lib/formatCurrency.ts`** — split into two correctly-named exports:
- `formatCurrencyWhole(amount, currency?)` → 0 decimals (rounded, e.g. `$583`)
- `formatCurrencyTwoDecimal(amount, currency?)` → 2 decimals (e.g. `$583.00`)

Keep the old `formatCurrencyWhole` export as a **deprecated alias** that points to `formatCurrencyTwoDecimal` for one pass — this avoids a flash of broken displays in any consumer I miss. Mark with `@deprecated` JSDoc so it shows up in IDE strikethrough.

**`src/hooks/useFormatCurrency.ts`** — same treatment:
- `formatCurrencyWhole` → returns 0-decimal rounded
- Add `formatCurrencyTwoDecimal` → returns 2-decimal
- Update existing callers in this file's exports

### Audit existing call sites
Run a search for `formatCurrencyWhole` across the codebase. For each consumer, decide:
- If the surface clearly wants **whole dollars** (KPIs, ranking cards, dashboards) → leave on `formatCurrencyWhole` (now correctly 0 decimals)
- If the surface clearly wants **cents precision** (invoices, transaction detail, payroll line items) → migrate to `formatCurrencyTwoDecimal`

I'll do a single pass through call sites and bucket each one. Anything ambiguous gets flagged in the response, not silently changed.

---

## Pass 2: Sweep ranking cards for layout + rounding parity

### Targets
Find sibling ranking cards in the Sales hub that share the "rank → name → amount" pattern. Likely candidates based on naming:
- `TopServicesCard` (or equivalent)
- `TopCategoriesCard` (or equivalent)
- `TopProductsCard` / retail ranking variants
- Any card under `src/components/dashboard/sales/` matching `Top*Card.tsx`

I'll enumerate them via search before editing, not assume the file list.

### Apply the same three changes per card
1. **Container query layout**: `flex flex-col @[340px]:flex-row @[340px]:items-baseline @[340px]:justify-between @[340px]:gap-3` on the name+amount row
2. **Anti-overlap guards**: `truncate min-w-0` on label, `shrink-0 whitespace-nowrap` on amount
3. **Whole-dollar rounding**: switch to `formatCurrencyWhole` (now actually whole) or `formatCurrency(Math.round(v), { maximumFractionDigits: 0 })`

Each card must already have `@container` on its outer Card (per the bento system). If a card doesn't, I'll add it — it's a one-class change and doesn't affect anything else.

### Skip list
- KPI tiles (different layout doctrine — value is the focal point, no name/amount pairing)
- Tables (column headers + cell formatting are governed separately)
- Drill-down dialogs (separate spacing rules per drilldown tokens)

---

## Verification
- Grep `formatCurrencyWhole` → all remaining call sites intentionally want whole dollars
- Grep `formatCurrencyTwoDecimal` → only invoice/transaction-precision surfaces
- Visual spot check on each migrated ranking card at:
  - Wide (Command Center sidebar ~520px) → name + amount inline
  - Narrow (mobile / tight column < 340px) → stacked, no overlap
  - Very long names → truncate with ellipsis, amount stays anchored right
- BlurredAmount privacy toggle still functions
- No `$X.00` lingering on any ranking surface

---

## Files (estimate, will confirm during exploration)

**Modify (helper rename)**:
- `src/lib/format.ts` — add `formatCurrencyWhole` shortcut
- `src/lib/formatCurrency.ts` — split into two correctly-named helpers + deprecation alias
- `src/hooks/useFormatCurrency.ts` — split hook return into two correctly-named formatters

**Modify (ranking card sweep)** — finalized after a `Top*Card.tsx` search:
- `src/components/dashboard/sales/TopServicesCard.tsx` (if exists)
- `src/components/dashboard/sales/TopCategoriesCard.tsx` (if exists)
- `src/components/dashboard/sales/TopProductsCard.tsx` (if exists)
- Other sibling ranking cards surfaced by the search

---

## Out of scope
- Renaming `formatCurrencyCompact` (already accurately named)
- Touching invoice / transaction surfaces unless they're already trusting the broken helper to mean whole dollars
- Restyling KPI tiles or tables (different layout doctrine)
- Cross-hub sweep (Operations, Marketing) — Sales hub only this pass; flag as next sweep if it lands clean

---

## Prompt feedback

Strong prompt — you carried forward the previous turn's enhancement suggestions verbatim and asked me to action them, which is exactly the right move when an AI offers follow-on work. Two refinements that would make this kind of follow-up land even tighter:

- **Pin scope explicitly**: "Sales hub only, skip Operations/Marketing for this pass" would have saved me a clarifying decision. You scoped Sales implicitly via the previous context, but stating it removes ambiguity.
- **Specify the deprecation posture**: For renames, telling me "keep a deprecated alias for one pass" vs "hard-rename, fix all callers now" changes the risk profile. Defaulting to "keep alias" is the safer call but worth stating.

Otherwise, this is the prompt pattern I want to see more of: small, surgical, builds on prior context, no scope creep.

