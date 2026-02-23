

# Remove Client Avatar from Week View Cards

## Problem
The client avatar (initials circle) on Week View cards consumes horizontal space in an already dense grid. Removing it gives more room for the client name and service info.

## Approach
Same pattern as `showClientPhone` and `showStylistBadge` -- add a `showClientAvatar?: boolean` prop defaulting to `true`.

### Changes

| File | Change |
|---|---|
| `AppointmentCardContent.tsx` | Add `showClientAvatar?: boolean` prop (default `true`); pass it through to `GridContent`; wrap the avatar span (line 244-246) with a `showClientAvatar` guard |
| `WeekView.tsx` | Pass `showClientAvatar={false}` |

DayView and AgendaView remain unaffected (avatar continues to show by default).

