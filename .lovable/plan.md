
## Prompt review

Clear and direct. Tighter framing would specify the target width or "until both labels fit without truncation" — right now I'll infer the latter, since the screenshot shows "All Stylists That Work This D…" truncating.

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx`, both toggles are currently set to:
- `w-[180px] @lg/schedhdr:w-[220px]`

At 220px, the staff label "All Stylists That Work This Day" still truncates. Need ~280px to fit comfortably.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

Bump both triggers (Location `SelectTrigger` + Staff `Button`) to a wider width so:
- Both stay visually aligned at the same width (preserved parity)
- "All Stylists That Work This Day" fits without truncation
- Header still respects responsive breakpoints

Proposed widths:
- Base: `w-[220px]`
- `@lg/schedhdr:w-[280px]`

This keeps the controls compact on narrow viewports and gives them room on the standard desktop layout.

## Acceptance checks

1. Both pills render at the same width (220px → 280px at lg breakpoint).
2. "All Stylists That Work This Day" displays in full, no ellipsis.
3. "North Mesa" still flush-left, chevron flush-right.
4. No layout shift in the surrounding header bar.
