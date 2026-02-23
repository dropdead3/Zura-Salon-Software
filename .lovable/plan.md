
# Remove Client Phone Numbers from Week View Cards

## Problem
Week View appointment cards show client phone numbers inline, which adds clutter in a denser grid where horizontal space is limited.

## Approach
Add a `showClientPhone` prop to `AppointmentCardContent`, defaulting to `true` (preserving current behavior for DayView). WeekView will pass `showClientPhone={false}` to hide them.

The phone number block to be conditionally rendered is at lines 245-249 of `AppointmentCardContent.tsx`:
```
{appointment.client_phone && (
  <span className="font-normal opacity-80 text-xs shrink-0">
    {formatPhoneDisplay(appointment.client_phone)}
  </span>
)}
```

Note: The hover preview tooltip (lines 444-448) will still show the phone number, so the information remains accessible on hover.

### Changes

| File | Change |
|---|---|
| `AppointmentCardContent.tsx` | Add `showClientPhone?: boolean` prop (default `true`); wrap the inline phone span with `showClientPhone` guard |
| `WeekView.tsx` | Pass `showClientPhone={false}` |

Two files, minimal diff. DayView and AgendaView are unaffected.
