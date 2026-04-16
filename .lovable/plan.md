
## Prompt review

Clear and specific — you identified the exact button (`+ Add Event`), the exact side (left), and the desired outcome (visually equal padding all around). The screenshot confirms the asymmetry: the left edge of the pill sits closer to the container's left wall than the right edge sits to its right neighbor. Teaching note: when reporting spacing nits, naming the container ("ScheduleActionBar") would let me jump straight to the source. Micro-improvement: specifying the target gap in pixels (e.g., "match the 8px right padding") makes the fix deterministic.

## Diagnosis

Need to inspect `ScheduleActionBar.tsx` to see the current container padding and confirm whether the asymmetry comes from:
1. Container padding (`pl-X` vs `pr-X` mismatch), or
2. Button-internal padding via `tokens.button.page` / size variant.

Most likely the container uses `p-1` or `pl-2` while the right side has natural breathing room from sibling controls. Will read the file before finalizing the exact class.

## Fix

Reduce the **container's left padding** in `ScheduleActionBar.tsx` so the gap between the action-bar's left edge and the pill matches the gap between the pill and the next control on the right. One-class change, no token churn.

## Acceptance checks

1. Visual: left and right gaps around the `+ Add Event` pill within the action bar appear equal at 100% and 200% zoom.
2. No layout shift on other controls in the action bar (date picker, view toggles).
3. No change to the button's internal padding — only the container offset.

## Out of scope

- Restyling the button itself or changing its size variant.
- Touching other action bar controls.

## Files touched

- `src/components/dashboard/schedule/ScheduleActionBar.tsx` — reduce left padding on the container wrapping the `+ Add Event` button.
