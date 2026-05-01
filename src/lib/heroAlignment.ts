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

/**
 * Per-slide content column width. Lets a punchy single-line headline flex
 * wider while a copy-heavy slide stays in a readable narrow column.
 *   - 'narrow'  → max-w-2xl  (~672px)  — copy-heavy slides
 *   - 'default' → max-w-4xl  (~896px)  — legacy default, balanced
 *   - 'wide'    → max-w-6xl  (~1152px) — punchy, single-line headlines
 */
export type HeroContentWidth = 'narrow' | 'default' | 'wide';

export interface HeroAlignmentClasses {
  /**
   * Outer text-block wrapper: width clamp + horizontal placement + text-align.
   * Used for static (non-rotating) hero surfaces — combines
   * `shellWrapper` + `innerWrapper` semantics in a single class string.
   */
  wrapper: string;
  /**
   * Stable outer shell for the rotating hero foreground. Centered + width-
   * clamped regardless of slide alignment so the container itself does NOT
   * change horizontal placement when the active slide changes.
   *
   * Pair with `innerWrapper` on the per-slide motion element so each slide
   * carries its own horizontal anchor for the duration of its lifecycle.
   */
  shellWrapper: string;
  /**
   * Per-slide alignment + text-align, applied INSIDE the stable shell. Holds
   * the slide-specific horizontal anchor (left/center/right) so the outgoing
   * slide can fade out at its anchor and the incoming slide can fade in at
   * the new anchor without the outer wrapper visibly flipping mid-transition.
   *
   * Includes `lg:pl-8` (left) / `lg:pr-8` (right) breathing room so flush
   * text doesn't visually kiss the container edge on ultra-wide displays.
   * Center is symmetric and needs no inset.
   */
  innerWrapper: string;
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

/**
 * Per-width Tailwind max-width clamp. Statically extracted (no string concat)
 * so the JIT picks all three up.
 */
const WIDTH_CLAMP: Record<HeroContentWidth, string> = {
  narrow: 'max-w-2xl',
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
};

/** Resolve the Tailwind max-width clamp for a width preset (safe fallback). */
export function resolveHeroWidthClamp(
  width: HeroContentWidth | undefined | null,
): string {
  return WIDTH_CLAMP[width ?? 'default'] ?? WIDTH_CLAMP.default;
}

const ALIGNMENT_MAP: Record<HeroContentAlignment, HeroAlignmentClasses> = {
  left: {
    wrapper: 'max-w-4xl mr-auto text-left',
    // Shell fills the container so the inner left/right wrappers can travel
    // to the page padding edges. The width clamp lives on `innerWrapper` so
    // the content column itself stays readable while the anchor moves.
    shellWrapper: 'w-full',
    // `lg:pl-8` keeps flush-left text from kissing the container edge on
    // ultra-wide displays without affecting mobile/tablet padding.
    innerWrapper: 'max-w-4xl mr-auto ml-0 text-left lg:pl-8',
    headline: 'items-start',
    subheadline: 'mr-auto ml-0 max-w-md',
    cta: 'items-start',
    ctaRow: 'sm:justify-start',
    notes: 'items-start',
  },
  center: {
    wrapper: 'max-w-4xl mx-auto text-center',
    shellWrapper: 'w-full',
    innerWrapper: 'max-w-4xl mx-auto text-center',
    headline: 'items-center',
    subheadline: 'mx-auto max-w-md',
    cta: 'items-center',
    ctaRow: 'sm:justify-center',
    notes: 'items-center',
  },
  right: {
    wrapper: 'max-w-4xl ml-auto text-right',
    shellWrapper: 'w-full',
    // `lg:pr-8` mirrors the left inset for symmetric breathing room.
    innerWrapper: 'max-w-4xl ml-auto mr-0 text-right lg:pr-8',
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

/**
 * Build alignment classes with a per-slide width override applied to the
 * `innerWrapper` (and, for static surfaces, `wrapper`). Falls back to the
 * default `max-w-4xl` clamp baked into the alignment map if `width` is unset.
 */
export function resolveHeroAlignmentWithWidth(
  alignment: HeroContentAlignment | undefined | null,
  width: HeroContentWidth | undefined | null,
): HeroAlignmentClasses {
  const base = resolveHeroAlignment(alignment);
  if (!width || width === 'default') return base;
  const next = resolveHeroWidthClamp(width);
  // Swap `max-w-4xl` (the baked-in default) for the operator's choice.
  // Done as a token-level replace so the alignment map stays the single
  // source of truth for every other class on the wrapper.
  return {
    ...base,
    wrapper: base.wrapper.replace('max-w-4xl', next),
    innerWrapper: base.innerWrapper.replace('max-w-4xl', next),
  };
}
