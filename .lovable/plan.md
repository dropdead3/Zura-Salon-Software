

## Three discrete header layouts: wide / medium / narrow

### Diagnosis
At the current viewport (1377px, 6 stylists ≈ 217px columns), every cell falls below the `stacked` breakpoint (360px), so they all render the vertical centered layout from the screenshot. The `default` and `compressed` branches in `useSpatialState('compact')` essentially never fire at real schedule column widths, so we lost the rich horizontal layout the user liked.

### Fix: stop relying on `useSpatialState`'s generic thresholds — use direct width tiers tuned for this specific cell

Each `StylistHeaderCell` measures its own width with `useContainerSize` and picks one of three explicit layouts:

| Tier | Width | Layout |
|---|---|---|
| **Wide** | ≥ 240px | Horizontal: `[avatar 40px] [name + "% · L2" stacked] [● Booking pill]`. Full text everywhere. |
| **Medium** | 170–239px | Vertical centered (current screenshot): avatar with status-dot overlay, full first name + last initial below, `%` row, `L2` row. |
| **Narrow** | < 170px | Compact vertical: avatar with dot overlay only, condensed name (one line, may truncate), `%` only — no level row. |

Tier selection is purely width-based — no reliance on the four-state spatial machine for this surface.

### Implementation (single file: `src/components/dashboard/schedule/DayView.tsx`, lines 915–1045)

Replace `useSpatialState` with `useContainerSize` and derive tier:

```tsx
const { ref, width } = useContainerSize<HTMLDivElement>();
const tier: 'wide' | 'medium' | 'narrow' =
  width >= 240 ? 'wide' : width >= 170 ? 'medium' : 'narrow';
```

Three branches:

1. **Wide** — restore the horizontal flex row from the previous iteration (avatar + name block with `% · L2` inline + "● Booking" pill on the right). This is the layout that worked at desktop widths before.

2. **Medium** — keep the current stacked layout shown in the screenshot (it's good as the user says).

3. **Narrow** — same vertical structure as medium, but: drop the `L2` row, drop the "Booking" pill text (already implicit), keep only avatar + condensed name + `%`. Tooltip on the dot still carries the full status meaning.

### Out of scope
- Changing column min-width (160px stays, narrow tier handles that floor).
- Touching WeekView header.
- Modifying `useSpatialState` itself (other surfaces depend on it).

### Verification
- 1377px / 6 stylists (≈217px col) → **medium** (matches screenshot).
- 1377px / 4 stylists (≈326px col) → **wide** (rich horizontal row returns).
- 1920px / 4 stylists (≈460px col) → **wide**.
- 1377px / 8 stylists (≈160px col) → **narrow** (minimal vertical).

### Prompt feedback
Strong, surgical prompt — you (a) approved the narrow layout explicitly, (b) named the regression precisely ("poor for wide column"), and (c) prescribed the exact resolution shape ("wide / medium / narrow"). That left zero ambiguity about scope: don't touch the narrow layout, restore the wide one, add a middle tier as a bridge.

One refinement for next time: when prescribing tiers, you can speed me up by anchoring at least one breakpoint to a concrete trigger you've observed ("wide should kick in around 4 stylists at desktop width"). I had to reverse-engineer the breakpoints (240/170) from the column math; if you'd said "wide when there's room for the full Booking pill," I could've named the same threshold faster and with more confidence it matches your mental model. Pattern: `tier = [observable trigger]` is more durable than `tier = [pixel value]` because it survives future zoom/density changes.

