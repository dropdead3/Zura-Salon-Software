/**
 * useInUseSiteColors
 *
 * Aggregates colors the operator has already configured elsewhere on this
 * site so the editor's color picker can offer them as one-click swatches.
 * Powers the "Already in use" row in <ThemeAwareColorInput>.
 *
 * Sources (all draft-aware via useSiteSettings):
 *   - `promotional_popup` → accentColor (the literal "See Offer" chip)
 *   - `announcement_bar`  → bg_color (the bar across the top of the site)
 *   - `section_hero`      → text_colors.* (headline, subheadline, CTA bg/fg)
 *
 * Each entry is labeled with where the color came from so the operator
 * sees "See Offer #a49584" rather than a naked hex chip.
 *
 * Deduped by normalized hex — picking the same color in two places only
 * shows one chip (with a combined label, e.g. "See Offer · Hero CTA").
 */

import { useMemo } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { normalizeHex } from '@/lib/themeTokenSwatches';

export interface InUseColorSwatch {
  /** Stable identifier for React keys. */
  key: string;
  /** Comma-joined source labels, e.g. "See Offer · Hero CTA". */
  label: string;
  /** Normalized 6-digit hex used both for display + onChange payload. */
  hex: string;
}

interface PromoPopupShape extends Record<string, unknown> {
  accentColor?: string;
}

interface AnnouncementBarShape extends Record<string, unknown> {
  bg_color?: string;
  highlight_color?: string;
}

interface HeroSectionShape extends Record<string, unknown> {
  text_colors?: {
    headline?: string;
    subheadline?: string;
    primary_button_bg?: string;
    primary_button_fg?: string;
    primary_button_hover_bg?: string;
    secondary_button_border?: string;
    secondary_button_fg?: string;
    secondary_button_hover_bg?: string;
  };
}

export function useInUseSiteColors(): InUseColorSwatch[] {
  const { data: popup } = useSiteSettings<PromoPopupShape>('promotional_popup');
  const { data: announcement } = useSiteSettings<AnnouncementBarShape>('announcement_bar');
  const { data: hero } = useSiteSettings<HeroSectionShape>('section_hero');

  return useMemo(() => {
    const raw: { hex: string; label: string }[] = [];

    if (popup?.accentColor) {
      raw.push({ hex: normalizeHex(popup.accentColor), label: 'See Offer' });
    }
    if (announcement?.bg_color) {
      raw.push({ hex: normalizeHex(announcement.bg_color), label: 'Announcement' });
    }
    const tc = hero?.text_colors;
    if (tc) {
      if (tc.headline)               raw.push({ hex: normalizeHex(tc.headline),               label: 'Headline' });
      if (tc.subheadline)            raw.push({ hex: normalizeHex(tc.subheadline),            label: 'Subheadline' });
      if (tc.primary_button_bg)      raw.push({ hex: normalizeHex(tc.primary_button_bg),      label: 'Primary CTA' });
      if (tc.primary_button_fg)      raw.push({ hex: normalizeHex(tc.primary_button_fg),      label: 'Primary CTA text' });
      if (tc.secondary_button_border)raw.push({ hex: normalizeHex(tc.secondary_button_border),label: 'Secondary CTA' });
      if (tc.secondary_button_fg)    raw.push({ hex: normalizeHex(tc.secondary_button_fg),    label: 'Secondary CTA text' });
    }

    // Dedupe: keep first occurrence's order, join labels with " · ".
    const byHex = new Map<string, string[]>();
    for (const { hex, label } of raw) {
      if (!hex) continue;
      const existing = byHex.get(hex);
      if (existing) {
        if (!existing.includes(label)) existing.push(label);
      } else {
        byHex.set(hex, [label]);
      }
    }

    return Array.from(byHex.entries()).map(([hex, labels]) => ({
      key: hex,
      hex,
      label: labels.join(' · '),
    }));
  }, [popup, announcement, hero]);
}
