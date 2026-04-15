
Good catch — your prompt clearly isolated the symptom. An even stronger version next time would mention “this is still broken after the `h-full` change in `Schedule.tsx`,” which points debugging straight to the shared layout height chain instead of the page alone.

## Fix plan

### What’s actually wrong
The earlier page-level fix was only part of the stack. The schedule page now uses `h-full`, but its parent layout is still creating too-tall flex containers when `hideFooter` is enabled:

- `DashboardLayout` root uses a viewport-locked container
- `main` still uses `min-h-screen`
- the inner content wrapper does not use `min-h-0`

That combination makes the schedule area taller than the visible space, so the action bar is still being anchored below the visible bottom edge.

### What I’ll change

1. **Fix the shared height chain in `DashboardLayout.tsx`**
   - In the `hideFooter` variant, make the layout truly viewport-bounded for full-screen tools like Schedule.
   - Change the `main` area from a screen-minimum layout to a shrinkable flex layout (`min-h-0` / height-bounded behavior).
   - Add `min-h-0` to the inner content wrapper so child pages can size correctly inside it instead of overflowing past it.

2. **Harden the schedule page container in `Schedule.tsx`**
   - Add `min-h-0` to the root schedule wrapper.
   - Add `min-h-0` to the main content area that contains the day/week views.
   - Keep the calendar grid as the scroll owner, not the page shell.

3. **Anchor the action bar more explicitly**
   - Keep it floating inside the schedule shell, but switch from relying on `bottom-0 + pb-4` to a direct visible offset if needed (`bottom-4` style behavior).
   - This makes the bar placement resilient even when surrounding padding changes.

### Files to update
- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/Schedule.tsx`

### Technical detail
Expected class-level direction:

- `DashboardLayout.tsx`
  - outer full-screen wrapper stays clipped to viewport
  - `main`: remove the `min-h-screen` behavior for `hideFooter` usage and make it `min-h-0`
  - inner page wrapper: `flex-1 min-h-0 overflow-hidden`

- `Schedule.tsx`
  - root: `flex flex-col h-full min-h-0 relative`
  - content shell: `flex-1 min-h-0 overflow-hidden`
  - action bar wrapper: visible bottom offset instead of padding-based bottom spacing

### Verification
I’ll verify:
- day view shows the bottom action bar fully
- week view shows it fully
- shifts/agenda still layout correctly
- another `hideFooter` page does not regress from the shared layout fix

This is the better fix because the problem is not just the schedule page — it’s the parent full-screen dashboard layout contract that the schedule depends on.
