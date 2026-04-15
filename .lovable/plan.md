
Prompt feedback: Strong prompt. You described the intended behavior (“viewport card”, responsive, scrollable) instead of only the symptom, which is the right architectural framing. An even stronger version next time would be: “The schedule route is being clipped by the dashboard shell: the week grid grows past the viewport, page scroll is disabled, and the bottom action bar falls below the visible height.”

What I found:
- `DayView.tsx` and `WeekView.tsx` already have internal scroll containers with `min-h-0` and `overflow-auto`.
- The bigger issue is higher up in `DashboardLayout.tsx`: when `hideFooter` is enabled, the outer wrapper uses `h-screen overflow-hidden`, but it is not acting as a real flex-column height shell.
- That makes `<main className="flex-1 ...">` ineffective as a bounded viewport region. The schedule content grows naturally, then the outer shell clips it — which is why the appointments area extends off-screen and the bottom action bar disappears.
- The screenshot supports this: the calendar grid reaches the visible bottom edge, but the footer never gets space inside the viewport.

Implementation plan:
1. Fix the dashboard height chain
   - Update `DashboardLayout.tsx` so `hideFooter` routes use a true full-height flex-column shell.
   - Keep `main` and its inner wrapper as `flex-1 min-h-0`, so child pages receive an actual bounded viewport.

2. Tighten the schedule shell
   - Refactor `Schedule.tsx` into a clean 3-row viewport layout:
     - header: `shrink-0`
     - calendar region: `flex-1 min-h-0 overflow-hidden`
     - action bar: `shrink-0`
   - Reduce stacked vertical padding so more screen height goes to the appointments viewport, especially on shorter laptop screens.

3. Keep scrolling inside the calendar card
   - Ensure `WeekView.tsx` and `DayView.tsx` remain the vertical scroll owners.
   - Keep horizontal overflow inside the week card only, so the scrollbar belongs to the calendar viewport rather than the page shell.

4. Verify responsive behavior
   - Confirm day/week views fit within the visible dashboard shell.
   - Confirm the action bar stays visible at the bottom.
   - Confirm users can scroll down inside the appointments viewport to later time slots.

Files to update:
- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/Schedule.tsx`
- likely `src/components/dashboard/schedule/WeekView.tsx`
- likely `src/components/dashboard/schedule/DayView.tsx`

Technical detail:
- `flex-1` only works when its parent is actually participating in a flex layout.
- Right now the schedule is inside a height-clipped shell, but the top-level `hideFooter` container is not establishing a reliable flex height chain.
- So the calendar expands and gets clipped instead of shrinking and scrolling internally.

Verification:
- Week view: viewport fits on screen, internal scroll works, bottom action bar visible.
- Day view: same behavior, including later time slots.
- Shorter window heights: calendar gets smaller but remains scrollable.
- Quick sanity check on another `hideFooter` route so the shared shell change does not regress other full-screen pages.

Enhancement suggestions after this fix:
- Add a subtle divider/shadow above the action bar so it reads as a pinned command footer.
- Add compact spacing rules for shorter viewport heights to preserve maximum usable grid space.
- Extract a reusable “bounded viewport page” layout pattern for other full-screen dashboard tools so this issue does not recur.
