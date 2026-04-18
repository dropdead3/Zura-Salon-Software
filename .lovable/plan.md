

## Goal
Lift the retail performance verdict out of the cramped right column inside the donut card and surface it as its own **alert-style card** directly below the Revenue Breakdown card.

## What's wrong with current UI
The verdict currently lives inside the metrics column next to the donut chart (lines 189–210). That column is narrow at the current viewport, which forces the copy to wrap into 4 lines beside a tall vertical rail — visually cramped, looks like an afterthought, fights for attention with the metric rows.

## Fix — two parts

### Part 1: Remove from RevenueDonutChart
Strip lines 189–210 (the verdict block) from `src/components/dashboard/sales/RevenueDonutChart.tsx`. The donut card returns to being a clean numbers surface.

Also clean up the stray nested `</div>` and remove the now-unused `cn` and `getRetailPerformanceVerdict` imports from this file.

### Part 2: New `RetailPerformanceAlert` component
Create `src/components/dashboard/sales/RetailPerformanceAlert.tsx`:

```tsx
interface Props {
  trueRetailPercent: number | undefined;
  retailAttachmentRate: number | undefined;
  total: number;
  hasBreakdown: boolean;
  filterContext?: FilterContext;
}
```

Returns `null` if `!hasBreakdown` or verdict is null (preserves materiality gate / silence doctrine).

**Visual treatment** — alert card pattern, calm executive aesthetic:

- Wrapper: `<Card>` with `overflow-hidden border-l-4` and tier-tinted left border + subtle tier-tinted background wash (`bg-{tier}/5`)
- Two-column flex layout, `p-4`:
  - **Left**: small icon container (w-9 h-9 rounded-lg) holding tier-appropriate Lucide icon (TrendingUp / Activity / AlertTriangle / AlertOctagon)
  - **Right (flex-1)**: 
    - Tier label in `font-display text-xs tracking-wide uppercase` (e.g. "RETAIL HEALTH · CRITICAL")
    - Verdict copy in `text-sm text-foreground/90 leading-relaxed mt-1`
- No CardHeader — single self-contained alert row
- No emoji, no exclamation

**Tier styling map** (tokens-based, no raw hex):
| Tier | Border | Bg wash | Icon | Icon color |
|---|---|---|---|---|
| strong | `border-l-emerald-500/60` | `bg-emerald-500/5` | TrendingUp | `text-emerald-500` |
| healthy | `border-l-foreground/30` | `bg-muted/30` | Activity | `text-foreground/70` |
| soft | `border-l-amber-500/60` | `bg-amber-500/5` | AlertTriangle | `text-amber-500` |
| critical | `border-l-red-500/60` | `bg-red-500/5` | AlertOctagon | `text-red-500` |

### Part 3: Mount it in the parent
Find the parent that renders `<RevenueDonutChart>` (Sales hub page) and place `<RetailPerformanceAlert>` immediately below it in the same grid cell / column so they read as a paired unit. Pass through the same `trueRetailPercent`, `retailAttachmentRate`, `total`, `hasBreakdown` already computed.

## Materiality / silence
Component returns `null` when `getRetailPerformanceVerdict` returns null (under $500 total, missing attach rate, missing breakdown). No empty card placeholder.

## Out of scope
- Animations or hover states on the alert card
- Per-tier action buttons (Phase 2 advisory layer)
- Threshold customization

## Files
- **Modify**: `src/components/dashboard/sales/RevenueDonutChart.tsx` — remove verdict block + stray div + unused imports
- **Create**: `src/components/dashboard/sales/RetailPerformanceAlert.tsx`
- **Modify**: parent of `RevenueDonutChart` (Sales hub) — mount the new alert card directly below it

