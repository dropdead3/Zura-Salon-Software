

## Refined Dark Mode: Subtle Borders & Layered Card Depth

### Problem
In dark mode, the inner cards (KPI tiles, brand cards) use the same `bg-card` as their parent and have full-strength `border` (44% lightness), creating harsh, flat-looking containers instead of a professional layered feel.

### Changes

**1. Soften dark mode border color** (`src/index.css`)

Reduce `--border` lightness across all four dark themes from ~44% down to ~20%, creating subtle dividers instead of harsh lines:

| Theme | Current | New |
|-------|---------|-----|
| Cream dark | `0 0% 44%` | `0 0% 20%` |
| Rose dark | `350 10% 44%` | `350 8% 22%` |
| Sage dark | `145 8% 44%` | `145 6% 22%` |
| Ocean dark | `210 10% 44%` | `210 8% 22%` |

Also soften the sidebar border variables to match.

**2. Use `bg-card-inner` for nested cards** (`BackroomProductCatalogSection.tsx`)

The CSS variable `--card-inner` (8% lightness in dark = slightly recessed) and utility class `.bg-card-inner` already exist but aren't used. Replace `bg-card` with `bg-card-inner` on:

- KPI stat tiles (lines 1071, 1075, 1079 and lines 1353, 1364, 1371) — use `bg-card-inner` instead of `bg-card`
- Brand grid cards (line 1186) — use `bg-card-inner/50` instead of `bg-card/50`
- Reduce border opacity on these inner elements from `border` to `border-border/20`

### Files
- `src/index.css` — Lower `--border` and `--sidebar-border` values in all 4 dark themes
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — Swap inner card backgrounds to `bg-card-inner` and soften their border opacity

