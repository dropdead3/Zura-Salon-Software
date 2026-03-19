

# Standardize KPI Icon Sizes and Vertical Alignment Across Backroom

## Problem
The same two issues fixed in BackroomDashboardOverview exist in three other files: inconsistent icon sizes (`w-3.5 h-3.5` instead of `w-4 h-4`) and no `min-h` on label rows to align values vertically.

## Files and Changes

### 1. `BackroomComplianceSection.tsx` (lines 123-171) — 4 stat cards
- Icons: `w-3.5 h-3.5` → `w-4 h-4 shrink-0` on ShieldCheck, Beaker, TrendingUp, Users
- Label row: add `min-h-[32px]` to each `flex items-center gap-1.5 mb-2` div so values align across the 4-column grid

### 2. `BackroomROICard.tsx` (lines 87-98) — 3 KPI tiles
- Icon container: `w-7 h-7` → `w-8 h-8` (proportional bump)
- Icons: `w-3.5 h-3.5` → `w-4 h-4` inside those containers
- Label row: add `min-h-[32px]` to ensure the value row (`text-xl font-display`) starts at the same position across all 3 columns

### 3. `BackroomInsightsSection.tsx` — `KPICard` component (line 232)
Already uses `w-4 h-4` — no icon fix needed. Add `min-h-[32px]` to the label row div for vertical alignment consistency across the 5-column grid.

### Not changed
- **ReorderAnalyticsTab.tsx** — uses `tokens.card.iconBox` with `w-5 h-5` icons (standard card pattern, not KPI tiles). No fix needed.
- **StockTab.tsx / CountsTab.tsx** — `w-3.5 h-3.5` icons there are on buttons and table row chevrons, not KPI tiles. No fix needed.
- **CountsTab.tsx KPI tiles** (lines 333-345) — these tiles have no icons at all, just label + value. No fix needed.

