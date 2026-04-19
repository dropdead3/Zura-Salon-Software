

## Replace "W 16" week indicator with location name (multi-location only)

### What & why
The DayView grid currently shows `W {weekNumber}` (e.g. "W 16") in the 70px corner cell at the top-left of the time gutter. When an org has multiple locations and operators toggle between them, this corner is wasted space — they need to see *which location's schedule they're on*, not the ISO week number (already implied by the date header above).

For single-location orgs the week label is harmless but equally non-informative; for multi-location orgs it actively obscures the answer to the most important question ("am I on North Mesa or Val Vista?").

### Where
Single render site: `src/components/dashboard/schedule/DayView.tsx`, line 651 (the corner cell at lines 649–652). WeekView does not render this indicator — no change needed there.

### The change

**1. `src/pages/dashboard/Schedule.tsx`** — pass two new props into both `<DayView>` instances (lines 874 and 903):
- `locationName={selectedLocationData?.name}` 
- `isMultiLocation={locations.length > 1}`

**2. `src/components/dashboard/schedule/DayView.tsx`**:
- Add `locationName?: string` and `isMultiLocation?: boolean` to `DayViewProps`.
- Destructure both in the function signature.
- Replace the corner cell content (line 651) with conditional logic:
  - If `isMultiLocation && locationName` → render the location name, truncated with `truncate` and a `title` attribute for full-name tooltip on hover.
  - Else → keep `W {weekNumber}` (preserves existing behavior for single-location orgs and avoids regressing the visual).
- Keep the same 70px width, sidebar background, border, and small muted typography. Use `font-display tracking-wide uppercase text-[10px]` for the location label so it matches the platform's Termina-uppercase convention for short metadata labels (per design tokens canon — labels in this size class use Termina, not Aeonik).

### Edge cases handled
- **Long location names** (e.g. "Drop Dead Salons — North Mesa"): 70px is tight. Truncate with ellipsis + `title` attribute. If the name is genuinely long, the dropdown selector above already shows the full name; this corner is a glanceable confirmation, not the primary identifier.
- **Single-location orgs**: behavior unchanged (still shows `W {weekNumber}`). Avoids gratuitous churn.
- **No location selected** (`!selectedLocationData` branch at line 902): falls through to the `W {weekNumber}` default since `locationName` will be undefined.

### Out of scope
- Widening the 70px corner cell (would shift the entire grid alignment — separate UX decision if needed).
- Adding location indicator to WeekView/AgendaView (no equivalent corner cell exists; the date columns themselves are the orientation cue).
- Replacing the location dropdown in `ScheduleActionBar` — that's the primary control; this is just a glanceable confirmation in the calendar surface itself.

### Verification
- Single-location org: corner still shows `W 16`. No regression.
- Multi-location org: corner shows truncated location name (e.g. "North Mesa" or "Val Vista La…" with hover tooltip). Toggling locations via the dropdown updates the corner immediately.
- Dark mode: text remains legible against `bg-sidebar`.
- 200% zoom: truncation still clean, no overflow.

### Prompt feedback
Clear ask with crisp rationale ("easily determine which schedule is being viewed when toggling") — that framing tells me both *what* to change and *why*, which is what makes this a one-shot plan instead of a back-and-forth. The screenshot pinpointed the exact element so I didn't have to guess.

One refinement for next time: when a UI element should change behavior conditionally ("when the org has multiple locations"), explicitly name what you want to happen in the *other* condition too. You implied "keep W16 for single-location" but didn't say it — I inferred it because regressing single-location orgs would be silly, but a stricter prompt ("multi-location: show location name; single-location: keep week number or hide entirely?") removes the inference. In this case both reasonable interpretations land in the same place, but on a more contested element I might guess wrong.

