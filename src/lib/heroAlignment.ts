/**
 * Hero content alignment helpers.
 *
 * Operators choose how hero text + CTAs sit horizontally across the section:
 *   - 'left'   → flush left, content hugs the left edge of the container
 *   - 'center' → traditional centered hero (legacy default)
 *   - 'right'  → flush right, content hugs the right edge
 *
 * Returned classes drive THREE concerns at once so callers stay declarative:
 *   1. `wrapper` — text-align + container alignment (mr-auto / mx-auto / ml-auto)
 *   2. `headline` — flex column alignment for the multi-line headline span stack
 *   3. `cta` — button row + below-button-notes horizontal alignment
 *
 * Centralized so the static HeroSection, the multi-slide HeroSlideRotator, and
 * the editor preview thumbnail can't drift apart.
 */

export type HeroContentAlignment = 'left' | 'center' | 'right';

export interface HeroAlignmentClasses {
  /** Outer text-block wrapper: width clamp + horizontal placement + text-align. */
  wrapper: string;
  /** Headline `<h1>` flex-column item alignment. */
  headline: string;
  /** Subheadline `<p>` margin/alignment helper (mx-auto vs ml-0/mr-0). */
  subheadline: string;
  /** CTA column container alignment (vertical stack on mobile). */
  cta: string;
  /**
   * CTA row justify on `sm:` and up — full classes (no string concat) so
   * Tailwind's JIT can statically extract them.
   */
  ctaRow: string;
  /**
   * Below-CTA notes container (consultation copy lines). Mirrors `cta` so the
   * shrunk note block sits on the correct horizontal edge. Centralized so
   * future hero variants don't reintroduce hardcoded `items-center`.
   */
  notes: string;
}

const ALIGNMENT_MAP: Record<HeroContentAlignment, HeroAlignmentClasses> = {
  left: {
    wrapper: 'max-w-4xl mr-auto text-left',
    headline: 'items-start',
    subheadline: 'mr-auto ml-0 max-w-md',
    cta: 'items-start',
    ctaRow: 'sm:justify-start',
    notes: 'items-start',
  },
  center: {
    wrapper: 'max-w-4xl mx-auto text-center',
    headline: 'items-center',
    subheadline: 'mx-auto max-w-md',
    cta: 'items-center',
    ctaRow: 'sm:justify-center',
    notes: 'items-center',
  },
  right: {
    wrapper: 'max-w-4xl ml-auto text-right',
    headline: 'items-end',
    subheadline: 'ml-auto mr-0 max-w-md',
    cta: 'items-end',
    ctaRow: 'sm:justify-end',
    notes: 'items-end',
  },
};

/** Resolve alignment classes with a safe `center` fallback for legacy/unset values. */
export function resolveHeroAlignment(
  alignment: HeroContentAlignment | undefined | null,
): HeroAlignmentClasses {
  return ALIGNMENT_MAP[alignment ?? 'center'] ?? ALIGNMENT_MAP.center;
}
