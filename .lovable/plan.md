

# Move RC/NC to Bottom-Right and Inline Client Name with Status Badge

## Problem
Currently in DayView, the NC/RC badge sits top-left and the client name is on a separate row below the status badge. The user wants:
1. RC/NC icons moved to the **bottom-right corner** of the card
2. Client name on the **same row** as the status badge (top row)
3. Name intelligently truncates to "First L." format when space is tight

## Changes

### `AppointmentCardContent.tsx` — GridContent DayView branch (lines 264-298)

**Remove** the NC/RC badge from `absolute top-1 left-1` (lines 267-278).

**Add** NC/RC badge at `absolute bottom-1 right-1` so it anchors to the card's bottom-right corner regardless of card height.

**Restructure top row** to put client name and status badge inline:
```
[Client Name (truncate)]  [Indicators] [Status Badge]
```

The top row becomes a single `absolute top-1 left-1 right-1` flex container with `justify-between`. The client name gets `truncate` and `min-w-0 flex-1`. The status badge side gets `shrink-0`.

**Add smart truncation helper**: A `formatCompactName(fullName)` function that returns "FirstName L." (first name + last initial with period). The card uses a `useRef` + `ResizeObserver` approach — but that's heavy. Simpler: since `useShortLabels` already tells us the column is narrow, use that same flag to switch to compact name format. When `useShortLabels` is true OR `showStylistBadge` is true, use `formatCompactName`. Otherwise use full name with CSS truncation.

**`formatCompactName` logic:**
```ts
function formatCompactName(name: string): string {
  if (!name?.trim()) return 'Walk-in';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
```

### Layout for DayView (non-stylistBadge) branch:

```tsx
{/* Top row: client name + status badge */}
<div className="flex items-center justify-between gap-1 pr-0.5">
  <span className="text-sm font-medium truncate min-w-0">
    {useShortLabels ? formatCompactName(appointment.client_name) : appointment.client_name}
  </span>
  <div className="flex items-center gap-1 shrink-0">
    <IndicatorCluster flags={indicatorFlags} size={size} />
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full ...')}>
      {statusLabel}
    </span>
  </div>
</div>

{/* NC/RC badge — bottom right */}
{showClientAvatar && (
  <div className="absolute bottom-1 right-1 z-20">
    <span className="h-4 w-4 rounded-full ...">
      {appointment.is_new_client ? 'NC' : 'RC'}
    </span>
  </div>
)}
```

Remove `pt-6` from client name (no longer offset below badges). Remove the old separate NC/RC and status badge absolute containers.

### WeekView (showStylistBadge) branch — same treatment:
- Move NC/RC (currently shown via IndicatorCluster's `isNewClient` flag) to bottom-right
- Client name inline with status badge, using `formatCompactName` always (WeekView is always narrow)

### Files Modified
1. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — restructure grid layout, add `formatCompactName`, relocate NC/RC badge

