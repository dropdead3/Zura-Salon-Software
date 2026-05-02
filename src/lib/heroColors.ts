/**
 * Hero text/button color resolution. Centralizes the auto-contrast +
 * override merge logic shared by `HeroSection` (static) and
 * `HeroSlideRotator` (multi-slide). Renderers should always go through
 * `resolveHeroColors()` instead of branching on `hasBackground` themselves.
 */
import type { HeroTextColors } from '@/hooks/useSectionConfig';

/**
 * Pick black or white for best contrast against a hex background. Uses the
 * WCAG relative-luminance formula; threshold 0.5 gives stable AA-or-better
 * pairings for the operator-set hover backgrounds (light hover-bg → black
 * text, dark hover-bg → white text). Returns `null` for unparseable input
 * so callers can fall through to their existing fallback.
 */
export function pickContrastColor(hex: string | undefined): '#000000' | '#ffffff' | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // Linearize per sRGB
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '#000000' : '#ffffff';
}

export interface ResolvedHeroColors {
  /** Inline style for the headline element. */
  headlineStyle: React.CSSProperties;
  /** Inline style for the subheadline element. */
  subheadlineStyle: React.CSSProperties;
  /** Tailwind class fallback for the headline (auto-contrast). */
  headlineClass: string;
  /** Tailwind class fallback for the subheadline (auto-contrast). */
  subheadlineClass: string;
  /** Inline style for the eyebrow (above headline). */
  eyebrowStyle: React.CSSProperties;
  /** Tone class for the eyebrow when no override is set. */
  eyebrowToneClass: string;
  /** Inline style for the consultation notes (below CTAs). */
  notesStyle: React.CSSProperties;
  /** Tone class for the notes when no override is set. */
  notesToneClass: string;
  /** Inline style + className for the primary CTA button. Includes the
   *  `--hero-btn-hover` CSS var when an operator hover override is set. */
  primaryButtonStyle: React.CSSProperties;
  primaryButtonClass: string;
  /** Inline style + className for the secondary CTA button. */
  secondaryButtonStyle: React.CSSProperties;
  secondaryButtonClass: string;
  /** True when an operator-set hover background exists for the primary CTA.
   *  Consumers must add the `hero-cta-hover` utility class when true so the
   *  CSS rule can override the inline `background-color`. */
  hasPrimaryHover: boolean;
  hasSecondaryHover: boolean;
  /** True when an operator-set hover border color exists for the secondary CTA. */
  hasSecondaryHoverBorder: boolean;
  /** True when an operator-set hover text color exists for the secondary CTA. */
  hasSecondaryHoverFg: boolean;
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

  const eyebrowStyle: React.CSSProperties = colors.eyebrow ? { color: colors.eyebrow } : {};
  const eyebrowToneClass = colors.eyebrow
    ? ''
    : hasBackground
      ? 'text-white/70'
      : 'text-muted-foreground';

  const notesStyle: React.CSSProperties = colors.notes ? { color: colors.notes } : {};
  const notesToneClass = colors.notes
    ? ''
    : hasBackground
      ? 'text-white/70'
      : 'text-muted-foreground';

  // Primary button — overrides take precedence; fall back to white-on-black
  // over media, theme-foreground otherwise.
  const primaryButtonStyle: React.CSSProperties = {};
  if (colors.primary_button_bg) primaryButtonStyle.backgroundColor = colors.primary_button_bg;
  if (colors.primary_button_fg) primaryButtonStyle.color = colors.primary_button_fg;
  if (colors.primary_button_hover_bg) {
    (primaryButtonStyle as Record<string, string>)['--hero-btn-hover'] =
      colors.primary_button_hover_bg;
  }

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
  if (colors.secondary_button_hover_bg) {
    (secondaryButtonStyle as Record<string, string>)['--hero-btn-hover'] =
      colors.secondary_button_hover_bg;
  }
  if (colors.secondary_button_hover_border) {
    (secondaryButtonStyle as Record<string, string>)['--hero-btn-hover-border'] =
      colors.secondary_button_hover_border;
  }
  if (colors.secondary_button_hover_fg) {
    (secondaryButtonStyle as Record<string, string>)['--hero-btn-hover-fg'] =
      colors.secondary_button_hover_fg;
  }

  const secondaryButtonClass =
    colors.secondary_button_border || colors.secondary_button_fg
      ? ''
      : hasBackground
        ? 'border-white text-white'
        : 'border-foreground text-foreground';

  return {
    headlineStyle,
    subheadlineStyle,
    headlineClass,
    subheadlineClass,
    eyebrowStyle,
    eyebrowToneClass,
    notesStyle,
    notesToneClass,
    primaryButtonStyle,
    primaryButtonClass,
    secondaryButtonStyle,
    secondaryButtonClass,
    hasPrimaryHover: !!colors.primary_button_hover_bg,
    hasSecondaryHover: !!colors.secondary_button_hover_bg,
    hasSecondaryHoverBorder: !!colors.secondary_button_hover_border,
    hasSecondaryHoverFg: !!colors.secondary_button_hover_fg,
  };
}
