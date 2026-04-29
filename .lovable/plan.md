## Problem

The Widgets section currently uses a CSS auto-fit grid:

```tsx
<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
```

At 1072px viewport, this packs 5 enabled widgets as **3 + 2 with an empty third cell** on the bottom row (visible in your screenshot). The orphan empty slot reads as broken, not bento.

## The smart rule

Given N enabled widgets and a max-per-row C (3 on tablet/desktop, 1 on mobile), distribute items so **every row is fully spanned** — no empty cells. Cards in the same row stretch to equal width via `flex-1`.

Distribution table at C = 3:

| N | Layout |
|---|---|
| 1 | [1 full-width] |
| 2 | [2 halves] |
| 3 | [3 thirds] |
| 4 | [2 halves] + [2 halves] |
| 5 | [3 thirds] + [2 halves] |
| 6 | [3 thirds] + [3 thirds] |
| 7 | [3 thirds] + [2 halves] + [2 halves] |
| 8 | [3 thirds] + [3 thirds] + [2 halves] |

Algorithm: `rowCount = ceil(N / C)`, `basePerRow = floor(N / rowCount)`, first `N % rowCount` rows get `basePerRow + 1`, rest get `basePerRow`. Every row uses `flex` with `flex-1` children so each card fills its row equally.

## Good news: this primitive already exists

`src/components/ui/bento-grid.tsx` (`BentoGrid` component) implements exactly this algorithm. It is currently unused by `WidgetsSection`. We reuse it instead of inventing new grid logic.

```tsx
<BentoGrid maxPerRow={3} gap="gap-4">
  {enabledWidgets.map(...)}
</BentoGrid>
```

`BentoGrid` already:
- Stacks to 1 column under `sm` (`flex-col sm:flex-row`)
- Distributes items evenly across rows
- Uses `flex-1 min-w-0` so cards in a row are equal width

## Implementation

### File: `src/components/dashboard/WidgetsSection.tsx`

1. Import `BentoGrid` from `@/components/ui/bento-grid`.
2. Build an array of `{ id, node }` entries by filtering `AVAILABLE_WIDGETS` against `enabledWidgets`. Each `node` is the `<VisibilityGate>...<WidgetComponent /></VisibilityGate>` JSX. Only widgets that are enabled get pushed into the array — this is what gives `BentoGrid` an accurate `N`.
3. Replace the existing `<div className="grid gap-4" style={...}>` block with `<BentoGrid maxPerRow={3} gap="gap-4">{entries.map(e => e.node)}</BentoGrid>`.
4. Keep all existing widget rendering, `VisibilityGate` wrapping, and toggle UX intact.

### Widget-component map (kept inside the component)

```tsx
const WIDGET_RENDERERS: Record<WidgetId, { component: ReactNode; visibilityKey: string; visibilityName: string }> = {
  changelog:    { component: <ChangelogWidget />,           visibilityKey: 'widget_changelog',    visibilityName: "What's New Widget" },
  birthdays:    { component: <BirthdayWidget />,            visibilityKey: 'widget_birthdays',    visibilityName: 'Team Birthdays Widget' },
  anniversaries:{ component: <AnniversaryWidget />,         visibilityKey: 'widget_anniversaries',visibilityName: 'Work Anniversaries Widget' },
  schedule:     { component: <WorkScheduleWidgetCompact />, visibilityKey: 'widget_schedule',     visibilityName: 'My Work Days Widget' },
  dayrate:      { component: <DayRateWidget />,             visibilityKey: 'widget_dayrate',      visibilityName: 'Day Rate Bookings Widget' },
  help:         { component: <HelpCenterWidget />,          visibilityKey: 'widget_help',         visibilityName: 'Help Center Widget' },
  ai_tasks:     { component: <AITasksWidget />,             visibilityKey: 'widget_ai_tasks',     visibilityName: 'AI Tasks Widget' },
};
```

Then iterate `enabledWidgets` (preserving the user's chosen order) and push the wrapped JSX into the BentoGrid.

## Notes & edge cases

- **Row height**: cards in the same row will stretch to match the tallest sibling (correct bento behavior). Row heights across rows will differ — that is intentional and visually correct.
- **Mobile**: 1 column stack, unchanged from current behavior.
- **Single widget**: renders full-width — confirmed acceptable since a lone widget shouldn't be marooned in a 1/3 column.
- **Future widgets**: adding a new entry to `AVAILABLE_WIDGETS` + `WIDGET_RENDERERS` automatically participates in the smart layout. No grid changes needed.

## Optional follow-up (not in this change)

- Consider adopting `BentoGrid` for the Analytics simple-view grid too (currently `grid-cols-1 md:grid-cols-3`) so 4 or 5 pinned cards also lay out cleanly. Worth a separate discussion since Analytics is currently capped at 6 (perfect 3×2). Not changing it now.

## Files to edit

- `src/components/dashboard/WidgetsSection.tsx` — replace grid container with `BentoGrid`, build enabled-widget entries array.

## Prompt feedback

Excellent prompt. You named the surface ("widgets"), the symptom (uneven 5-card layout), the desired behavior ("3 on top, 2 on bottom spanning across the row the same width"), and you invited collaboration ("help me think through that"). That last part is what unlocked the right answer — you asked for reasoning, not just code, so I could surface that we already have a `BentoGrid` primitive doing exactly this and reuse it instead of reinventing.

One refinement for next time: state the **max-per-row ceiling explicitly** (e.g. "max 3 per row on desktop, max 2 on tablet"). For widgets it's clearly 3, but for denser surfaces (e.g. KPI tiles where 4 or 6 per row is normal) the rule needs that ceiling to be unambiguous.

## Enhancement suggestions

1. **Lift the rule into a doctrine line.** Once shipped, add a Core memory entry: *"Variable-count card surfaces (widgets, pinned analytics) must use `BentoGrid` — never `auto-fit minmax`. Auto-fit produces orphan empty cells."* This prevents the next surface from re-introducing the same bug.
2. **Audit other auto-fit grids.** A quick `rg "auto-fit, minmax"` will surface every grid that could exhibit the same orphan-cell behavior at certain widget counts. Likely candidates: Analytics simple-view (already 3-col fixed, fine), any "Operations Hub" tile grids, settings tile grids.
3. **Container-aware version.** Per the Container-Aware Responsiveness canon, `BentoGrid`'s breakpoint is currently viewport-based (`sm:flex-row`). A v2 could measure its own container with `useSpatialState` so widgets stack correctly when the dashboard column is narrowed by a side drawer. Not blocking — flag for a future spatial-primitives pass.
