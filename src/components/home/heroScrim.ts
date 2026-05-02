/**
 * Hero scrim resolution — single source of truth for "given a slide-level
 * override and a section-level default, what scrim style + strength should
 * actually render?"
 *
 * Background: per-slide overrides historically wrote `0` instead of `null`
 * to express "inherit from section". A `0` strength paired with a non-`none`
 * style is meaningless (a gradient with peak opacity 0 is invisible) and
 * silently shadows the section setting — which surfaces to the operator as
 * "the section scrim slider does nothing".
 *
 * Rule: a slide-level strength of `0` with a non-`none` style is treated as
 * `null` (inherit). Operators who genuinely want no scrim choose the
 * `'none'` style — that path is unaffected.
 *
 * Used by:
 *   - `HeroSlideRotator` (live render)
 *   - `HeroSlidesManager` (editor list preview)
 *   - `HeroSlideEditor` (editor detail preview)
 * to guarantee preview-live parity.
 */
import type { HeroScrimStyle } from '@/hooks/useSectionConfig';

interface ResolveScrimInput {
  slideStyle: HeroScrimStyle | null | undefined;
  slideStrength: number | null | undefined;
  sectionStyle: HeroScrimStyle | null | undefined;
  sectionStrength: number | null | undefined;
}

interface ResolveScrimResult {
  style: HeroScrimStyle;
  strength: number;
}

const DEFAULT_STYLE: HeroScrimStyle = 'gradient-bottom';
const DEFAULT_STRENGTH = 0.55;

export function resolveScrim({
  slideStyle,
  slideStrength,
  sectionStyle,
  sectionStrength,
}: ResolveScrimInput): ResolveScrimResult {
  const style: HeroScrimStyle = slideStyle ?? sectionStyle ?? DEFAULT_STYLE;

  const isMeaninglessZero =
    slideStrength === 0 && slideStyle != null && slideStyle !== 'none';
  const slideStrengthUsable =
    slideStrength == null || isMeaninglessZero ? null : slideStrength;
  const strength = slideStrengthUsable ?? sectionStrength ?? DEFAULT_STRENGTH;

  return { style, strength };
}
