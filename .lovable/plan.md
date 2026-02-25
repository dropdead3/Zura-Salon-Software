

## Inline "Exceeded" + "All Appointments Complete" Indicators

The screenshot shows these as two separate centered rows stacked vertically. The fix merges them into a single row when both are true.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (lines 697-714)**

Replace the separate "Exceeded" block (lines 697-702) and the separate "All appointments complete" block (lines 710-714) with a combined inline layout when both conditions are true:

```tsx
{/* Combined status line when both exceeded AND all complete */}
{exceededExpected && allAppointmentsComplete ? (
  <div className="flex items-center justify-center gap-3 text-xs text-success-foreground">
    <span className="flex items-center gap-1">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Exceeded
    </span>
    <span className="text-success-foreground/40">·</span>
    <span className="flex items-center gap-1">
      <CheckCircle2 className="w-3.5 h-3.5" />
      All appointments complete
    </span>
  </div>
) : (
  <>
    {exceededExpected && (
      <div className="flex items-center justify-center gap-1 text-xs text-success-foreground">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Exceeded</span>
      </div>
    )}
  </>
)}
```

And for the standalone "All appointments complete" block (lines 710-722), only render it when `exceededExpected` is false (since the combined line already covers the dual case):

```tsx
{!exceededExpected && allAppointmentsComplete ? (
  <div className="flex items-center justify-center gap-1.5 text-xs text-success-foreground">
    <CheckCircle2 className="w-3.5 h-3.5" />
    <span>All appointments complete</span>
  </div>
) : !allAppointmentsComplete && todayActual?.lastAppointmentEndTime ? (
  <p className="text-xs text-muted-foreground/70 text-center">...</p>
) : null}
```

### Result

| State | Before | After |
|---|---|---|
| Exceeded + all complete | Two stacked rows | Single row: `✓ Exceeded · ✓ All appointments complete` |
| Exceeded only (still open) | "Exceeded" row + estimated time row | Same (unchanged) |
| Not exceeded + all complete | "All appointments complete" row | Same (unchanged) |

~15 lines changed, 1 file.

