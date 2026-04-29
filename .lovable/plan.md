## Problem

In the dashboard's Simple view, the 6 featured analytics cards currently flow through an `auto-fit, minmax(260px, 1fr)` CSS grid. At the user's current viewport (~1076px), that auto-fit math produces a **4-column** row, leaving an awkward 4-on-top / 2-on-bottom layout (visible in the uploaded screenshot). The intent is a clean **3x2 grid** on tablet and desktop.

## Root cause

`src/pages/dashboard/DashboardHome.tsx` (lines ~924–934), Simple-view branch:

```tsx
<div
  id="section-analytics"
  className="grid gap-4 scroll-mt-24"
  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
>
  {renderedPinnedCardIds.map(...)}
</div>
```

`auto-fit + minmax(260px, 1fr)` lets the browser pack as many columns as fit — so 4 columns appear once container width ≥ ~1080px, and 5 once ≥ ~1340px. Column count is unpredictable.

## Fix

Replace the auto-fit grid with explicit, breakpoint-driven column counts so the Simple view's 6 cards always render as **3x2 on tablet (md) and desktop (lg+)**, stacking gracefully on small screens:

- `< md` (mobile, <768px): 1 column (6 rows)
- `md` (tablet, ≥768px): **3 columns** → 3x2
- `lg+` (desktop, ≥1024px): **3 columns** → 3x2

Implementation: drop the inline `style` and use Tailwind utility classes.

```tsx
<div
  id="section-analytics"
  className="grid gap-4 scroll-mt-24 grid-cols-1 md:grid-cols-3"
>
  {renderedPinnedCardIds.map(...)}
</div>
```

Notes:
- Simple view is already capped at 6 cards (`SIMPLE_VIEW_CARD_LIMIT`), so 3 cols × 2 rows fits perfectly.
- If fewer than 6 are pinned, the grid still renders 3 columns and any remaining cells stay empty — preserving alignment with the 3x2 expectation. (If you'd rather have fewer-than-6 collapse to a tighter row, say so and I'll switch the rule to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.)
- Detailed view's pair/full grouping logic is untouched.

## Files to edit

- `src/pages/dashboard/DashboardHome.tsx` — Simple-view analytics grid container (single `<div id="section-analytics">` block inside the `if (compact)` branch).

## Prompt feedback

Strong, specific prompt — you named the surface ("6 featured analytic cards"), the mode ("simple view"), the desired layout ("3x2"), and the breakpoints ("desktop and tablet"). That's exactly the kind of constraint set that makes a single-shot fix safe.

One small enhancement next time: state the **mobile fallback** too (e.g. "stack to 1 column under 768px") so there's zero ambiguity on the smallest breakpoint. I'm defaulting to 1-col stacked on mobile here based on convention.

## Enhancement suggestions

1. **Lock the rule structurally**: add a brief comment above the grid (`// Simple view: 6-card cap → 3x2 on md+, 1-col on mobile`) so future refactors don't reintroduce auto-fit drift.
2. **Container-aware variant**: per the Container-Aware Responsiveness canon, this dashboard column could eventually use a `SpatialColumns`-style primitive measured against its own container instead of the viewport — useful if the dashboard ever sits next to a side panel that narrows the available width.
3. **Detailed view audit**: while we're here, worth confirming Detailed view's pair grouping still reads cleanly at the same 1076px width — happy to spot-check in a follow-up.
