
## Prompt review

Crisp, well-scoped UX request — single interaction change with clear intent. Good catch on the double-click friction; for an operator tool used dozens of times per day, every redundant click compounds.

Tighter framing for next time: mention whether the current single-click does *anything* (e.g., selects the column, opens a popover) so I know if I'm replacing existing behavior or just adding a missing handler. I'll check both paths.

## Investigation plan

1. Locate the week view header component (likely `WeekView.tsx` under `src/components/dashboard/schedule/`).
2. Find the day-column header element — check for existing `onClick` / `onDoubleClick` handlers.
3. Identify how view switching works (`setView('day')` + `setCurrentDate(date)`) — same pattern used by the new client search jump.
4. Wire single-click to that same handler, remove the double-click requirement.

## Likely changes

**File: `src/components/dashboard/schedule/WeekView.tsx`** (or wherever the week header strip lives)
- Replace `onDoubleClick={...}` with `onClick={...}` on each day header tile.
- Ensure `cursor-pointer` is present for affordance.
- Keep keyboard accessibility (`role="button"`, `tabIndex={0}`, Enter/Space handler) if it exists; add if missing.

**Possible parent prop wiring** (`Schedule.tsx`):
- If WeekView already receives `onDayClick` / `onSwitchToDay`, no change needed.
- If only `onDayDoubleClick` exists, rename or add a single-click handler that calls `setCurrentDate(day); setView('day');`.

## Acceptance checks

1. Single click on any day header in week view switches to day view focused on that date.
2. No double-click required; double-click still works (browser fires click first) without side effects.
3. Cursor shows pointer on hover over day headers.
4. "Today" header behaves identically to other days.
5. Closed days (Sun/Mon in screenshot) — clicking still switches to day view (operator may need to view a closed day's empty grid).
6. No regression to drag-to-reschedule or any existing week-view interactions.

**Files to investigate & likely modify:**
- `src/components/dashboard/schedule/WeekView.tsx` (header click handler)
- `src/pages/dashboard/Schedule.tsx` (only if prop wiring needs adjustment)
