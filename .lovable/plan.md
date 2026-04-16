

## Fix: Current time line stops at viewport edge

### Problem

In `DayView.tsx`, when there are enough stylists to require horizontal scrolling, the purple "now" line ends at the visible viewport edge instead of extending across all columns (including off-screen ones to the right).

### Root cause

The current time indicator (lines 889–897) lives inside `<div className="flex relative">` (line 746). That flex container has no explicit `width` or `min-width`. While its parent gets `width: requiredGridWidth` (line 634), the flex container's intrinsic width when its children use `flex-1` collapses unpredictably under certain layout passes — so `right-0` resolves to the visible scroll-area edge rather than the grid's actual right edge.

### Fix (one file, two small changes)

**`src/components/dashboard/schedule/DayView.tsx`:**

1. **Line 746** — Force the time-grid row to span the full grid width so absolute children resolve `right-0` against the grid edge, not the viewport:
   ```tsx
   <div className="flex relative" style={{ minWidth: requiredGridWidth }}>
   ```

2. **Lines 889–897** — Make the indicator explicitly span from the time-label gutter to the grid's right edge using `width` instead of relying on `right-0`:
   ```tsx
   <div
     className="absolute border-t-2 border-primary pointer-events-none z-[15]"
     style={{
       top: `${currentTimeOffset}px`,
       left: '70px',
       width: `${requiredGridWidth - 70}px`,
     }}
   >
     <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-primary rounded-full" />
   </div>
   ```

This guarantees the line extends across **every** stylist column, including those scrolled off-screen.

### Out of scope

- `WeekView.tsx` — its 7 day columns always fit the viewport (no horizontal scroll), so its indicator already works correctly. No change needed.
- Vertical scrolling — already handled by the existing `currentTimeOffset` math.

### Files touched

- `src/components/dashboard/schedule/DayView.tsx` (2 small edits)

