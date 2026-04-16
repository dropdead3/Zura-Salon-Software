

# Double-Booking Density Heatmap

## What We're Building
A day-of-week × hour-of-day heatmap showing where double-booking overlap concentrates. This extends the existing per-stylist table in `DoubleBookingCard` with a visual grid — mirroring the existing `DemandHeatmapReport` pattern but measuring overlap minutes instead of appointment counts.

## Approach
Add a tabbed view to the existing `DoubleBookingCard`: **"By Stylist"** (current table) and **"Heatmap"** (new grid). This keeps the feature self-contained.

## Changes

### 1. Extend `useDoubleBookingStats` hook
Add a secondary return value: `heatmapCells` — an array of `{ day: number, hour: number, overlapMinutes: number }`.

During the existing per-stylist loop, also bucket each overlap interval into its hour slot and day-of-week (using `getDay()` on `appointment_date`). This requires no additional query — the data is already fetched.

### 2. Update `DoubleBookingCard`
- Add `Tabs` toggle: "By Stylist" | "Heatmap"
- **Heatmap tab**: Render a 7×15 grid (Sun–Sat × 7:00–21:00) identical to `DemandHeatmapReport`'s layout
  - Cell color intensity based on overlap minutes relative to max cell
  - Tooltip: `"Mon 10:00 — 45 min overlap"`
  - Same legend strip (Less → More)
- Uses `tokens.card.*` header, `tokens.table.columnHeader` for axis labels
- Empty state if no overlaps detected

### 3. No new files needed
All changes fit within the existing hook and card component. The heatmap grid reuses the same CSS grid pattern from `DemandHeatmapReport`.

## Technical Detail
```text
For each stylist's day-group (already computed):
  For each detected overlap interval [overlapStart, overlapEnd]:
    dayOfWeek = getDay(appointment_date)
    For each hour h that the overlap spans:
      bucketStart = max(overlapStart, h * 60)
      bucketEnd = min(overlapEnd, (h+1) * 60)
      heatmap[dayOfWeek][h] += bucketEnd - bucketStart
```

This gives minute-level granularity per hour slot, aggregated across all stylists and dates in the range.

