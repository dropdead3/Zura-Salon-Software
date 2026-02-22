
# Move All Card Icons/Indicators to Top-Right

## Summary

Move all the inline icons and indicator badges (redo, recurrence, reschedule, assisting, assistants, NEW client) from the left side of the client name row to the top-right corner of the card, grouped alongside the existing status badge.

## What Changes

Currently, icons like redo (RotateCcw), recurrence (Repeat), reschedule (ArrowRightLeft), ASSISTING badge, assistants (Users), and NEW client badge all appear inline before or after the client name. They will move into the absolute-positioned top-right area, stacked horizontally next to the status badge.

The client name row becomes clean text only (plus phone number if present), without any leading icons.

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

**Non-compact card (lines 504-544):**

Replace the current top-right div (status badge only) and the icon-laden client name row with:

```tsx
{/* Top-right indicators cluster */}
<div className="absolute top-1 right-1 z-20 flex items-center gap-1">
  {(appointment as any).is_redo && (
    <RotateCcw className="h-3 w-3 text-amber-500" />
  )}
  {appointment.recurrence_group_id && (
    <Repeat className="h-3 w-3 opacity-60" />
  )}
  {(appointment as any).rescheduled_at && (
    <ArrowRightLeft className="h-3 w-3 text-blue-500 dark:text-blue-400" />
  )}
  {!isAssisting && hasAssistants && (
    <Users className="h-3 w-3 opacity-60" />
  )}
  {isAssisting && (
    <span className="bg-accent/80 text-accent-foreground text-[8px] px-1 py-px rounded-sm font-medium">AST</span>
  )}
  {appointment.is_new_client && (
    <span className="text-[8px] px-1 py-px rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">NEW</span>
  )}
  {/* Status badge */}
  <span className={cn(
    'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
    badge.bg, badge.text
  )}>
    {badge.label}
  </span>
</div>

{/* Client name - clean, no icons */}
<div className="text-sm font-medium truncate pr-20">
  {appointment.client_name}
  {appointment.client_phone && (
    <span className="font-normal opacity-80 ml-1">
      {formatPhoneDisplay(appointment.client_phone)}
    </span>
  )}
</div>
```

Key details:
- All indicators cluster in a single `flex` row at `top-1 right-1`
- Status badge anchors at the far right of the cluster
- `pr-20` (increased from `pr-16`) on client name to accommodate the wider indicator cluster
- The compact card row (lines 480-501) gets the same treatment: icons move to the right side

**Compact card (lines 480-501):**

Same pattern -- move the inline icons from before the client name into a right-aligned cluster within the compact row.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Move all icons/indicators from client name row to top-right cluster alongside status badge |
