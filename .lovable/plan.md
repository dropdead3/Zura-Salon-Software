

## Prompt review

Sharp and visually grounded — two distinct issues, both pinpointed with screenshots: (1) avatar isn't optically centered in the card, (2) Level 2 badge fails dark-mode contrast and uses the wrong typeface for this context. Sharper next time: when reporting a contrast issue, mention which level you're testing — Level 2 is in the *neutral* end of the stone→gold gradient so it's the worst-case for muted backgrounds. Knowing that lets me redesign the low-tier color stops specifically rather than the whole scale.

## Diagnosis

### Issue 1: Avatar optical centering

`QuickBookingPopover.tsx` L1462: card uses `p-2` (8px padding) with a 40px avatar (`h-10 w-10`). The flex row is `items-center` so it IS mathematically centered — but the level pill (`h-6` = 24px) and X button (`h-6`) make the row's content height ~40px (driven by avatar), so total card height = 40 + 16 = 56px. The avatar reaches edge-to-edge vertically with only 8px breathing room top/bottom — that's the optical "stuck to top" feeling, especially because the pill+X on the right are small (24px) and visually float in extra space, making the avatar's tight vertical fit feel asymmetric by comparison.

Fix: bump card padding to `p-3` (12px) so the avatar has equal 12px breathing room on all four sides — matches the standard Bento card padding rhythm.

### Issue 2: Level 2 badge contrast + typography

`getLevelColor(1, 7)` returns `bg-muted/80 dark:bg-muted/60` + `text-muted-foreground` — both the badge surface AND the text resolve to muted-tone HSL values in dark mode, killing contrast. The pill literally blends into the card surface.

Two fixes needed:
1. **Contrast**: Low tiers need a tinted-but-distinct background. Replace the early COLOR_STOPS with subtle neutrals that still separate from `bg-accent/50` card surface. Use `bg-slate-200 dark:bg-slate-800` + `text-slate-700 dark:text-slate-200` for the bottom of the scale — neutral but legible.
2. **Typography**: Per the doctrine and the user's explicit ask — the Level badge here should use **Aeonik Pro (`font-sans`), normal case (no `uppercase`), no `tracking-wider`**. This card is a "selected stylist" affordance, not a stat label, so Termina's stat-style treatment is wrong. Aeonik Pro normal case gives the calm, executive UI this card deserves.

Note: this changes `getLevelColor` globally, so the same softer-but-legible tones will appear wherever the utility is used (Stylist Directory, Team Hub). That's a feature, not a bug — Level 2 should be readable everywhere. The gold end of the scale (Level 6, 7) stays unchanged — high tiers keep their warm gold treatment.

## Plan — Wave 22.15: Polish selected-stylist card UI

### Fix 1: Optical centering of the avatar

`src/components/dashboard/schedule/QuickBookingPopover.tsx` L1462
- Change card padding from `p-2` → `p-3`
- Keep `gap-2.5` and `items-center` — the extra 4px on top/bottom is what's needed for the avatar to breathe symmetrically

### Fix 2: Badge contrast (global) + typography (local to this card)

**Global contrast fix** — `src/lib/level-colors.ts`
- Replace COLOR_STOPS with a refined scale that maintains stone→gold progression but never falls below WCAG AA contrast against typical card surfaces (`bg-accent/50`, `bg-card`, `bg-muted/30`):
  ```ts
  const COLOR_STOPS = [
    { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200' },        // Level 1
    { bg: 'bg-stone-200 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-200' },        // Level 2
    { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },     // Level 3
    { bg: 'bg-amber-200 dark:bg-amber-900/60', text: 'text-amber-900 dark:text-amber-200' },     // Level 4
    { bg: 'bg-amber-300 dark:bg-amber-800/70', text: 'text-amber-900 dark:text-amber-100' },     // Level 5
    { bg: 'bg-amber-500 dark:bg-amber-600', text: 'text-white dark:text-amber-50' },             // Level 6+
  ];
  ```
- Removes the `/80` and `/60` opacity modifiers on muted (which were the root contrast killer) — uses solid slate/stone tones for the neutral tiers

**Local typography fix** — `QuickBookingPopover.tsx` L1485 (and L1476 for Unranked fallback)
- Change `text-[10px] font-display tracking-wider uppercase` → `text-xs font-sans` (Aeonik Pro, normal case, normal tracking)
- Bumps text from 10px to 12px (`text-xs`) — Aeonik Pro reads small, this is more legible at the card's scale
- Keep border, padding (`px-2.5`), height (`h-6`), and rounded-full pill shape — only typography and color change

### Acceptance checks

1. The selected-stylist card avatar visually centers with equal breathing room on top, bottom, left, right
2. Level 2 badge shows readable stone-tone text on a stone-tone background — clearly distinct from the violet/dark card surface in dark mode
3. Badge text reads "Level 2" in Aeonik Pro, normal case (not "LEVEL 2" in Termina caps)
4. Level 6/7 badges still render with the warm gold treatment (unchanged at the high end)
5. Unranked fallback also uses Aeonik Pro normal case
6. The same legibility improvement appears in Stylist Directory and Team Hub for Level 1 and Level 2 (positive global side effect)

### Files

- `src/lib/level-colors.ts` — refine COLOR_STOPS for contrast
- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — card padding `p-2` → `p-3`; badge typography to `text-xs font-sans` (both ranked and unranked branches)

### Open question

None.

### Deferred

- **P2** Audit other surfaces using `getLevelColor` to confirm no visual regressions from the COLOR_STOPS refresh (Stylist Directory cards, Team Hub roster, level pickers). Trigger: after this ships, walk those three surfaces in dark mode.
- **P3** Extract a shared `<StylistLevelBadge variant="card" | "stat">` component so card-context badges (Aeonik, normal case) and stat-context badges (Termina, uppercase) share one source of truth. Trigger: when the same badge is duplicated in 3+ surfaces.

