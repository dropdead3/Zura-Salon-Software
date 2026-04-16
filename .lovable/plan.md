

# Show Stylist Specialties on Avatar Hover in Scheduler

## Problem
Front desk staff can't quickly see what each stylist specializes in when booking clients. They need a fast glance at specialties without leaving the scheduler.

## Changes

### 1. `src/pages/dashboard/Schedule.tsx` — Add `specialties` to query & type
- Add `specialties` to the `.select()` call (~line 328) and to the `unique` map type + assignment (~line 341-352)
- Include `specialties: d.specialties || []` in the mapped object

### 2. `src/components/dashboard/schedule/DayView.tsx` — Add specialties to props & avatar popover
- Extend the `stylists` array type in `DayViewProps` to include `specialties?: string[] | null`
- Wrap the `Avatar` in a `Tooltip` (or `Popover` for click) that shows the stylist's specialties as small badges/chips
- On hover: show a tooltip with the list of specialties (e.g., "Blonding · Extensions · Creative Color")
- If no specialties are set, show "No specialties listed"

### Result
Hovering the avatar shows a compact tooltip with specialty tags — instant context for booking decisions.

```text
┌──────────────────────────── ● Accepting ┐
│ [Avatar]  Trinity Graves  L2            │
│           72%                           │
└─────────────────────────────────────────┘
       ┌─────────────────────────┐
       │ Blonding · Extensions   │
       │ Creative Color          │
       └─────────────────────────┘
```

Two files changed, no new dependencies.

