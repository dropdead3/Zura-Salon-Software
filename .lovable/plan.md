

# Add Stylist Level Next to Utilization Percentage

## Change
In `src/components/dashboard/schedule/DayView.tsx`, add the stylist level label next to the utilization percentage on the second row, separated by a bullet point. The level pill badge on the name row will remain as-is (or can be removed to reduce clutter — keeping it since the user didn't ask to remove it).

## Implementation

### `src/components/dashboard/schedule/DayView.tsx` (~line 561-563)
Update the second row to include the level label after the utilization percentage:

```text
Before:  63%
After:   63% · L2
```

- After the `<span>{pct}%</span>`, add a `·` separator and the level label text (e.g., `levelInfo?.label`) in `text-muted-foreground`
- Only show the bullet + level if `levelInfo` exists

### Result per cell
```text
┌──────────────────────── ● Accepting ┐
│ [Avatar]  Trinity Graves  L2        │
│           63% · L2                  │
└─────────────────────────────────────┘
```

Single file change, no new dependencies.

