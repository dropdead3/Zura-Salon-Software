
## Prompt review

Strong product instinct — you're trading a passive monitoring widget (payment queue) for an active operator tool (client search). Good move: the "All clear" state was occupying prime real estate without earning it most of the time, while client lookup is a constant friction point at the front desk.

Tighter framing for next time: clarify behavior on (1) **multiple matches** (e.g., two "Sarah"s — show dropdown? jump to closest?), (2) **no appointments today for that client** (jump to next future appt? show "no appts found"?), and (3) **week/agenda view** (does search still work?). I'll propose sensible defaults below — flag if any miss.

## Proposed behavior

- **Replace** the payment queue (lines 146–191 of `ScheduleActionBar.tsx`) with an inline search input.
- **Search scope**: all loaded appointments (today + visible range), match against `client_name` (case-insensitive substring).
- **Results**: dropdown popover showing matched appointments grouped by client, sorted by soonest (today first → future → past), max ~6 results. Each row shows client name, time, date (if not today), service, stylist.
- **Click result**: opens the existing `selectedAppointment` detail panel + jumps the calendar to that appointment's date in day view (same pattern as the deep-link in `Schedule.tsx` lines 540–550).
- **Empty input**: dropdown closed, no "All clear" replacement — the search bar itself is the affordance.
- **No matches**: dropdown shows "No appointments found for '{query}'".
- **Visible in all views** (day/week/agenda) — operators search regardless of current view.

## Plan

**1. Build inline search component** (`ScheduleActionBar.tsx`)
- Replace queue block with a compact search input (`tokens.input.search` style, ~280px max width, `flex-1` so it consumes the same center space).
- Use `Search` icon (lucide) inside input, debounce 200ms.
- Popover/dropdown anchored to input, `align="start"`, max-height with scroll.

**2. Search & rank logic** (inside component)
- Filter `appointments` prop by `client_name.toLowerCase().includes(query.toLowerCase())`.
- Rank: today's appointments first (sorted by start_time ascending), then future dates (chronological), then past (reverse chronological).
- Cap displayed results at 6; show "+N more" footer if exceeded.
- Each result row: `<button>` with name (medium weight), time + relative date label ("Today 2:30 PM" / "Tomorrow 10:00 AM" / "Apr 22, 3:15 PM"), service · stylist (muted).

**3. Wire selection to existing handler**
- New prop `onJumpToAppointment(apt)` on `ScheduleActionBar`, or reuse existing `onSelectAppointment` and add a sibling `onFocusDate(date: string)`.
- In `Schedule.tsx` (line 1051), implement: `setCurrentDate(parseISO(apt.appointment_date)); setView('day'); setSelectedAppointment(apt); setDetailOpen(true);` — same pattern as the existing deep-link effect.
- Close popover + clear query after selection.

**4. Remove obsolete code**
- Delete `buildPaymentQueue`, `QueueItem`, `UrgencyLevel`, `useOrgNow` import (if unused elsewhere in file), and the queue rendering block.
- Keep `getFirstName` only if still used; otherwise delete.

**5. Keyboard UX**
- `↑/↓` navigate results, `Enter` selects first/highlighted, `Esc` clears + closes.
- Auto-focus input not required (would steal focus on every render); user clicks to focus.

## Acceptance checks

1. Payment queue ("All clear" / urgency bubbles) is removed entirely from the action bar.
2. Search input appears in the same center slot, expands to fill available space (capped reasonable max width).
3. Typing 2+ chars shows dropdown with matched appointments.
4. Today's appointments rank above future; future above past.
5. Clicking a result: jumps calendar to that date, switches to day view, opens detail panel for that appointment.
6. Works in day, week, and agenda views.
7. No matches → "No appointments found" message.
8. Esc closes dropdown; clicking outside closes dropdown.
9. No layout shift on FAB or right-side controls (zoom, legend, drafts, etc.).
10. `getFirstName` / `buildPaymentQueue` / `useOrgNow` cleaned up if no longer referenced.

**Files to modify:**
- `src/components/dashboard/schedule/ScheduleActionBar.tsx` (replace queue with search + dropdown, remove queue logic)
- `src/pages/dashboard/Schedule.tsx` (extend `onSelectAppointment` handler to also jump date + switch to day view, OR add new `onJumpToAppointment` prop)
