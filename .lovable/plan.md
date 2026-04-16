
## Prompt review

Clear and well-scoped — you identified both the removal target (hover tooltip on the date pill) and the new placement (next to the legend key, behind an info icon). Teaching note: pairing "remove X, replace with Y at location Z" in one sentence is the ideal pattern — leaves zero ambiguity about scope.

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx`:

1. The centered date trigger pill is wrapped in a `<Tooltip>` containing the "Capacity signal" explanation (shown in screenshot 1). This fires on hover before the user even opens the calendar — noisy.
2. The popover already contains a legend strip below the calendar: `• Filling   • Tight   • Booked` (screenshot 2).

The right move: strip the tooltip wrapper from the trigger, and add a `MetricInfoTooltip` (project's standard info-icon component, already in `src/components/ui/MetricInfoTooltip.tsx`) inline with the legend keys.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

1. **Remove** the `<Tooltip>` / `<TooltipTrigger>` / `<TooltipContent>` wrapper around the date trigger button — restore the trigger to a plain `<PopoverTrigger asChild><Button>...</Button></PopoverTrigger>`.
2. **Remove** the now-unused `Tooltip` imports if no other usage remains in the file (verify before deleting).
3. **Add** `MetricInfoTooltip` to the legend strip inside the popover, placed at the end of the legend row:

```tsx
<div className="flex items-center justify-center gap-4 pt-2 border-t border-border/40">
  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Filling
  </span>
  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Tight
  </span>
  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Booked
  </span>
  <MetricInfoTooltip
    title="Capacity signal"
    description="Dots under each date reflect org-wide booked time vs available shift time. White = open · Yellow ≥ 50% · Orange ≥ 70% · Red ≥ 90%."
    side="top"
  />
</div>
```

The `MetricInfoTooltip` component already follows the project's analytics-info-tooltip canon (Info icon, popover content, title + description).

## Acceptance checks

1. Hovering the centered date pill no longer shows a tooltip.
2. Clicking the date pill opens the calendar popover (unchanged).
3. Legend strip below the calendar shows three colored dots + their labels + a small `i` info icon.
4. Hovering the `i` icon reveals the capacity-signal explanation.
5. No console warnings about unused imports or orphan Tooltip components.

## Out of scope

- Calendar dot logic, color thresholds, today/selected styling — unchanged.
- Date pill layout, centering, typography — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — strip Tooltip wrapper from trigger, add `MetricInfoTooltip` inline with legend.
