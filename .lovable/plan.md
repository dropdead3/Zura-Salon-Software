
## Prompt review

Clear, scoped prompt — you named the surface ("nav bar / scheduler elements") and the direction ("reduce slightly"). Tighter framing would specify a target: "reduce by ~8px" or "match the top nav padding" — right now I'll infer "noticeable but conservative" (roughly cut horizontal gap in half).

Looking at the screenshot: the gap between the left sidebar's right edge and the scheduler's left card edge is visibly generous (~24-32px). You want it tighter.

## Diagnosis

The schedule page lives at `/dashboard/schedule`. Padding between the sidebar and the scheduler content is controlled by the page-level wrapper, not the sidebar itself. Likely culprits:

1. `src/pages/dashboard/Schedule.tsx` (or equivalent) — outer container with `p-6`/`p-8`/`px-8`.
2. `DashboardLayout` — the slot that wraps `{children}` may add left padding on top of the page's own padding.
3. The `ScheduleHeader` or `ScheduleContainer` may have its own left margin.

I need to read these to identify which layer owns the horizontal gap and reduce only that one (avoid double-shrinking).

## Fix (proposed)

Single-file change once I confirm the source:
- Reduce the left padding on the schedule page container by one step (e.g., `px-8` → `px-4`, or `p-6` → `pl-3`).
- Keep top/right/bottom padding intact so only the sidebar-adjacent gap tightens.
- Preserve mobile padding (don't shrink `< lg` breakpoint).

If the gap originates in `DashboardLayout`'s shared slot, I'll scope the change to the schedule route only (via a className override on the schedule page) so other dashboard pages aren't affected.

## Acceptance checks

1. Visible gap between sidebar right-edge and scheduler card left-edge is reduced by ~50%.
2. Top, right, and bottom spacing unchanged.
3. Mobile layout unaffected.
4. No other dashboard page (Leaderboard, Stats, etc.) shifts.
