

## Prompt feedback
Strong: "visually enhance" plus a screenshot is concise and gives a clear visual baseline. Even better next time: name the dimensions you care about — e.g. *"add depth, soften strokes, refine the status pills, but keep the category color coding"*. That tells me which knobs to turn vs leave alone, and prevents me from over-touching things you actually like.

## Goal
Make appointment cards feel more premium and dimensional — subtle depth, refined edges, better-balanced status pills, and quieter chrome — without changing the layout, color logic, or the 1px gap between overlap columns.

## What changes (visual only)

### 1. Card surface — depth + softness
File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`
- Replace the flat fill with a very subtle top-down sheen: a tiny linear-gradient overlay (transparent → ~6% white at top) on top of the existing color fill. Adds dimension without shifting the category color.
- Soften the border: drop from solid 1px hard color to 1px at ~55% of the current border color, plus a 1px inner highlight ring (`inset 0 1px 0 rgba(255,255,255,0.18)`) for a "lit edge" effect.
- Add a refined resting shadow: `shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_-6px_rgba(15,23,42,0.12)]`. Hover bumps to a slightly lifted shadow — cleaner than the current `hover:shadow-md`.
- Hover loses `brightness-[1.08]` (which can look washy on pastel cards) and instead applies a `hover:-translate-y-[0.5px]` plus the upgraded shadow.

### 2. Rounded corners — slightly more generous
- Move from `rounded-lg` (8px) → `rounded-[10px]` for grid cards. Reads as more refined at the small sizes the schedule uses, while still matching the existing 1px overlap-gap math.
- Multi-service inner band wrapper uses the same radius so it clips cleanly.

### 3. Left accent bar — restored as a polish element
- Already present on status-colored cards (`border-l-4`). Refine it: when category color is in use, add a slimmer 3px inset accent strip (absolute, `left-0 top-1 bottom-1 w-[3px] rounded-r-sm`) using the category's text color at ~70% opacity. Gives every card a consistent "spine" without re-introducing layout gaps.

### 4. Status pill — more refined
- Current pill: solid bg + border + label. Refine to a "chip":
  - Reduce border opacity to ~40% of current
  - Add `backdrop-blur-[2px]` and `bg-white/55 dark:bg-black/25` over the existing colored bg (creates a frosted, premium chip)
  - Tighten padding to `px-1.5 py-[1px]`
  - Add a 3px colored dot before the label for "Conf / Unconf / etc." — small visual cue that scales when the pill is short-labeled
- Applies in both the day-view and week-view branches in `GridContent`.

### 5. NC / RC and stylist avatar badges
- Wrap NC/RC chip in a 1px white ring (`ring-1 ring-white/70 dark:ring-black/40`) so it lifts cleanly off the colored card body instead of sitting flush.
- Same treatment on the `StylistBadge` photo — already has chrome but currently can blend on pastel cards.

### 6. Cancelled / no-show treatment
- Cancelled: keep `opacity-60` but add a subtle diagonal hatch via a CSS background pattern at ~6% opacity. Reads as "cancelled" much faster than just dimmed.
- No-show: replace the inset destructive ring with a thinner 1.5px destructive ring + a small destructive dot in the top-left corner, so the entire card chrome doesn't go red.

### 7. Selected state
- Replace `ring-2 ring-primary/60 ring-inset` with `ring-[1.5px] ring-primary ring-inset` plus a soft outer glow (`shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]`). Sharper, more "selected", less chunky.

## Files to update
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — all of the above are class/style changes inside the existing `gridContent` JSX, `cardStyle` memo, `CardOverlays`, `GridContent` (status pill + NC/RC), and the multi-service band wrapper.

## What stays exactly the same
- Overlap layout math in `schedule-utils.ts` (1px gap between cards).
- Category color resolution and dark-mode handling.
- Card sizing thresholds (`getCardSize`, pixelHeight branches).
- Day vs Week vs Agenda variant structure.
- All indicator clusters, Connect pills, rebook dots.

## QA checklist
- Light mode: pastel category cards keep their identity but show sheen + lit edge.
- Dark mode: cards retain dark-style fills; sheen is softened so it doesn't wash out.
- Overlap pairs: 1px gap is preserved, refined shadow doesn't bleed into the gap.
- Status pills are readable at compact and full sizes.
- Selected, no-show, and cancelled states are clearly distinguishable at a glance.
- Single non-overlap cards still hover-lift cleanly and the right-grip behavior is unaffected.

## Enhancement suggestion
After this lands, the next high-leverage move is a **density mode toggle** on the schedule (Comfortable / Compact / Studio). Same card chrome, three opinionated padding/font/pill presets — lets owners running busy 8-stylist days choose density without losing the polish.

