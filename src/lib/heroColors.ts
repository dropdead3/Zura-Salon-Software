/**
 * Hero text/button color resolution. Centralizes the auto-contrast +
 * override merge logic shared by `HeroSection` (static) and
 * `HeroSlideRotator` (multi-slide). Renderers should always go through
 * `resolveHeroColors()` instead of branching on `hasBackground` themselves.
 */
import type { HeroTextColors } from '@/hooks/useSectionConfig';

export interface ResolvedHeroColors {
  /** Inline style for the headline element. */
  headlineStyle: React.CSSProperties;
  /** Inline style for the subheadline element. */
  subheadlineStyle: React.CSSProperties;
  /** Tailwind class fallback for the headline (auto-contrast). */
  headlineClass: string;
  /** Tailwind class fallback for the subheadline (auto-contrast). */
  subheadlineClass: string;
  /** Inline style + className for the primary CTA button. */
  primaryButtonStyle: React.CSSProperties;
  primaryButtonClass: string;
  /** Inline style + className for the secondary CTA button. */
  secondaryButtonStyle: React.CSSProperties;
  secondaryButtonClass: string;
  /** Hover background for primary button — applied via CSS var. */
  primaryHoverVar: React.CSSProperties;
  /** Hover background for secondary button — applied via CSS var. */
  secondaryHoverVar: React.CSSProperties;
}

/**
 * Merge per-slide overrides with section-level overrides. Per-slide wins
 * field-by-field; missing fields fall through.
 */
export function mergeHeroColors(
  section: HeroTextColors | undefined,
  slide?: HeroTextColors | undefined,
): HeroTextColors {
  return { ...(section ?? {}), ...(slide ?? {}) };
}

/**
 * Compute final per-element styles + class fallbacks. Auto-contrast (white
 * text on media background) is the default; any explicit override wins.
 */
export function resolveHeroColors(
  colors: HeroTextColors,
  hasBackground: boolean,
): ResolvedHeroColors {
  const headlineStyle: React.CSSProperties = colors.headline ? { color: colors.headline } : {};
  const subheadlineStyle: React.CSSProperties = colors.subheadline ? { color: colors.subheadline } : {};

  const headlineClass = colors.headline ? '' : hasBackground ? 'text-white' : 'text-foreground';
  const subheadlineClass = colors.subheadline
    ? ''
    : hasBackground
      ? 'text-white/80'
      : 'text-muted-foreground';

  // Primary button — overrides take precedence; fall back to white-on-black
  // over media, theme-foreground otherwise.
  const primaryButtonStyle: React.CSSProperties = {};
  if (colors.primary_button_bg) primaryButtonStyle.backgroundColor = colors.primary_button_bg;
  if (colors.primary_button_fg) primaryButtonStyle.color = colors.primary_button_fg;

  const primaryButtonClass =
    colors.primary_button_bg || colors.primary_button_fg
      ? '' // operator-controlled; skip fallback classes
      : hasBackground
        ? 'bg-white text-black hover:bg-white/90'
        : 'bg-foreground text-background hover:bg-foreground/90';

  // Secondary button — outline style with optional border/text color.
  const secondaryButtonStyle: React.CSSProperties = {};
  if (colors.secondary_button_border) secondaryButtonStyle.borderColor = colors.secondary_button_border;
  if (colors.secondary_button_fg) secondaryButtonStyle.color = colors.secondary_button_fg;

  const secondaryButtonClass =
    colors.secondary_button_border || colors.secondary_button_fg
      ? ''
      : hasBackground
        ? 'border-white text-white'
        : 'border-foreground text-foreground';

  // Hover backgrounds applied as CSS custom properties so :hover can pick
  // them up via inline style + the class `hover:[background-color:var(--h)]`.
  const primaryHoverVar: React.CSSProperties = colors.primary_button_hover_bg
    ? ({ ['--hero-btn-hover' as string]: colors.primary_button_hover_bg })
    : {};
  const secondaryHoverVar: React.CSSProperties = colors.secondary_button_hover_bg
    ? ({ ['--hero-btn-hover' as string]: colors.secondary_button_hover_bg })
    : {};

  return {
    headlineStyle,
    subheadlineStyle,
    headlineClass,
    subheadlineClass,
    primaryButtonStyle,
    primaryButtonClass,
    secondaryButtonStyle,
    secondaryButtonClass,
    primaryHoverVar,
    secondaryHoverVar,
  };
}
