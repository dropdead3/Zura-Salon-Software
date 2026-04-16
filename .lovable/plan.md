
## Prompt review

Strong instinct — you spotted the inconsistency: type selector is a centered popover, but the meeting wizard it spawns is a right-side drawer. Two different surface paradigms back-to-back feels jarring. Teaching note: naming the target surface explicitly ("the side drawer used by `MeetingSchedulerWizard`") would have saved me one inspection step. Micro-improvement: when calling out a UX inconsistency, also state which surface should win — e.g., "make the popover match the drawer" vs. "make the drawer match the popover."

## Diagnosis

Today there are two separate surfaces:

1. **Type Selector** — centered `Dialog` popover (`Schedule.tsx` line 1251), small, glass-styled.
2. **Meeting Wizard** — right-side `PremiumFloatingPanel` drawer (`MeetingSchedulerWizard.tsx` line 284), full-height, glass-styled.

Picking "Internal Meeting" closes the popover and slides in the drawer from the right — a jarring surface swap mid-flow. Picking "Client Appointment" or "Timeblock" opens yet other surfaces. The type choice is conceptually step 0 of a single flow, so it should live in the same drawer.

## Fix

Make the type selector the **first step inside the right-side drawer**, then route to the appropriate flow when a tile is picked.

### 1. New unified entry drawer — `ScheduleEntryDrawer.tsx`

Wraps `PremiumFloatingPanel` (right side, `maxWidth="28rem"`, matching `MeetingSchedulerWizard`'s shell). Renders:

- Header: `font-display text-base tracking-wide` reading "ADD EVENT"
- Body: the existing `ScheduleTypeSelector` tiles (already glass-styled, reused as-is)
- No footer (tile click = action)

Props: `open`, `onOpenChange`, `selectedTime?`, `onSelectClientBooking`, `onSelectMeeting`, `onSelectTimeblock`.

### 2. `Schedule.tsx` — replace the centered Dialog (lines 1250–1273)

Swap the `<Dialog>...<ScheduleTypeSelector/></Dialog>` block for `<ScheduleEntryDrawer ... />` with the same three handlers. State (`typeSelectorOpen`) and trigger logic stay identical — only the surface changes.

### 3. Meeting flow continuity

When user picks "Internal Meeting": close entry drawer → open `MeetingSchedulerWizard` (also a right-side drawer at `28rem`). Same side, same width, same glass — feels like a single continuous surface, no jarring swap.

Client Appointment and Timeblock continue routing to their existing surfaces (booking surface and break dialog respectively) — out of scope to migrate those.

### 4. Cleanup

Remove now-unused `Dialog`/`DialogContent`/`DialogTitle` imports from `Schedule.tsx` only if no other usage remains (will verify before removing).

## Acceptance checks

1. Clicking "+ Add Event" opens a right-side drawer (not a centered popover).
2. Drawer shows "ADD EVENT" header + the three glass tiles.
3. Picking "Internal Meeting" transitions smoothly into the wizard drawer (same side, width, aesthetic).
4. Picking "Client Appointment" opens the booking surface as before.
5. Picking "Timeblock / Break" opens the break dialog as before.
6. Time-aware prompt ("What would you like to schedule at 1:30 PM?") still renders when triggered from a slot.
7. No regression: keyboard, focus trap, escape-to-close all preserved (handled by `PremiumFloatingPanel`).

## Out of scope

- Migrating the booking surface or break dialog to the same drawer (separate refactor; their flows are heavier).
- Renaming `typeSelectorOpen` state variable (internal name, no user impact).
- Touching `ScheduleTypeSelector.tsx` internals — the tiles already match the aesthetic.

## Files touched

- `src/components/dashboard/schedule/meetings/ScheduleEntryDrawer.tsx` — new wrapper component (PremiumFloatingPanel + header + ScheduleTypeSelector).
- `src/components/dashboard/schedule/meetings/index.ts` — export the new component.
- `src/pages/dashboard/Schedule.tsx` — replace the centered Dialog block with `ScheduleEntryDrawer`.
