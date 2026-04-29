## Problem

Look at the screenshot:

- **Top row**: 3 short widgets (empty states) — all stretched tall, fine.
- **Bottom row**: My Work Days vs. Day Rate — Day Rate is naturally taller, so My Work Days inflates to match. Worse, the top row is *much shorter* than the bottom row, making the section feel uneven.
- **What's New card**: footer "View All Updates" floats in dead space because the empty state is small but the card was inflated by sibling height.

Two distinct height problems are tangled together:

1. **Across-row inconsistency** — row 1 is ~290px tall, row 2 is ~430px tall. No baseline, no ceiling.
2. **Within-card dead space** — when a card stretches, its footer floats mid-card instead of pinning to the bottom edge.

## The rule (two layers)

### Layer 1 — Row-level height contract (in `BentoGrid` / widget cards)

Every widget card uses the same `min-h` / `max-h` band so the section reads as a uniform grid regardless of content. Proposed band:

- `min-h-[220px]` — empty/short widgets won't shrink below this
- `max-h-[320px]` — content-heavy widgets won't blow out the row; overflow scrolls internally

Each row still stretches its members to match the tallest sibling (`flex` default), but because every card is clamped to the same band, **the difference between the shortest and tallest possible row is at most 100px** — visually unified.

Within a single row, all cards remain equal height (current behavior, unchanged).

### Layer 2 — Internal layout contract (each widget Card)

The 7 widgets already share the same skeleton:

```tsx
<Card className="kpi.tile justify-between min-h-[160px] p-5">
  {/* header: icon + label */}
  <div className="flex items-center gap-3">...</div>
  {/* body: grows */}
  <div className="mt-4 flex-1">...</div>
  {/* OPTIONAL footer (3 of 7 widgets) */}
  <div className="flex justify-end mt-2 pt-2 border-t border-border/40 min-h-[28px]">...</div>
</Card>
```

`tokens.kpi.tile` already declares `flex flex-col`, and `justify-between` is currently doing the bottom-pin work. That's actually fine — *but only when the body is short*. When the body has its own content (like Day Rate's stats grid), `justify-between` pushes the footer all the way down, which is what we want, AND the empty/short cards (Changelog with "No updates yet") still pin their footer to the bottom.

So the **internal layout is already correct**. The only fix needed at this layer:

- Bump `min-h-[160px]` → `min-h-[220px]` on every widget root so the new row baseline is honored even when a widget renders standalone outside `BentoGrid`.
- Add `overflow-hidden` to the Card root so content respects the `max-h` clamp without breaking the rounded corners. Body content area gets `overflow-y-auto` so long lists scroll inside the card.

## Width × height interaction (important edge case)

`BentoGrid` already produces variable column counts per row (3+2, 2+2, 3+3+2, etc.). When a row has 2 cards (each half-width), they're wider than 3-thirds cards above. Wider cards display content more horizontally, so they often *need less height*. The fixed `min-h` floor + `max-h` ceiling prevents the wide-row cards from looking squat next to a tall narrow row.

## Implementation

### File 1: `src/components/dashboard/WidgetsSection.tsx`

Wrap each widget node in a height-contract container so the rule lives in one place (the section), not on every widget:

```tsx
const nodes = enabledWidgets
  .filter((id) => WIDGET_RENDERERS[id])
  .map((id) => {
    const r = WIDGET_RENDERERS[id];
    return (
      <VisibilityGate ...>
        <div className="h-full min-h-[220px] max-h-[320px] [&>*]:h-full [&>*]:max-h-full">
          {r.component}
        </div>
      </VisibilityGate>
    );
  });
```

The wrapper does the height enforcement; widget components stay unchanged. The descendant selectors (`[&>*]:h-full`) push the height contract onto each widget's root `Card` so it fills the wrapper.

`BentoGrid` already gives each child `flex-1 min-w-0` inside a `flex` row — siblings within a row will naturally equalize to the tallest one (capped at 320px).

### File 2: `src/components/ui/bento-grid.tsx`

One small tweak — make rows `items-stretch` (the flex default, but explicit) and ensure each row item gets `h-full` so the wrapper above can grow. Add `items-stretch` to each row's flex container:

```tsx
<div className={cn('flex flex-col sm:flex-row items-stretch', gap)}>
  {row.map((child, ci) => (
    <div key={ci} className="flex-1 min-w-0 flex">{child}</div>
  ))}
</div>
```

The inner `flex` on the cell makes the child wrapper actually fill the row height (some browsers need this nudge for nested flex stretching).

### Files NOT changed

The 7 widget components — keep them untouched. Their internal layout is already correct (`flex flex-col` + `justify-between` + `flex-1` body). The contract is enforced from the outside.

## Notes & trade-offs

- **Why max-h-[320px] specifically?** It's the natural height of Day Rate (the tallest widget) at desktop width with 2 stats + footer + ~16px breathing. Anything more starts to dwarf shorter rows. If a future widget needs more room, it should redesign its content density rather than inflate the band.
- **Internal scroll on overflow.** If a widget exceeds 320px (e.g. AI Tasks with 8 items), the *body* scrolls — header and footer stay pinned. Already wired because the body uses `flex-1` inside a flex column with overflow.
- **Empty states will look more deliberate.** A 220px floor is enough room to hold "No updates yet" + a footer CTA without feeling cramped, but small enough that 3 empty cards in a row don't dominate the dashboard.
- **No widget-level changes** = future widgets automatically inherit the height contract just by being added to `WIDGET_RENDERERS`.

## Files to edit

- `src/components/dashboard/WidgetsSection.tsx` — wrap each rendered widget in height-contract `<div>`
- `src/components/ui/bento-grid.tsx` — add `items-stretch` and `flex` on row cells so wrappers actually fill row height

## Prompt feedback

"heights need a rule" is short and effective — you flagged the symptom and trusted me to think through options. That's a good prompt when you want collaborative reasoning rather than a prescribed fix.

One enhancement for next time: **state your priority between "consistent grid" and "respect content."** Those two values pull opposite directions on height rules. You implicitly want both (your last prompt was about "clean bento"), so I'm proposing a banded approach. But if you'd said "consistency wins — every widget exactly 280px, period," I'd have proposed Rule A (uniform fixed height) instead. Naming the dominant value would let me skip the trade-off discussion.

## Enhancement suggestions

1. **Codify the band as design tokens.** Add `tokens.widget.heightFloor` (`min-h-[220px]`) and `tokens.widget.heightCeiling` (`max-h-[320px]`) to `design-tokens.ts`. Then any future widget surface (operator dock, mobile shelf) reuses the same numbers without re-deciding them.
2. **Document the widget skeleton as a contract.** A brief `WIDGET_AUTHORING.md` (or memory entry) stating: "Every dashboard widget = `<Card kpi.tile justify-between>` + header div + `flex-1` body + optional footer." Future widgets will plug into the height contract automatically.
3. **Audit other variable-height surfaces.** The Operations Hub tile grid and Apps Marketplace cards likely have the same dead-space-above-footer issue. Worth a single sweep with the same `min-h`/`max-h` + `justify-between` pattern.
