
## Prompt review

Clear and minimal — you're asking for more headroom on the upper end of the slider. Tighter framing for next time: a target ("up to 600px" or "double the current max") would let me skip guessing. I'll infer: roughly 1.5x the current max, which gives meaningful breathing room without making a single day fill the entire viewport.

## Diagnosis

Current slider max in `ScheduleHeader.tsx`: `400px`. At your 1553px viewport, 400px columns already require horizontal scrolling (7 × 400 = 2800px). Raising the ceiling lets power users with very dense days (10+ overlapping appointments) spread cards out further.

## Fix

Single-line change, two files:

1. **`ScheduleHeader.tsx`** — raise slider `max` from `400` → `600`. Keep step at `20` (gives 21 stops from 200→600, still smooth).
2. **`Schedule.tsx`** — clamp the upper bound on localStorage hydration to `<= 600` (defensive; matches the new ceiling).

Floor (200px / "Fit") and step (20px) unchanged.

## Acceptance checks

1. Slider's right edge now reaches 600px columns.
2. Readout displays values up to `600`.
3. Fit and 200px floor behavior unchanged.
4. Horizontal scroll continues to work at the wider extremes; sticky time gutter remains visible.
