

## Fix stylist header collisions — make the row container-aware

### Diagnosis (from the screenshot)
At ~217px column width (6 stylists at 1377px viewport), the header renders:
- Avatar (40px) + gap-2 (8px) + name/% block (flex-1) + `pr-5` (20px reserve) — all in normal flow
- "● Booking" label (~62px wide) absolutely positioned at `top-1.5 right-1.5`, **outside the document flow**

Because the Booking pill is absolute, the name column doesn't know it exists. `pr-5` reserves only 20px, but the pill needs ~70px. Result: "Samantha Bloo**m**", "Trinity Grave**s**", "Brooklyn Colvi**n**", "Cienna Ruthe**m**" get visually overlapped by the pill.

The breakpoints are also wrong:
- `isMedium = columnWidth < 200` — pill text shows the *moment* width hits 200px, but the name needs ~140px just for "Samantha Bloom" alongside avatar+pill = 40+8+140+8+62 = **258px minimum**. Below 258px the layout will collide.

### The fix — three coordinated changes in `src/components/dashboard/schedule/DayView.tsx`

**1. Promote the status badge into the flex layout (kill the absolute positioning collision)**

Move `statusDot` out of `absolute top-1.5 right-1.5` and into the normal flow as the third flex item: `[avatar] [name+meta block] [status pill]`. The flex row now negotiates space honestly — the name block gets `flex-1 min-w-0 truncate` and the pill gets `shrink-0`. No more invisible overlap.

**2. Raise the threshold for the text label and add a third "icon-only" tier**

Replace the binary `isMedium < 200` with a width-aware status presentation:
- **≥ 260px**: dot + "Booking" / "Not Booking" text
- **180–259px**: dot only (no text), tooltip carries the meaning
- **< 180px**: dot moves to top-right corner of avatar (overlay), no inline space cost — this is the existing condensed mode, just refined

**3. Use container-aware primitives instead of pixel breakpoints**

The codebase already has `useSpatialState` + `SpatialRow` exactly for this (per `mem://style/container-aware-responsiveness`). Wrap each stylist header cell in a measured container so each cell decides its own state independently — when one stylist column is narrower (e.g., the location-name corner makes the math uneven), it adapts on its own without affecting siblings.

Concretely: replace the current per-cell width inference (which reads from a single shared `columnWidth` state) with `useSpatialState('compact')` inside the rendered cell. The cell exposes `state` ∈ `{default, compressed, compact, stacked}` and we map:
- `default` → full layout: avatar + name + % · L2 + "● Booking" pill
- `compressed` → avatar + name (truncated) + % · L2 + dot only
- `compact` → avatar + name (initials-condensed: "Samantha B.") + % only + dot only
- `stacked` → vertical stack (existing condensed branch, refined): avatar centered, name below, % below, dot overlaid on avatar

### Implementation sketch

```tsx
// New: wrap each header cell so it measures itself
function StylistHeaderCell({ stylist, idx, ... }) {
  const { ref, state } = useSpatialState<HTMLDivElement>('compact');
  const showPillText = state === 'default';
  const showDotOnly  = state === 'compressed';
  const stack        = state === 'stacked';
  const useInitialName = state === 'compact' || state === 'compressed';
  
  if (stack) return <StackedCell ... />;
  
  return (
    <div ref={ref} className="relative flex-1 min-w-[160px] ... flex items-center gap-2 p-2">
      <Avatar className="h-10 w-10 shrink-0" ... />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium truncate">
          {useInitialName ? condensedName : fullName}
        </span>
        <div className="flex items-center gap-1 mt-0.5 min-w-0">
          <span className={cn('text-[11px] shrink-0', pctColor)}>{pct}%</span>
          {levelInfo && state === 'default' && (
            <><span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate">{levelInfo.shortLabel}</span></>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        <span className={cn('w-2 h-2 rounded-full', acceptingClients ? 'bg-emerald-500' : 'bg-destructive/70')} />
        {showPillText && (
          <span className={cn('text-[10px] whitespace-nowrap', acceptingClients ? 'text-emerald-500' : 'text-destructive/70')}>
            {acceptingClients ? 'Booking' : 'Not Booking'}
          </span>
        )}
      </div>
    </div>
  );
}
```

The Tooltip wrapping the dot is preserved in all states so the "Booking / Not Booking" meaning never disappears — just becomes hover-revealed when space is tight.

### Verification
- 6 stylists at 1377px (the screenshot scenario): column ≈ 217px → `compressed` state → name truncates cleanly, "Booking" pill collapses to dot only, no overlap.
- 4 stylists at 1377px (≈ 326px each): `default` state, full pill visible, no collisions.
- 8+ stylists (forces horizontal scroll at 160px min-width): `compact` state, initials-condensed name, dot only.
- Re-toggle locations / add stylists → each cell remeasures via ResizeObserver, no jitter.

### Out of scope
- Changing `COLUMN_MIN_WIDTH = 160` (would shift the entire grid horizontal-scroll math).
- Refactoring the `isCondensed`/`isMedium` consumers elsewhere in the file (only the header cell uses these for layout; appointment cards have their own `getCardSize`).
- WeekView header (separate component, not affected by this report).

### Files
- `src/components/dashboard/schedule/DayView.tsx` — extract a `StylistHeaderCell` sub-component, wire `useSpatialState`, restructure flex layout, drop the absolute-positioned status badge.

### Prompt feedback
Excellent diagnostic prompt — you (a) named the exact surface ("schedule stylist header bar"), (b) named the symptom in spatial terms ("crash into each other"), (c) named the desired outcome ("perfectly responsive no matter the window size"), and (d) attached a screenshot showing the exact collision. That's a complete bug report: where, what, and the success criterion. I didn't have to guess what "responsive" meant for you because the screenshot showed the failure mode (text under badge).

One refinement: when describing layout collisions, naming *which two elements* are colliding ("the Booking pill is overlapping the stylist name") would let me jump straight to the fix without inferring from the screenshot. Same outcome here because the image was crisp, but for subtler issues (e.g., 2px misalignment) the inferred element pair might be wrong. Pattern to reuse: "Element A is overlapping Element B at viewport size X — they should [stack / shrink / hide B / wrap]." That gives me both the diagnosis *and* your preferred resolution strategy in one sentence.

