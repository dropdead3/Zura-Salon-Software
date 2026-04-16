
## Prompt review

Clear, surgical prompt — you named the surface ("scheduler header bar"), the elements ("these 2 toggles"), and the exact fix ("left aligned"). The screenshot removed all ambiguity. Tighter framing isn't really needed here; this is a model prompt for a small visual fix.

## Diagnosis

Both controls live in `src/components/dashboard/schedule/ScheduleHeader.tsx` (lines ~432–482), stacked vertically in the header:

1. **Location Selector** (`Select` + `SelectTrigger`, line 441) — uses default `SelectTrigger` styling. The trigger is `flex justify-between`, but the inner `SelectValue` span renders text that visually appears centered inside the pill because the span stretches and inherits no explicit `text-left`.
2. **Staff Multi-Select** (`Button` + `PopoverTrigger`, line 471) — uses `justify-between`, but the label is rendered as a bare text node that also reads as visually centered against the chevron.

The visual centering effect happens because the text span isn't explicitly left-aligned and the chevron sits flush right, making the gap between text-end and chevron-start look symmetric to the text-start and pill-edge.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

### A. Location Select trigger
Add `text-left` and wrap the `SelectValue` so its containing span is forced to `flex-1 text-left`:
- Add `text-left` class to the `SelectTrigger`
- This propagates to the `SelectValue` span via inheritance

### B. Staff multi-select Button
Wrap the label text in a `<span className="flex-1 text-left truncate">` so the text fills available width and aligns left, with the chevron pushed flush right by `justify-between`.

That's it. No token changes, no layout changes, no other surface affected.

## Acceptance checks

1. "North Mesa" sits flush-left inside the location pill, chevron flush-right.
2. "All Stylists That Work This Day" sits flush-left inside the staff pill, chevron flush-right.
3. Long stylist names (single-select case) truncate with ellipsis, still left-aligned.
4. No layout shift, no width change, no impact on dropdown contents.

## Follow-up enhancements

- Audit other pill-style `SelectTrigger` instances across the dashboard (LocationSelect, AnalyticsFilterBar) for the same centering perception — apply `text-left` consistently as a default in the base `SelectTrigger` component if it's a recurring pattern.
- Consider adding a `text-left` default to the shared `SelectTrigger` in `src/components/ui/select.tsx` so this never recurs in any new surface.
