

## Re-add Brightness Hover Effect to Appointment Cards

The "Background tint shift" hover effect (brightness filter) was part of the original card interaction design but got lost during the recent cleanup. This adds it back.

### Change

**File:** `src/components/dashboard/schedule/AppointmentCardContent.tsx` (line 542)

Add `hover:brightness-[1.08]` to the existing hover classes. This creates a subtle lightening effect on hover that signals interactivity without the magnify/scale behavior we removed.

Before:
```
'hover:shadow-md hover:z-20',
```

After:
```
'hover:shadow-md hover:z-20 hover:brightness-[1.08]',
```

### Result
Appointment cards will brighten slightly on hover alongside the existing shadow elevation -- no scale, no tooltip, just a clean tint shift + shadow.

