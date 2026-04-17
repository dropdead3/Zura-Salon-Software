
## Prompt review

Clear and spatially explicit — you named both the source ("Shifts button") and the destination ("right of the Day/Week toggle"). Good model prompt. Tighter framing for next time: a one-word note on what to do with the now-empty space ("collapse the gap" vs "leave room") would prevent any micro-decision drift.

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx`:
- **Day/Week toggle** lives in the left cluster (lines 222-255), inside the `flex items-center gap-3` group with the date picker.
- **Shifts toggle** currently lives in the right cluster (lines ~397-426), grouped horizontally with the Location/Staff selector stack.

Both sit in the same dark header bar, so this is purely a re-parenting move within one file.

## Fix

Single-file change in `src/components/dashboard/schedule/ScheduleHeader.tsx`:

1. **Cut** the entire `{onToggleShiftsView && (…)}` Tooltip+button block from the right cluster (the inner row at line ~395).
2. **Paste** it into the left cluster, immediately after the Day/Week toggle's closing `</div>` (right after line 254/255), inside the same `flex items-center gap-2` group.
3. Keep the Shifts pill's existing styling (`px-3 py-1.5 rounded-full`, accent background when active) — it visually mirrors the Day/Week segmented control and will sit cleanly to its right.
4. After removal from the right cluster, audit that the `flex flex-row items-center gap-3` wrapper still makes sense — if it now contains only the Location/Staff stack, the `gap-3` is harmless but the wrapper can stay (no structural simplification needed unless it causes a stray gap; one quick check on the rendered output).

## Acceptance checks

1. Shifts toggle renders immediately to the right of the Day/Week pill, in the left header cluster.
2. Right cluster contains only Location + Staff selectors (and any remaining filter icons unchanged).
3. Active/inactive Shifts state still toggles correctly with no visual regression.
4. Tooltip on Shifts button still works.
5. Mobile layout (<@md) still wraps cleanly — verify by checking the row 1 / row 2 split still makes sense with Shifts now in row 1.
6. `@lg/schedhdr:inline` label visibility for "Shifts" / "Appointments" still triggers at the same breakpoint.

## Follow-up enhancements

- Consider whether the date picker (currently absolutely centered at `@md+`) needs to recentre now that the left cluster is wider — it's positioned via `left-1/2` so it'll stay centered on the bar regardless, but visual balance may shift slightly.
- If the right cluster now feels sparse, the staff online-count or capacity badge from `ScheduleHeader` could be promoted there in a future pass.
