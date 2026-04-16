

# Fix Zoomed-Out Levels to Fill Full Viewport

## Problem
At zoom level -3 (60-min intervals, 16px rows), the grid is only 18 rows × 16px = 288px tall — leaving most of the viewport empty. The screenshot shows this clearly.

## Solution
Increase row heights for the zoomed-out levels so the grid content fills the available scroll area. The viewport is ~1300px; minus header (~60px), action bar (~48px), and utilization bar (~40px) leaves ~1150px for the grid (including sticky stylist headers ~70px → ~1080px for time rows).

### Updated ZOOM_CONFIG

| Level | Interval | Row Height | Total rows (6–24) | Grid height |
|-------|----------|------------|-------------------|-------------|
| -3 | 60 min | 60px | 18 | 1080px ✓ |
| -2 | 60 min | 80px | 18 | 1440px (scrollable) |
| -1 | 30 min | 30px | 36 | 1080px ✓ |
| 0 | 20 min | 20px | — | (uses preferences range) |
| 1 | 15 min | 20px | — | same |
| 2 | 10 min | 20px | — | same |
| 3 | 5 min | 20px | — | same |

Level -3 and -1 fit the viewport almost exactly. Level -2 is the "enlarged hour" view that scrolls slightly.

## Changes

### `src/components/dashboard/schedule/DayView.tsx` (lines 366–373)
Update three values in ZOOM_CONFIG:
```ts
'-3': { interval: 60, rowHeight: 60 },
'-2': { interval: 60, rowHeight: 80 },
'-1': { interval: 30, rowHeight: 30 },
```

One line group changed, one file.

