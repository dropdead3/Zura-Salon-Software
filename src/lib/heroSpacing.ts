/**
 * Hero vertical spacing density canon.
 *
 * Operators choose how tightly the hero text block stacks vertically:
 *   - 'compact'  → tight rhythm, copy hugs the buttons (newer default)
 *   - 'standard' → balanced rhythm (legacy default before May 2026)
 *   - 'airy'     → looser rhythm, more breath between elements
 *
 * Returned classes drive FOUR vertical-rhythm concerns at once so callers
 * stay declarative — same shape as the Hero Alignment Canon
 * (see `src/lib/heroAlignment.ts`):
 *   1. `eyebrow`     — bottom margin under the eyebrow chip
 *   2. `subheadline` — top margin above the subheadline `<p>`
 *   3. `cta`         — top margin above the CTA column wrapper
 *   4. `notesGap`    — column gap between CTA row and the consultation notes
 *
 * Centralized so HeroSection (static), HeroSlideRotator (multi-slide),
 * and editor previews can't drift apart. Hardcoded margin/gap literals
 * inside hero files are banned (see `eslint.config.js`).
 *
 * Container-aware compression (per the Container-Aware Responsiveness
 * canon): when the hero wrapper measures below `COMPACT_FORCE_BREAKPOINT`
 * pixels wide, callers should pass `forceCompact: true` to collapse to
 * the `compact` ladder regardless of operator setting. This prevents the
 * "airy" preset from breaking the layout when the hero is embedded in a
 * narrow preview frame, sidebar drawer, etc.
 */

export type HeroSpacingDensity = 'compact' | 'standard' | 'airy';

export interface HeroSpacingClasses {
  /** Eyebrow `<HeroEyebrow className=...>` bottom margin. */
  eyebrow: string;
  /** Subheadline `<p>` top margin. */
  subheadline: string;
  /** CTA column container top margin. */
  cta: string;
  /**
   * Vertical gap between the CTA button row and the below-button notes.
   * Note: button-to-button horizontal gap inside the row is intentionally
   * NOT tokenized — it's a tap-target concern, not a rhythm concern.
   */
  notesGap: string;
}

/**
 * Container width (px) at or below which the hero forces the `compact`
 * preset regardless of the operator's chosen density. Picked to roughly
 * match the website-editor preview's narrowest split-pane state.
 */
export const COMPACT_FORCE_BREAKPOINT = 640;

const SPACING_MAP: Record<HeroSpacingDensity, HeroSpacingClasses> = {
  compact: {
    eyebrow: 'mb-4',
    subheadline: 'mt-5',
    cta: 'mt-6',
    notesGap: 'gap-4',
  },
  standard: {
    eyebrow: 'mb-6',
    subheadline: 'mt-8',
    cta: 'mt-8',
    notesGap: 'gap-5',
  },
  airy: {
    eyebrow: 'mb-8',
    subheadline: 'mt-10',
    cta: 'mt-10',
    notesGap: 'gap-6',
  },
};

/**
 * Resolve spacing classes with safe fallbacks.
 *
 * @param density       Operator-chosen density (defaults to `compact`).
 * @param forceCompact  When true, ignores `density` and returns the
 *                      `compact` preset. Use this with a ResizeObserver
 *                      reading on the hero wrapper to honor the
 *                      Container-Aware Responsiveness canon.
 */
export function resolveHeroSpacing(
  density: HeroSpacingDensity | undefined | null,
  forceCompact = false,
): HeroSpacingClasses {
  if (forceCompact) return SPACING_MAP.compact;
  return SPACING_MAP[density ?? 'compact'] ?? SPACING_MAP.compact;
}

/** Exported for tests + the editor's preset-picker UI. */
export const HERO_SPACING_PRESETS: ReadonlyArray<{
  id: HeroSpacingDensity;
  label: string;
  description: string;
}> = [
  { id: 'compact', label: 'Compact', description: 'Tight rhythm, copy hugs the buttons.' },
  { id: 'standard', label: 'Standard', description: 'Balanced rhythm, classic hero.' },
  { id: 'airy', label: 'Airy', description: 'Looser rhythm, more breath between elements.' },
];
