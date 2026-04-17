

## Prompt review

Sharp visual catch — you spotted that the Level 2 badge's stone/slate tones don't belong to the Zura violet palette. Sharper next time: tell me whether you want the badge to (a) inherit the active color theme so it shifts per Zura/Cream/Rose/etc, or (b) always use semantic neutral tokens (`muted`, `secondary`) that auto-adapt. I'll plan for (b) since it's the platform-correct answer, but flag (a) as an alternative.

## Diagnosis

In Wave 22.15 I replaced the muted opacity-based color stops with hardcoded Tailwind palette colors (`bg-slate-200 dark:bg-slate-800`, `bg-stone-200 dark:bg-stone-800`). Those slate/stone hues are **palette-fixed** — they don't read from CSS variables, so they ignore the active theme. Against the Zura theme (violet-tinted dark surfaces), the cool slate badge reads like it was lifted from the Cream theme's neutral palette. Visual mismatch confirmed.

The fix: low tiers (Level 1, 2) should use **semantic theme tokens** (`bg-muted`, `bg-secondary`) that resolve through the active theme's CSS variables. Mid/high tiers (Levels 3–6+) keep the warm amber/gold treatment because gold IS the universal "tier elevation" signal across all themes — that's intentional cross-theme consistency, not a bug.

## Plan — Wave 22.16: Theme-aware low-tier level badges

### Fix: Replace hardcoded slate/stone with semantic tokens

`src/lib/level-colors.ts` — update the first two COLOR_STOPS:

```ts
const COLOR_STOPS = [
  { bg: 'bg-muted',      text: 'text-muted-foreground' },        // Level 1 — softest neutral
  { bg: 'bg-secondary',  text: 'text-secondary-foreground' },    // Level 2 — slightly more present
  { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },  // Level 3
  { bg: 'bg-amber-200 dark:bg-amber-900/60', text: 'text-amber-900 dark:text-amber-200' },  // Level 4
  { bg: 'bg-amber-300 dark:bg-amber-800/70', text: 'text-amber-900 dark:text-amber-100' },  // Level 5
  { bg: 'bg-amber-500 dark:bg-amber-600',    text: 'text-white dark:text-amber-50' },       // Level 6+
] as const;
```

Why `bg-muted` and `bg-secondary`:
- Both are theme-bound CSS variables defined per theme in `index.css`
- In Zura dark mode, `--muted` resolves to violet-tinted dark gray → badge tints violet, matching the card surface
- In Cream theme, they'll resolve to warm neutrals — same legibility, different hue
- Both have paired `-foreground` tokens, so contrast is guaranteed by the design system
- `bg-secondary` for Level 2 sits one step above `bg-muted` (Level 1) — preserves the subtle progression

### Acceptance checks

1. On Zura dark theme: Level 2 badge reads as a violet-tinted neutral that visually belongs with the card surface
2. Switch to Cream theme: same badge re-tints to a warm neutral, still legible
3. Switch to Rose / Sage / Ocean / Ember / Noir: badge always inherits the theme's neutral palette — never looks foreign
4. Level 1 (softest) and Level 2 (slightly more present) remain visually distinguishable
5. Levels 3–6+ unchanged — warm amber/gold progression preserved as the universal "tier elevation" signal
6. Selected stylist card in booking wizard renders correctly across all themes
7. Stylist Directory and Team Hub also benefit (positive global side effect)

### Files

- `src/lib/level-colors.ts` — swap Level 1 + Level 2 stops to semantic tokens

### Open question

None — semantic tokens are the doctrinally correct answer per the design token system.

### Deferred

- **P3** Eventually move ALL level color stops to theme tokens (define `--level-1`...`--level-6` per theme) so even the gold tiers can re-tint per palette if a future theme wants it. Trigger: when a theme launches that needs to override the gold treatment (e.g., Noir wanting silver-toned high tiers).

