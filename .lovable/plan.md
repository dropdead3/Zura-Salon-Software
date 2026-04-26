## Goal

In the org dashboard's **Simple view**, prevent compact cards from squeezing below a comfortable size, and shorten large currency values so they never overflow the card.

## Observations

- Compact tiles render via `PinnedAnalyticsCard.tsx` (lines 386–615) inside the grid in `src/pages/dashboard/DashboardHome.tsx` (line 796).
- Current grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-{n}` with `n` forced to 3 or 4 based on pinned-card count. At ~1025px viewport with 8 cards, `lg:grid-cols-4` produces ~240px-wide cards — wide enough that `$20,263.00` *just* fits but feels cramped.
- `useFormatCurrency()` already exposes `formatCurrencyCompact` which produces `$20.3K`-style output. It is currently used in only one place (`service_mix`).
- The compact metric value renders at line 584: `<BlurredAmount className="font-display text-2xl font-medium">{metricValue}</BlurredAmount>`.

## Approved Decisions

- **Min card width:** 260px floor (cards drop to 3 columns earlier rather than compress below 260px).
- **Currency truncation:** Always switch to compact form in simple view when value `>= $1,000`. Below that, keep exact display (e.g. `$842`).

## Plan

### 1. Enforce a 260px minimum in the simple-view grid

Replace the bracketed `lg:grid-cols-N` ladder in `src/pages/dashboard/DashboardHome.tsx` (lines 796–802) with a CSS-grid auto-fit pattern that respects a 260px floor:

```tsx
<div
  className="grid gap-4"
  style={{
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  }}
>
  {pinnedCardIds.map(cId => (
    <PinnedAnalyticsCard key={`pinned:${cId}`} cardId={cId} filters={analyticsFilters} compact={compact} />
  ))}
</div>
```

- Auto-fit lets the browser pack as many ≥260px columns as fit, then redistributes leftover width equally — no more 230px squeeze.
- Removes the brittle `pinnedCardIds.length`-based class ladder.
- At 1141px viewport (current): packs 4 columns at ~265px each. At 1024px: 3 columns at ~330px. At 768px: 2 columns. Mobile (<540px): 1 column.

### 2. Add a small helper for "smart compact currency" in simple view

Inside `PinnedAnalyticsCard.tsx`, add a local helper near the existing formatters:

```ts
const formatCurrencySmart = (amount: number) =>
  Math.abs(amount) >= 1000 ? formatCurrencyCompact(amount) : formatCurrencyWhole(amount);
```

Then in the `if (compact) { ... switch (cardId) }` block (lines 399–559), replace `formatCurrencyWhole(...)` with `formatCurrencySmart(...)` for every metric that displays a currency value:

- `executive_summary` (line 401)
- `sales_overview` (lines 408, 410, 412)
- `daily_brief` (line 419)
- `top_performers` (line 425)
- `revenue_breakdown` (line 441) — both halves
- `week_ahead_forecast` (line 517)
- (`service_mix` line 475 already uses `formatCurrencyCompact` — leave as-is)

This is **scoped to the compact branch only** — detailed cards remain unaffected.

### 3. Tighten metric typography for safety

The compact value uses `text-2xl` at line 584. Add `truncate` and a hairline reduction at narrow widths so any edge case (very long compact strings like `$1.2M`) stays on one line:

```tsx
<BlurredAmount className="font-display text-2xl font-medium truncate block">
  {metricValue}
</BlurredAmount>
```

`truncate block` ensures ellipsis kicks in only as a last-resort safety net — the compact formatter should prevent truncation in normal cases.

### 4. Memory update

Append to `mem://style/platform-ui-standards-and-privacy`:

> **Simple-view dashboard grid:** uses CSS auto-fit with a **260px minimum column width** (no class-based column ladders). Currency values in compact tiles switch to `formatCurrencyCompact` (e.g. `$20.3K`) when `Math.abs(value) >= 1000` — keeps small numbers exact while preventing overflow on large ones.

## Files to Edit

- `src/pages/dashboard/DashboardHome.tsx` — replace the grid container around line 796.
- `src/components/dashboard/PinnedAnalyticsCard.tsx` — add `formatCurrencySmart` helper, swap currency calls in the compact branch (lines 399–559), add `truncate block` to the value render at line 584.
- `mem://style/platform-ui-standards-and-privacy` — codify the 260px floor + smart-compact rule.

## Out of Scope

- Detailed view spacing (unchanged).
- Non-currency metric strings like `"100%"` or `"0 added"` — already short.
- Switching the grid to a container-query / ResizeObserver approach — overkill for this; the auto-fit floor is sufficient and matches the spirit of the container-aware-responsiveness canon without per-card observers.