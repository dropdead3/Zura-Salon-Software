
## Prompt review

Sharp diagnosis — you identified the exact regression: "Fit" looks correct, but the first slider step (120px) is *narrower* than Fit, which makes the slider feel broken. Good framing: you named the symptom, the expected behavior, and the boundary condition.

Tighter framing for next time: explicit min value ("start at ~200px" or "match the fit width") would let me skip the measurement step. Right now I'll infer: the minimum stretched width should equal the natural Fit width at typical desktop viewports.

## Diagnosis

Current slider range in `Schedule.tsx` / `ScheduleHeader.tsx`: `120px` → `400px`, step `20px`, with "Fit" as a separate position at the far left.

At the user's viewport (1553px), Fit produces columns of roughly `(1553 - sidebar - 70px gutter - padding) / 7` ≈ **200px per column**. So when the user nudges the slider off Fit, it jumps to 120px — an 80px *reduction* per column. That's the bug: the "stretch" range starts below the baseline.

## Fix

Single-concept change across two files:

**1. Raise the slider minimum to 200px** (matches typical Fit width on standard desktop layouts).
- New range: `200px` → `400px`, step `20px`.
- Fit remains as the leftmost discrete option (special "auto" sentinel value).
- Sliding off Fit now always *widens* columns vs. their natural state — never narrows them.

**2. Update the readout** so the displayed value matches the new floor (no more "120" appearing).

**3. Migration safety**: any existing `localStorage` value below 200 should be clamped up to 200 on read (one-line guard in the Schedule.tsx initializer).

## Files

- `src/pages/dashboard/Schedule.tsx` — clamp localStorage hydration to `>= 200`.
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — change slider `min` from 120 → 200.

## Acceptance checks

1. Slider's first step beyond Fit produces columns ≥ Fit width (no condensing).
2. Readout shows `200` at the leftmost stretched position, never `120`.
3. Fit option still works identically (auto-fills viewport).
4. Existing users with `weekDayWidth = 120` in localStorage get bumped up to 200 silently.
5. Max (400) unchanged.

## Follow-up enhancement (not in scope)

A truly dynamic floor would measure the rendered Fit width per viewport and use *that* as the slider minimum (so a 1920px monitor would start at ~250px, not 200px). For now, 200px is a safe universal floor that solves the visible regression. If you want viewport-adaptive minimums, flag it and I'll add a measurement hook.
