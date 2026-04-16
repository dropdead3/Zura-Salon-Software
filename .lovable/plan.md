
## Diagnosis

Looking at the screenshot: "North Mesa" sits flush-left at the pill's edge, but "All Stylists That Work Thi…" is indented further right. The two labels don't align vertically with each other.

Root cause: the two triggers have different left-padding because of leading icons.

- **Location Select** (`SelectTrigger`): no leading icon. Default px-4 padding → text starts at ~16px from pill edge.
- **Staff Multi-Select** (`Button` with `justify-between`): has a `Users` icon (or similar) before the text wrapped in `flex-1 text-left`. That icon + gap pushes the text further right than the location label.

So while both are individually left-aligned within their own pill, they don't align with each other across the stacked layout.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

Two options to align them — I'll go with **Option A** (remove the leading icon from the staff button) for visual cleanliness and consistency with the location pill which also has no leading icon. If the icon is intentional, fall back to Option B.

### Option A (preferred): Remove leading icon from staff button
- Drop the `Users`/leading icon from the staff multi-select trigger.
- Both labels now share identical left padding (px-4) and align flush at the same x-coordinate.

### Option B (fallback): Add matching icon to location select
- Add a `MapPin` icon before the location label so both pills have a leading icon at the same offset.
- Less ideal — adds visual weight where none was needed.

I'll confirm which icon is currently in the staff button during implementation and apply Option A.

## Acceptance checks

1. "North Mesa" and "All Stylists That Work This Day" labels share the same left x-coordinate.
2. Chevrons remain flush right.
3. Truncation still works on long labels.
4. No layout shift, no width change.
