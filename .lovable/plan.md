

# Adaptive Stylist Header Layout — Condensed Only When Narrow

## Problem
The vertical stacked layout (avatar above, "First L." name) is currently applied at all column widths. It should only kick in when columns are extremely narrow. At normal widths, the original horizontal layout (avatar left, full name right) should be used.

## Approach
Use a width-aware strategy: measure each stylist column width and switch layouts at a threshold (~100px). Since stylist columns use `flex-1`, their width depends on the number of stylists. We can use `ResizeObserver` or calculate based on stylist count, but the simplest reliable approach is a CSS container query or a JS ref-based width check.

**Chosen method**: Use a `useRef` + `ResizeObserver` on the header row to get available width per stylist, then conditionally render either the **horizontal** (normal) or **vertical** (condensed) layout.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Add width measurement
- Add a `ref` on the header row container
- Use a `ResizeObserver` (or derive from `sortedStylists.length`) to compute `columnWidth = containerWidth / stylistCount`
- Store a boolean `isCondensed = columnWidth < 120` in state

### 2. Dual layout rendering
**When `isCondensed` (narrow columns):**
```text
┌─────────────┐
│      ●      │  ← status dot absolute
│    [Ava]    │  ← avatar centered
│  Sarah S.   │  ← condensed name
│    75%      │  ← utilization
│   Studio…   │  ← level truncated
└─────────────┘
```
- Vertical stack: `flex-col items-center text-center gap-1`
- Name: "First L." format
- Text sizes: `text-[11px]` name, `text-[10px]` stats

**When normal width:**
```text
┌──────────────────────────────── ● ┐
│ [Ava]  Sarah Spencer    75%      │
│        Studio Artist             │
└──────────────────────────────────┘
```
- Horizontal: `flex items-center gap-2`
- Full display name
- Utilization + level on second row
- Text sizes: `text-xs` name, `text-[11px]` stats

### 3. Implementation detail
- Add `useRef` + `useEffect` with `ResizeObserver` on the header flex container (the `div` wrapping all stylist columns, excluding the week indicator)
- Threshold: ~120px per column triggers condensed mode
- Both layouts keep the same tooltip, avatar hover, and status dot behavior

Single file change, no new dependencies.

