/**
 * SectionTextColors — shared per-section color override shape.
 *
 * Lives outside the editor tree so live render components (under
 * `src/components/home/`) can import the type without pulling in editor-only
 * dependencies (collapsibles, popovers, framer-motion, etc.).
 *
 * Every field is optional. Empty / undefined means "inherit from the active
 * site theme" — the same semantics Hero already uses for `HeroTextColors`.
 */

export interface SectionTextColors {
  // Text
  heading?: string;
  eyebrow?: string;
  body?: string;
  accent?: string;

  // Primary button
  primary_button_bg?: string;
  primary_button_fg?: string;
  primary_button_hover_bg?: string;

  // Secondary button
  secondary_button_bg?: string;
  secondary_button_border?: string;
  secondary_button_fg?: string;
  secondary_button_hover_bg?: string;
  secondary_button_hover_fg?: string;

  // Section-specific extras
  /** Testimonials: filled star color */
  star?: string;
  /** FAQ: open-state border + chevron tint */
  faq_open_accent?: string;
  /** Footer / link surfaces: link / hover-link tint */
  link?: string;
}

export type SectionColorSlotKey = keyof SectionTextColors;
