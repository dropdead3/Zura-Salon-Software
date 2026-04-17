
## Prompt review

Clear and consistent with the prior request — you're targeting the horizontal gap between the sidebar's right edge and the scheduler's left edge. Last round I reduced top padding (vertical) instead of left padding (horizontal), so this prompt is course-correcting. Tighter framing for next time: "horizontal gap" or "left padding" would have removed any ambiguity on the first pass.

## Diagnosis

The schedule page wrapper in `src/pages/dashboard/Schedule.tsx` currently uses `px-4` on the header container (and likely the same on the calendar body). At the current viewport (1415px), this leaves ~16px between the sidebar edge and the first scheduler element.

I need to confirm the exact wrapper classes before changing — likely candidates:
- `src/pages/dashboard/Schedule.tsx` — outer `px-4` wrappers around `ScheduleHeader` and the calendar grid.
- Possibly a shared inner container in `ScheduleContainer` or equivalent.

## Fix

Single-file change in `src/pages/dashboard/Schedule.tsx`:
- Reduce horizontal padding from `px-4` (16px) → `px-2` (8px) on both the header wrapper and the calendar body wrapper, so the entire scheduler shifts left in unison.
- Keep `pt-2` and bottom padding intact.
- Preserve mobile padding if a separate breakpoint is set (likely none — `px-4` is unconditional).

If the calendar grid lives in a separate file with its own padding, I'll match the reduction there too so the header and grid stay flush.

## Acceptance checks

1. Gap between sidebar right edge and scheduler left edge reduced by ~50% (16px → 8px).
2. Header pills and calendar grid shift left together — no misalignment between them.
3. Right-side spacing unchanged.
4. No other dashboard page affected.
