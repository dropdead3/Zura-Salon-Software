
Strong prompt: “cards are still not kissing” is useful because it makes the bug visual and specific. The stronger version next time would be: “a long appointment and later-starting overlaps are being laid out with different column widths; keep all cards fully rounded/stroked, but make every simultaneously active appointment share the width evenly.” That points directly to the real layout failure instead of the card styling layer.

Goal
Fix scheduler overlap layout so appointments that share the same time block use one consistent overlap layout and physically touch, while keeping every card fully rounded and fully stroked.

What is actually wrong now
- The problem is no longer primarily card chrome.
- `AppointmentCardContent.tsx` is already restoring `rounded-lg`, full borders, and inset selection rings.
- The real bug is `getOverlapInfo()` in `src/lib/schedule-utils.ts`:
  - it calculates overlap width per appointment by only looking at appointments that overlap that single appointment
  - this means two appointments in the same visual conflict cluster can get different `totalOverlapping` counts and different `columnIndex` values
  - long-running cards can be sized from one overlap set while later cards are sized from another
- Result: cards in the same visible stack do not share the same column math, so a large vertical seam/gap appears even before borders/radii are considered.

Implementation
1. Replace per-appointment overlap math with cluster-based packing
- In `src/lib/schedule-utils.ts`, replace the current `getOverlapInfo()` usage pattern with a cluster-aware layout helper.
- Build a helper that, for a full appointment list, returns a layout map keyed by appointment id:
  - `columnIndex`
  - `totalColumns`
  - `clusterId`
  - `isOverlapping`
- The helper should:
  - sort appointments by start/end time
  - build connected overlap clusters
  - assign stable columns using first-fit interval packing
  - compute one shared `totalColumns` for every appointment in the same conflict cluster
- This ensures all cards in the same overlap group use the same column system.

2. Keep the “kissing” behavior, but apply it against stable columns
- Keep `getOverlapColumnLayout()`, but change it to consume the stable cluster result:
  - `columnIndex`
  - `totalColumns`
- Preserve full rounded corners and full borders on every card.
- Preserve the slight physical overlap (“kiss”) and left-to-right z-stacking so borders visually tuck together.
- Tune the kiss value only after the layout map is corrected; the current gap is too large to be solved by px overlap alone.

3. Refactor Day view to compute layout once per stylist column
- In `src/components/dashboard/schedule/DayView.tsx`:
  - stop calling `getOverlapInfo(stylistAppointments, apt)` inside the render loop
  - compute one overlap layout map for `stylistAppointments`
  - pass each appointment’s shared cluster layout into `AppointmentCard`
- This makes every overlapping card in that stylist column render from the same layout contract.

4. Refactor Week view to compute layout once per day column
- In `src/components/dashboard/schedule/WeekView.tsx`:
  - stop calling `getOverlapInfo(dayAppointments, apt)` inside the render loop
  - compute one overlap layout map for the entire day column
  - pass the stable layout into `WeekAppointmentCard`
- Day and Week views should use the exact same helper so they cannot drift again.

5. Keep card chrome intact
- In `src/components/dashboard/schedule/AppointmentCardContent.tsx`:
  - keep `rounded-lg`
  - keep full stroke on all four sides
  - keep `ring-inset` for selected/no-show states
  - do not reintroduce edge suppression or flattened shared seams
- Any remaining adjustment here should only be minor polish, not structural layout logic.

Files to update
- `src/lib/schedule-utils.ts`
- `src/components/dashboard/schedule/DayView.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` only if tiny polish is needed after the layout fix

QA
- Two overlapping appointments share the width 50/50 and touch with no visible gutter.
- Three simultaneous appointments share the width 33/33/33 and kiss edge-to-edge.
- A long appointment that overlaps different later appointments stays aligned to the same shared cluster columns instead of drifting or leaving a gap.
- Selected cards still show full rounded corners and full visible stroke/ring.
- Day view and Week view render the same conflict case identically.

Enhancement suggestion
After this lands, the best follow-up is to promote overlap packing into a scheduler canon: one shared “conflict cluster layout” helper used by appointments, drag previews, breaks, coverage blocks, and any future schedule overlays. That prevents this exact bug class from reappearing in another schedule surface.
