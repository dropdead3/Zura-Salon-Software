

# Fix Zoom Level 0+ Row Heights to Fill Viewport

## Problem
At zoom level 0 (20-min intervals), the grid is only 36 slots × 20px = 720px — leaving ~350px of empty space in a 1303px viewport. Levels 1–3 have the same 20px row height issue. The Phorest reference shows the grid filling the full available height.

## Solution
Increase row heights for levels 0 and 1 so the grid fills the viewport naturally. Levels 2 and 3 (10-min and 5-min) are expected to scroll since they have many rows.

Available viewport for grid rows: ~1080px (1303px minus header, action bar, utilization bar, stylist headers).

### Updated ZOOM_CONFIG

| Level | Interval | Row Height | Rows (12hr range) | Grid Height |
|-------|----------|------------|-------------------|-------------|
| -3 | 60 min | 60px | 18 | 1080px ✓ |
| -2 | 60 min | 80px | 18 | 1440px (scroll) |
| -1 | 30 min | 30px | 36 | 1080px ✓ |
| **0** | 20 min | **30px** (was 20) | 36 | **1080px** ✓ |
| **1** | 15 min | **24px** (was 20) | 48 | **1152px** ✓ |
| 2 | 10 min | 20px | 72 | 1440px (scroll) |
| 3 | 5 min | 20px | 144 | 2880px (scroll) |

## Change

### `src/components/dashboard/schedule/DayView.tsx` (lines 366–374)
Update two values in ZOOM_CONFIG:
```ts
'0': { interval: 20, rowHeight: 30 },  // was 20
'1': { interval: 15, rowHeight: 24 },  // was 20
```

Two values changed, one file.

