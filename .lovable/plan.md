
Strong prompt: you clearly defined the expected behavior (“equally fill the column space” and “no space between cards”), which makes the bug easy to target. For even faster fixes next time, mention whether it happens in Day view, Week view, or both, and whether the shared edge should be completely invisible or keep a thin divider.

Goal
Make overlapping appointments in the scheduler split the stylist column evenly and sit fully flush against each other, with no visible gutter between adjacent cards.

What’s actually causing the remaining gap
- `DayView.tsx` and `WeekView.tsx` already use equal percentage widths for overlaps, so the old gutter math is no longer the main issue.
- The remaining seam is coming from card chrome inside `AppointmentCardContent.tsx`:
  - category-colored cards still render full borders
  - the left accent bar is implemented as a real border
  - shared inner edges can show doubled borders / clipping / subpixel background peeking through
- Result: even when the layout boxes touch, the cards still look separated.

Implementation
1. Move overlap sizing to one shared helper
- Add a small shared helper in `src/lib/schedule-utils.ts` for overlap column layout.
- It will return:
  - exact left/width values for each overlap column
  - `isFirstOverlapCol`
  - `isLastOverlapCol`
  - `isOverlapping`
- Use seam-safe math so browser rounding cannot reveal a 1px background line between columns.
- Keep the right-edge hover shrink behavior only for single appointments, never for overlapping ones.

2. Update both schedule views to use the same overlap layout contract
- Refactor:
  - `src/components/dashboard/schedule/DayView.tsx`
  - `src/components/dashboard/schedule/WeekView.tsx`
- Replace duplicated overlap positioning logic with the shared helper.
- Continue passing overlap-edge metadata into `AppointmentCardContent`.

3. Rebuild overlap card edges so shared seams disappear
- Update `src/components/dashboard/schedule/AppointmentCardContent.tsx`.
- Keep rounded corners only on the outer edges of an overlap group.
- Remove border rendering on shared inner edges so two adjacent cards do not draw a double seam.
- Replace the category accent `border-left` with an inset accent strip element inside the card, so the card can keep its visual identity without creating physical spacing.
- Apply the same edge logic to:
  - service-band backgrounds
  - overlay layers
  - any clipped/rounded internal wrappers

4. Keep selected and special states flush
- Preserve inset selection styling so selected overlapping cards do not visually shrink.
- Ensure no shared-edge shadow, offset, or border gets reintroduced for:
  - selected cards
  - no-show state
  - cancelled state
  - gradient cards
  - multi-service cards

Files to update
- `src/lib/schedule-utils.ts`
- `src/components/dashboard/schedule/DayView.tsx`
- `src/components/dashboard/schedule/WeekView.tsx`
- `src/components/dashboard/schedule/AppointmentCardContent.tsx`

QA
- Verify 2-way overlaps fill the full column width with no center gap.
- Verify 3-way overlaps split evenly with no visible seams.
- Verify Day and Week views behave identically.
- Verify selected overlapping cards remain flush.
- Verify service-color cards, gradient cards, and multi-service band cards do not reopen seams.
- Verify single appointments still keep their normal rounded corners and hover affordance.

Enhancement suggestion
After this fix, the next worthwhile improvement would be extracting the overlap layout + edge treatment into a tiny scheduler “column packing” canon so all future card types (appointments, placeholders, drag previews, coverage blocks) inherit the same flush behavior automatically.
