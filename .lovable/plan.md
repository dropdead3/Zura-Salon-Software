

## Show Clicked Time in Schedule Type Selector

### Problem
When a dual-role user clicks a time slot, the type selector dialog shows a generic "What would you like to schedule?" without indicating the time they clicked on.

### Fix (2 files)

**1. `ScheduleTypeSelector.tsx`** — Add an optional `selectedTime` prop. When provided, format it to 12-hour display and include it in the prompt: "What would you like to schedule at 1:30 PM?"

**2. `Schedule.tsx`** — Pass `bookingDefaults.time` to the `ScheduleTypeSelector` component so it has access to the clicked slot's time.

```text
ScheduleTypeSelector
  props: + selectedTime?: string   (e.g. "13:30")
  display: "What would you like to schedule at 1:30 PM?"
           falls back to "What would you like to schedule?" if no time
```

Two files, ~5 lines each.

