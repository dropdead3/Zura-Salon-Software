
# Remove Hover Tooltip from Appointment Cards

## Problem
Appointment cards in both DayView and WeekView show a detailed tooltip on hover containing client info, service details, time, price, etc. Since clicking the card already opens the detail panel, the tooltip is redundant and should be removed.

## Solution
Unwrap the `Tooltip` / `TooltipTrigger` / `TooltipContent` from the AppointmentBlock component in both files, keeping only the inner `<div>` that renders the card.

---

## Change 1: DayView.tsx

**Lines 291-293**: Remove opening `<Tooltip>` and `<TooltipTrigger asChild>` wrappers.

**Lines 585-651**: Remove closing `</TooltipTrigger>`, the entire `<TooltipContent>` block, and closing `</Tooltip>`.

The component return will go from:
```
return (
  <Tooltip>
    <TooltipTrigger asChild>
      <div ...>...</div>
    </TooltipTrigger>
    <TooltipContent>...</TooltipContent>
  </Tooltip>
);
```
To simply:
```
return (
  <div ...>...</div>
);
```

Note: The inner assistant-badge tooltips (lines 364-386) remain -- those are separate small tooltips on team member avatars, not the card-level hover hint.

Unused imports (`Tooltip`, `TooltipContent`, `TooltipTrigger`) can be cleaned up only if no other usage remains in the file (the assistant badges still use them, so they stay).

## Change 2: WeekView.tsx

**Lines 159-161**: Remove opening `<Tooltip>` and `<TooltipTrigger asChild>`.

**Lines 345-393**: Remove closing `</TooltipTrigger>`, entire `<TooltipContent>` block, and closing `</Tooltip>`.

Same unwrap pattern. Tooltip imports stay because WeekView has other tooltip usages (blocked-time tooltips at lines 710-739).

---

## Technical Details

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Remove `Tooltip`/`TooltipTrigger`/`TooltipContent` wrapper from AppointmentBlock return |
| `src/components/dashboard/schedule/WeekView.tsx` | Remove `Tooltip`/`TooltipTrigger`/`TooltipContent` wrapper from WeekAppointmentBlock return |

No new files, no new dependencies, no database changes.
