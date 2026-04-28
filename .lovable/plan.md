## Change

Visually mark which pinned cards land in **Simple view** (the first 6) inside the Customize drawer's pinned-cards list, so operators can see at a glance — without reading the tip — which cards are visible in Simple and which only appear in Detailed.

## Visual treatment

For each row in the pinned-cards list, use its 1-indexed position:

- **Positions 1–6 (in Simple view):**
  - Small ordinal pill before the label: `1`, `2`, … `6` — `font-display`, uppercase, `bg-primary/15 text-primary` in a `w-5 h-5 rounded-full` chip
  - Subtle left accent: `border-l-2 border-primary/50` on the row container
- **Positions 7+ (Detailed only):**
  - Ordinal chip uses muted tone: `bg-muted text-muted-foreground/70`
  - No left accent
  - Slightly reduced label opacity (`text-foreground/70`) to signal "not in the at-a-glance view"
- A tiny legend appears just above the list (only when `cardCount > 6`):
  > `1`–`6` show in Simple view · `7+` Detailed only

The cap threshold lives in a single named constant `SIMPLE_VIEW_CARD_LIMIT = 6` shared with `DashboardHome.tsx` (export from a small util or duplicate the constant in the menu — duplication acceptable; both files cite the same number).

All colors via semantic tokens (`primary`, `muted`, `foreground`) — no raw hex. All typography respects the ban on `font-bold/font-semibold` (max `font-medium`).

## Files & edits

**1. `src/components/dashboard/SortablePinnedCardItem.tsx`**
- Add optional prop `simpleViewIndex?: number` (1-indexed position in visible list).
- Thread it through `PinnedCardItemRow`.
- Render the ordinal chip immediately to the left of the icon (or replacing the icon's wrapper spacing).
- Conditionally apply the `border-l-2 border-primary/50` and label-opacity classes based on whether `simpleViewIndex <= 6`.
- When `simpleViewIndex` is undefined (e.g., legacy callers, the "Available" list), render exactly as before — no chip, no accent. Backward-compatible.

**2. `src/components/dashboard/DashboardCustomizeMenu.tsx`**
- In the pinned-cards `.map(...)` (line ~755), pass `simpleViewIndex={index + 1}` (use the second arg of map).
- Right above the SortableContext (or inside it, just before the rows), when `cardCount > 6`, render the legend chip line:
  ```tsx
  <div className="flex items-center gap-2 px-1 pb-1.5 text-[10px] font-display tracking-wider uppercase text-muted-foreground/70">
    <span className="inline-flex items-center gap-1">
      <span className="w-3.5 h-3.5 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center text-[9px]">1</span>
      –6 Simple
    </span>
    <span className="opacity-50">·</span>
    <span className="inline-flex items-center gap-1">
      <span className="w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground/80 inline-flex items-center justify-center text-[9px]">7</span>
      + Detailed only
    </span>
  </div>
  ```

## Why this shape

- **Pre-attentive cue:** the ordinal chip + left accent is readable in <100ms without reading the tip.
- **Reinforces the lever:** drag-to-reorder already controls which cards become 1–6; numbering makes the cause/effect obvious during the drag.
- **Reversible & non-destructive:** purely cosmetic — no storage, no layout changes.
- **Backward-compatible:** the prop is optional, so the "Available analytics" toggle list and any non-analytics consumers of `SortablePinnedCardItem` are untouched.
- **Doctrine-aligned:** semantic tokens only, font-display for the chip ordinals (uppercase-friendly), no banned weights, container-aware (no fixed widths beyond the chip itself).

## Out of scope

- No change to the cap behavior on the dashboard itself.
- No animation on drag for the chip number — it will simply re-render with the new index. (Acceptable; matches the existing dnd-kit pattern.)
- No persona/role-specific variation.
