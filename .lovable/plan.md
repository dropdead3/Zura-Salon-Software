

## Put Tracking & Billing Method Side-by-Side in a 2-Column Layout

### What Changes

The "Tracking" and "Billing Method" sections currently stack vertically, leaving unused horizontal space. This puts them in a responsive 2-column grid that collapses to stacked rows on smaller screens.

### Implementation — 1 File Modified

**`src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`** (~lines 740–935)

1. **Wrap Sections 1 & 2 in a responsive grid** — Replace the current `space-y-5` parent with a grid layout:
   ```
   grid grid-cols-1 md:grid-cols-2 gap-5
   ```
   - On `md+` (≥768px): Tracking and Billing Method render side-by-side
   - Below `md`: They stack vertically as they do now

2. **Keep each section as its own grid child** — No structural changes to the internal content of either section. The existing `<div>` wrappers for Section 1 (Tracking) and Section 2 (Billing Method) become direct children of the grid.

3. **Price Recommendation + Mark Configured footer remain full-width below the grid** — These span both columns and stay outside the 2-col layout.

### Visual Structure

```text
Desktop (md+):
┌──────────────────────┬──────────────────────────┐
│ TRACKING             │ BILLING METHOD            │
│ ┃ Requires Color [⏻] │ ┃ [✓ Allowance] [+ P&L]  │
│ ┃ Vessels: [Bowls]   │ ┃ 45g · $0.50/g  Edit     │
└──────────────────────┴──────────────────────────┘
│ [Price Recommendation if any]                    │
│ ─── Configured ✓ ──── [Reset Configuration]      │

Mobile (<md):
┌──────────────────────┐
│ TRACKING             │
│ ┃ Requires Color [⏻] │
│ ┃ Vessels: [Bowls]   │
├──────────────────────┤
│ BILLING METHOD       │
│ ┃ [✓ Allowance]      │
│ ┃ 45g · $0.50/g Edit │
└──────────────────────┘
```

### Scope
- 1 file, ~5 lines changed (wrap existing sections in a grid div, adjust parent from `space-y-5` to `space-y-5` with inner grid)
- No logic changes, no database changes

