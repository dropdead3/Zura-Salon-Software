

## Prompt review

Clean and decisive — you're continuing the same rebalancing strategy: workflow controls cluster with workflow controls. Tighter version: "Move the Shifts pill out of the left date cluster and dock it above the Location/Stylist selectors on the right."

Teaching note: you're now treating the right column as the **"what am I looking at"** zone (location → staff → shifts/appointments mode). That's a coherent mental model — selectors define scope, Shifts toggles what *type* of scope. Naming this grouping ("scope controls") will sharpen future moves.

## Diagnosis

In `ScheduleHeader.tsx`:
- **Shifts pill** (lines 194–223): currently in the left cluster, inside the "Shifts + Date group" wrapper (line 192), gated by `hidden @[1320px]/schedhdr:flex`.
- **Right cluster** (lines 334–371+): vertically stacked Location and Staff selectors, each `h-7 w-[180px] @lg/schedhdr:w-[220px]`.

The Shifts pill belongs as a third element in the right column, rendered above Location.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`.

### 1. Remove Shifts pill from left cluster
Delete the Shifts `<Tooltip>` block at lines 194–223. The "Shifts + Date group" wrapper at line 192 stays (still wraps the Date pill).

### 2. Add Shifts pill above selectors
Inside the selector stack (line 335, the `flex flex-col gap-2 items-stretch` div), insert the Shifts toggle as the first child — above the Location Select.

Restyle to match selector visual weight:
- Match selector width: `w-[180px] @lg/schedhdr:w-[220px]`
- Match selector height: `h-7`
- Match selector palette: `bg-[hsl(var(--sidebar-accent))] border border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))]` for inactive, foreground swap when active
- Use `rounded-md` (matches Select trigger), drop the pill `rounded-full`
- Drop the `@[1320px]` visibility gate — now always visible alongside selectors at all widths ≥ @md
- Keep tooltip wrapper

### 3. Restyle Shifts button content
- Icon left, label right (full label visible, no breakpoint hiding since width matches selectors)
- Center-aligned content with `justify-center`
- Active state: foreground bg + sidebar-bg text (same as before)
- Inactive state: muted foreground text on accent bg

## Result

| Surface | Before | After |
|---|---|---|
| Left cluster | Day/Week toggle, **Shifts pill**, Date pill, center date | Day/Week toggle, Date pill, center date |
| Right cluster (top→bottom) | Location, Staff | **Shifts**, Location, Staff |

Shifts becomes a peer of the scope selectors — visually grouped, always visible, no breakpoint gating.

## Acceptance checks

1. At 1415px viewport (current): Shifts toggle appears above Location selector, same width (220px), same dark palette.
2. At 1130px viewport (sidebar expanded): Shifts toggle still visible above Location (180px width).
3. Clicking Shifts toggles `showShiftsView` (existing handler, unchanged).
4. Active state shows light bg / dark text; inactive shows muted text on accent bg.
5. Tooltip on hover still reads "View support staff shifts" / "Hide shift schedule".
6. Date pill (left cluster) still works at ≥ 1320px container.
7. Left cluster no longer renders Shifts at any width.

## Out of scope

- Date pill — stays in left cluster.
- Day/Week toggle — unchanged.
- Filter popover, Today's Prep — unchanged.
- Selector widths or palette — unchanged.
- Bottom action bar — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — remove Shifts from left cluster (lines 194–223), insert restyled Shifts toggle as first child of selector stack (line 335).

