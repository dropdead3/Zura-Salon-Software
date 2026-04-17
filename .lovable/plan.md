
## Prompt review

Direct and clear. Tighter framing for next time: a concrete number ("up to 1000px") removes the guesswork. I'll infer: another meaningful jump, doubling the previous extension — `600 → 900px`.

## Fix

1. **`ScheduleHeader.tsx`** — slider `max` from `600` → `900`.
2. **`Schedule.tsx`** — clamp ceiling on localStorage hydration to `<= 900`.
3. **`ScheduleHeader.tsx`** comment — update doc range to `200-900`.

Floor (200/Fit), step (20) unchanged.

## Acceptance checks

1. Slider reaches 900px columns at the right edge.
2. Readout shows up to `900`.
3. Horizontal scroll continues to work.
