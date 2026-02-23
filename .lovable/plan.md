

# Stylist Badge: Keep on Week View, Remove from Day View, Move to Top-Left

## Problem
The previous plan removed the `StylistBadge` from all grid views. It should only be removed from Day View (where the stylist is already identified by the column header). On Week View, the badge should remain but move from the top-right corner to the top-left, inline with the client name and avatar row.

## Approach

Since both Day View and Week View use `variant="grid"`, we need a way to distinguish them. The cleanest solution is to add a new optional prop `showStylistBadge` to `AppointmentCardContent`, defaulting to `false`.

### Changes

**File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`**

1. Add `showStylistBadge?: boolean` to the props interface (around line 55)
2. Remove the existing top-right `StylistBadge` block (lines 607-615)
3. In `GridContent`, add stylist badge parameters and render the badge inline at the start of the client name row (line 231), before the avatar and name -- only when `showStylistBadge` is true and the card is not compact

The client name row currently looks like:
```
[Avatar Circle] [Client Name] [Phone]
```

It will become (when `showStylistBadge` is true):
```
[Stylist Photo Badge] [Avatar Circle] [Client Name] [Phone]
```

**File: `src/components/dashboard/schedule/WeekView.tsx`**

4. Pass `showStylistBadge={true}` to `AppointmentCardContent` (around line 104)

**File: `src/components/dashboard/schedule/DayView.tsx`**

No change needed -- `showStylistBadge` defaults to `false`, so the badge won't render.

| File | Change |
|---|---|
| `AppointmentCardContent.tsx` | Add `showStylistBadge` prop; move badge from absolute top-right into the client name row inside `GridContent`; pass through to `GridContent` |
| `WeekView.tsx` | Pass `showStylistBadge={true}` |

