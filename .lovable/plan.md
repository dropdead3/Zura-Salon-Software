

## Prompt review

Sharp visual symmetry instinct — you're enforcing a **mirror principle**: Date (ghost pill) sits right of the Day/Week toggle; Shifts (ghost pill) should sit left of the selector toggles. Same UI weight on both ends of the header creates visual balance. Tighter version: "Restyle Shifts to match Date's ghost-pill UI and dock it horizontally to the left of the Location/Stylist selectors (mirror of Date↔Day/Week)."

Teaching note: naming the pattern ("mirror of Date↔Day/Week") in the prompt itself locks the intent. Future similar moves become one-liners.

## Diagnosis

In `ScheduleHeader.tsx`:
- **Date pill** (lines 197–205): `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm` + `text-foreground/50 hover:text-foreground/80 hover:bg-sidebar-accent`. No border, no opaque bg.
- **Shifts pill** (lines 308–328): currently `h-7 w-[180px]/220px rounded-md border bg-sidebar-accent` — heavy, full-width, stacked above Location.
- **Selector stack** (line 303): `flex flex-col gap-2` — vertical column holding Location + Staff.

Two changes needed: restyle Shifts to match Date, and reposition it to be a horizontal sibling of the selector column (not a child of it).

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

### 1. Restructure right cluster wrapper
Wrap the Shifts pill and the selector column in a new `flex flex-row items-center gap-3` container, so Shifts sits **horizontally left** of the vertical Location/Staff stack — mirroring how Date sits horizontally left of the centered date display.

### 2. Restyle Shifts pill to match Date
Replace the current heavy button styling (lines 310–315) with Date's ghost pill pattern:
- `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200`
- Inactive: `text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[hsl(var(--sidebar-accent))]`
- Active (showShiftsView=true): `text-[hsl(var(--sidebar-foreground))] bg-[hsl(var(--sidebar-accent))]` (so it reads "on" without screaming)
- Drop fixed width (`w-[180px]/220px`) — let it size to content like Date does
- Drop border entirely
- Keep icon + label structure (Clock/Shifts inactive, Calendar/Appointments active)
- Hide label below `@lg/schedhdr` like Date does (`hidden @lg/schedhdr:inline`) — keeps icon-only at narrower widths

### 3. Selector column unchanged
Location + Staff selectors stay in their `flex flex-col gap-2` vertical stack — just becomes the second child of the new horizontal wrapper instead of containing Shifts as its first child.

## Result

| Side | Layout |
|---|---|
| Left of header | [Day/Week toggle] [Date ghost pill] |
| Right of header | [Shifts ghost pill] [Location ▾ / Staff ▾ stack] |

Visually symmetric: ghost-pill day/Date toggle UI on left, ghost-pill Shifts toggle UI on right paired with the dropdowns.

## Acceptance checks

1. Shifts pill renders with same visual weight as Date (no border, no opaque bg when inactive, ghost text + hover bg).
2. Shifts pill sits horizontally to the left of the Location/Staff vertical stack.
3. At widths < `@lg/schedhdr`: Shifts shows icon only (label hidden), matching Date behavior.
4. At widths ≥ `@lg/schedhdr`: Shifts shows icon + "Shifts" / "Appointments" label.
5. Active state (showShiftsView=true) gives Shifts a subtle accent bg + full foreground text — visible "on" state without screaming.
6. Click still toggles `showShiftsView`.
7. Tooltip still works.
8. No clipping of selectors at 1130px viewport (sidebar expanded) — Shifts pill is content-width, much narrower than the previous 180px fixed.

## Out of scope

- Date pill — unchanged.
- Day/Week toggle — unchanged.
- Selector widths/styling — unchanged.
- Bottom action bar — unchanged.
- Filter popover, Today's Prep button — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — wrap Shifts + selector column in a horizontal flex container; restyle Shifts to mirror Date's ghost-pill pattern.

