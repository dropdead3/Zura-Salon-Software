
## Prompt review

Concise and observation-driven — you correctly identified the styling gap by inspecting the live UI, then named the target aesthetic ("luxury glass morphism") which maps cleanly to the platform's documented glass standard (`bg-card/80` + `backdrop-blur-xl`). Teaching note: referencing an existing pattern by name (e.g., "match `PremiumFloatingPanel`" or "match the bento card glass") would let me skip the diagnosis step entirely. Micro-improvement: when asking for visual parity, naming the reference component is the fastest path to a deterministic result.

## Diagnosis

The Schedule Type Selector dialog (`src/pages/dashboard/Schedule.tsx` line 1252) uses the default `DialogContent`, which renders **solid** `bg-background` with a plain `border` and `shadow-lg`. No backdrop blur, no translucency. The three option tiles inside `ScheduleTypeSelector.tsx` are also solid (`border-border` + `hover:bg-muted/50`).

This contradicts the platform's glass canon used by `PremiumFloatingPanel`, bento cards, and other premium surfaces: `bg-card/80` + `backdrop-blur-xl` + softened border.

## Fix

Two targeted changes, both confined to the Schedule Type Selector surface (no touching shared `dialog.tsx` — that would leak globally).

### 1. `src/pages/dashboard/Schedule.tsx` (line 1252)

Upgrade the `DialogContent` className to layer the glass aesthetic on top of the default styles:

```tsx
<DialogContent className="sm:max-w-sm p-6 bg-card/80 backdrop-blur-xl border-border/60 shadow-2xl">
```

- `bg-card/80` — translucent card surface (overrides `bg-background`)
- `backdrop-blur-xl` — signature glass wash
- `border-border/60` — softened edge to match bento standard
- `shadow-2xl` — deepened depth for the floating feel

### 2. `src/components/dashboard/schedule/meetings/ScheduleTypeSelector.tsx` (the three `<button>` tiles)

Upgrade each tile to a nested glass card, one tier inside the parent:

- Replace `border-border` → `border-border/60`
- Replace `hover:bg-muted/50` → `bg-card/40 backdrop-blur-md hover:bg-card/60`
- Tighten transition to `transition-all duration-150 ease-out` (matches platform `bento.hover.transition`)

Icon containers (`bg-muted`) stay as-is — they read correctly against the translucent tile.

## Acceptance checks

1. Dialog renders with visible blur of underlying schedule grid (the stylist row, agenda cards behind become softly diffused).
2. Tiles read as nested glass cards, not solid buttons.
3. Hover state on each tile lifts the translucency without flashing solid.
4. No regression on other dialogs — change is scoped via inline className, not in `dialog.tsx`.
5. Dark-mode contrast remains legible (border `/60` keeps edge visible on dark backdrop).

## Out of scope

- Modifying shared `dialog.tsx` (would impact every dialog platform-wide).
- Migrating the selector to `PremiumFloatingPanel` (heavier refactor; the dialog pattern works fine here).
- Restyling the X close button or the heading typography.

## Files touched

- `src/pages/dashboard/Schedule.tsx` — add glass classes to the type-selector `DialogContent`.
- `src/components/dashboard/schedule/meetings/ScheduleTypeSelector.tsx` — upgrade the three option tiles to nested glass surfaces.
