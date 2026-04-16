
## Prompt review

Clear and visual — screenshot makes intent unambiguous. Tighter version: "Center the date pill within the available header row width (not just within the left cluster)." Teaching note: when asking for centering, specify the *centering reference frame* (parent container vs. viewport vs. row) — saves a clarification round.

## Diagnosis

Looking at the screenshot: Day/Week toggle sits left, date sits ~1/3 from left, then a large empty gap, then Shifts + selectors on the right. The date is currently rendered inside the **left cluster** wrapper (sibling of Day/Week toggle), so it's left-anchored rather than centered in the row.

Need to read `ScheduleHeader.tsx` to confirm current Row 1 structure.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

Restructure Row 1 (the wrapper at L154) into a 3-zone layout so the date can occupy the true center:

**Option A — flex with spacer (preferred, simplest):**
- Row 1 becomes `flex items-center justify-between w-full`
- Three children:
  1. Left zone: Day/Week toggle (no date)
  2. Center zone: Date pill (`absolute left-1/2 -translate-x-1/2` inside a relatively-positioned Row 1, OR use `flex-1` with `justify-center`)
  3. Right zone: empty spacer matching left zone width (so center stays true center)

**Option B — CSS Grid (cleaner, recommended):**
- Row 1: `grid grid-cols-3 items-center w-full`
- Left cell: Day/Week toggle (`justify-self-start`)
- Center cell: Date pill (`justify-self-center`)
- Right cell: empty (`justify-self-end`) — reserved so right column (Shifts + selectors) doesn't push the date off-center

Going with **Option B (grid)** — geometrically guarantees the date sits at the row midpoint regardless of left/right cluster widths, no spacer hacks, no absolute positioning.

### Implementation
1. Change Row 1 wrapper class from current `flex` layout to `grid grid-cols-3 items-center w-full`
2. Wrap Day/Week toggle in a `justify-self-start` div
3. Move the Date pill out of the left cluster into its own `justify-self-center` div (the new center cell)
4. Right cluster (Shifts + selectors) is **not** part of Row 1 — it lives in Row 2 already, so no change needed there

Wait — need to verify: in the screenshot, Shifts + selectors appear on the same visual row as Day/Week + date. That's the `@md/schedhdr:contents` behavior collapsing Row 2 into Row 1's grid. Need to read the file to confirm whether Row 1 and Row 2 share a parent grid at `@md` width.

If they do share a parent grid via `contents`, then putting the date in a `grid-cols-3` Row 1 will fight that layout. In that case, the right answer is to give the **parent** grid a 3-column structure where date is the center column.

Will inspect file before locking the structural choice. Either way, the visual goal — date at true row midpoint — is achieved with one grid layout fix, no logic changes.

## Acceptance checks

1. Date pill renders at horizontal center of the dark header row at 1415px viewport.
2. Day/Week toggle stays left-anchored.
3. Shifts + Location/Staff selectors stay right-anchored.
4. Date stays centered when right cluster width changes (e.g., longer location name).
5. At narrow widths (<@md), Row 1 and Row 2 stack vertically — date can re-anchor naturally; no requirement to center across stacked rows.

## Out of scope

- Day/Week toggle styling
- Shifts pill (just settled)
- Selectors
- Bottom action bar

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — restructure Row 1 (or parent grid at `@md`) into a 3-column layout placing the Date pill in the center cell.
