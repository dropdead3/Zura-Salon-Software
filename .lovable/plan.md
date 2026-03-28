

## Make "Take Action" Buttons Look Like Actionable CTAs

### Problem
Current styling (`h-6 text-[10px] rounded-full bg-destructive/15 border-destructive/60`) reads as a passive badge — too small, no arrow affordance, no interactive signal.

### Solution
Upgrade all three instances to feel like proper action buttons:

- **Size up**: `h-7 px-4 text-xs` (from `h-6 px-3 text-[10px]`)
- **Add arrow icon**: Append `ArrowRight` icon (`w-3 h-3`) to signal clickability
- **Stronger fill + hover**: `bg-destructive/20 hover:bg-destructive/30` with `border-destructive/70`
- **Cursor + scale**: add `cursor-pointer active:scale-[0.97]` for tactile feedback
- **Keep** `font-sans rounded-full text-destructive` for brand consistency

Result class:
```
rounded-full px-4 h-7 text-xs font-sans gap-1.5
bg-destructive/20 border border-destructive/70 text-destructive
hover:bg-destructive/30 hover:text-destructive
active:scale-[0.97] cursor-pointer
```

Content becomes: `Take Action <ArrowRight className="w-3 h-3" />`

### Files modified (same change, 3 locations)
1. `src/components/dashboard/NewBookingsCard.tsx` — line 115-126
2. `src/components/dashboard/analytics/BookingPipelineContent.tsx` — line 318-329
3. `src/components/dashboard/analytics/ExecutiveSummaryCard.tsx` — line 117-128

