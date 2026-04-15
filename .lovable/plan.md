

## Improve Weekly View Appointment Card Layout

### Change
Rearrange the `GridContent` component in `AppointmentCardContent.tsx` so that when `showStylistBadge` is true (weekly view), the layout becomes:

```text
┌──────────────────────┐
│ [Booked]    [photo]  │  ← status badge left, stylist avatar right
│ Client Name          │  ← client name below, full width
│ Service Name         │  ← service info
│ 10:00 AM - 2:00 PM   │  ← time + price (full size only)
└──────────────────────┘
```

### Implementation
**1 file**: `src/components/dashboard/schedule/AppointmentCardContent.tsx` — `GridContent` function (lines 229-306)

Restructure the top section of the medium/full grid card:

1. Move the status badge from the top-right absolute div to a top-left position
2. Keep the stylist photo (StylistBadge) in the top-right position, alone
3. Move client name to its own line below the top row, removing the inline avatar circle (which is already hidden in week view via `showClientAvatar=false`)
4. Indicator cluster stays alongside the status badge on the left

The compact size (< 30min appointments) remains unchanged — it only shows the client name.

### Technical detail
The `GridContent` top section currently uses an absolute-positioned div at `top-1 right-1` containing indicators, status badge, and stylist badge all together. The change splits this into two absolute containers:
- Top-left (`top-1 left-1`): status badge + indicator cluster
- Top-right (`top-1 right-1`): stylist photo only

Then the client name line gets extra top padding (`pt-7`) to clear the absolute-positioned row, and uses full width without the `pr-20` truncation constraint.

This only affects `showStylistBadge=true` cards (weekly view). Day view cards (`showStylistBadge=false`) retain their current layout with status badge top-right.

