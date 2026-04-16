

# Move Booking Indicator to Top-Right Corner of Header Cell

## Change
Reposition the booking status dot (green "Booking" / red "Not Booking") from the inline second row to an absolute-positioned indicator in the top-right corner of each stylist header cell.

## Implementation — `src/components/dashboard/schedule/DayView.tsx`

1. **Add `relative` to the cell container** (line 516) so absolute positioning works.

2. **Move the booking indicator out of the inline row** (lines 538-541) and place it as an absolutely positioned element in the top-right corner:
   - Position: `absolute top-1.5 right-1.5`
   - Show just the colored dot (`w-2 h-2 rounded-full`) with a tooltip showing "Booking" or "Not Booking"
   - Remove the text label to keep it compact — the dot + tooltip is sufficient for the corner placement

3. **Clean up the second row** — remove the `·` separator that was before the booking indicator. The row will now just show `72% · ⟡ LP` (utilization + lead pool icon).

### Result per cell
```text
┌────────────────────────── ● ┐  ← green/red dot top-right
│ [Avatar]  Trinity Graves L2 │
│           72%  ⟡            │
└─────────────────────────────┘
```

Single file change, no new dependencies.

