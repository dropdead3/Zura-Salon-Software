
Prompt feedback: This was a strong prompt. You correctly shifted the focus from “the action bar is missing” to “the appointments table is behaving like page content instead of a bounded viewport,” which is the better architectural diagnosis. An even stronger version next time would be: “The day/week scheduler grid should be the scroll owner inside a height-bounded card. Right now the grid expands with content and pushes the action bar below the visible shell.”

What I found:
- `Schedule.tsx` is already closer to the right structure now: header + main area + action bar.
- The remaining issue is lower in the tree: the day/week calendar cards still let the appointment grid expand vertically instead of forcing the grid area to scroll.
- In both `DayView.tsx` and `WeekView.tsx`, the internal scroll owner is `flex-1 overflow-auto`, but it is missing the `min-h-0` height contract that allows a flex child to actually shrink.
- That causes the appointments table to grow taller than its allocated area, which pushes the bottom action bar out of view.

Implementation plan:
1. Make the scheduler shell a true viewport layout in `Schedule.tsx`
   - Keep it as a 3-row flex column:
     - header: `shrink-0`
     - calendar viewport: `flex-1 min-h-0 overflow-hidden`
     - action bar: `shrink-0`
   - Ensure both the appointments branch and shifts branch use the same bounded-height contract.

2. Fix the real overflow bug in `DayView.tsx`
   - Add `min-h-0` to the outer day-view card container.
   - Add `min-h-0` to the inner `scrollRef` container that owns vertical scrolling.
   - Keep the appointments grid clipped inside the card so the card behaves like a responsive viewport panel.

3. Fix the same issue in `WeekView.tsx`
   - Add `min-h-0` to the week-view wrapper.
   - Add `min-h-0` to the internal `overflow-auto` grid container.
   - Preserve horizontal overflow for wide staff/day layouts while vertical scrolling stays inside the card.

4. Normalize the other schedule views if needed
   - Review `MonthView.tsx` and `AgendaView.tsx` so they also respect the same bounded-height pattern.
   - This avoids fixing day/week only to have another view regress later.

5. Keep the action bar layout-driven
   - Do not move back to `absolute bottom-0`.
   - The action bar should remain a normal bottom flex row, visible because the calendar viewport is finally constrained correctly.

Files to update:
- `src/pages/dashboard/Schedule.tsx`
- `src/components/dashboard/schedule/DayView.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`
- possibly `src/components/dashboard/schedule/MonthView.tsx`
- possibly `src/components/dashboard/schedule/AgendaView.tsx`

Technical detail:
- Root cause is flexbox min-size behavior.
- In column flex layouts, a child with `overflow-auto` often also needs `min-h-0`; otherwise its minimum height stays content-sized and it grows instead of scrolling.
- Here, the appointments table is effectively winning the height negotiation, so the footer loses and gets pushed below the visible shell.

Verification:
- Day view: appointment grid stays inside the card, vertical scroll works, action bar remains visible.
- Week view: same behavior, including horizontal overflow where needed.
- Shifts view: still fills the available area cleanly.
- Resize test: larger and smaller window sizes keep the scheduler acting like a viewport card.
- Copilot closed/open states still respect the bounded height layout.

Enhancement suggestions after this fix:
- Add a subtle top shadow or divider to the action bar so it reads as a pinned command footer.
- Add bottom safe-area spacing logic for tighter laptop heights.
- Add a tiny gradient fade at the bottom of the calendar viewport to signal more scrollable content.
