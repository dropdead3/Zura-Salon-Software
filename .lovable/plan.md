

## Change "Appt not concluded" to "In progress"

### Problem
The gap drilldown labels appointments that haven't finished yet as "Appt not concluded" — which sounds like a failure state. These are simply still in progress and should be labeled accordingly.

### Changes

**File: `src/components/dashboard/sales/RevenueGapDrilldown.tsx`**

- Line 27: Change label from `'Appt not concluded'` to `'In progress'`
- Line 28: Swap `Clock` icon for a more active indicator — use `ArrowRight` (already imported) or keep `Clock` since it conveys "ongoing." Clock works fine here.
- Optionally adjust badgeClass to use a subtle amber/blue tint instead of plain muted, to convey "active" rather than "neutral" — e.g. `'bg-primary/10 text-primary/80 border-primary/20'`

Single-line change, one file.

