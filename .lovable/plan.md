

## Move Client Name Below NC/RC Badge and Status Badge (Day View)

### Change
In the day view, restructure the card header so the NC/RC icon and status badge sit on the top row, and the client name drops to its own line below them.

### Current layout
```text
┌──────────────────────────────────┐
│ [NC] Client Name...    [Booked]  │
│ Service Name                     │
│ Time Range              $Price   │
└──────────────────────────────────┘
```

### Target layout
```text
┌──────────────────────────────────┐
│ [NC]                   [Booked]  │
│ Client Name                      │
│ Service Name                     │
│ Time Range              $Price   │
└──────────────────────────────────┘
```

### Implementation
**1 file**: `src/components/dashboard/schedule/AppointmentCardContent.tsx` — lines 264-293

In the day view branch (`showStylistBadge=false`):

1. Move the NC/RC badge into the top-right absolute container alongside the status badge, positioned first (left of status badge)
2. Remove the NC/RC badge from the client name line
3. Remove `pr-20` width constraint and `flex items-center gap-1` from client name div — it becomes a simple full-width truncated line below the badges

```text
// Top row (absolute top-1 right-1):
[IndicatorCluster] [NC/RC badge] [Status badge]

// Below (with pt-6 to clear absolute row):
Client Name (full width, truncated)
```

