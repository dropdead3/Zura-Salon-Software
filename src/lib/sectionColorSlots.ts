/**
 * Per-section color slot definitions.
 *
 * Each section editor declares which color slots it exposes. Editors render
 * `<SectionTextColorsEditor slots={...} />`; live renderers read the same
 * keys off `text_colors` and apply them via inline `style`.
 *
 * Single source of truth: editor + live render should never diverge on which
 * slots a section supports. Add new slots to `SectionTextColors` first, then
 * add them to the relevant slot list here.
 */

import type { SectionColorSlotKey } from '@/lib/sectionTextColors';

export interface SectionColorSlot {
  key: SectionColorSlotKey;
  label: string;
  /** Optional group heading. Slots sharing a group render under one subhead. */
  group?: string;
  /** Optional helper text rendered under the label. */
  hint?: string;
}

export const FAQ_COLOR_SLOTS: readonly SectionColorSlot[] = [
  { key: 'eyebrow', label: 'Eyebrow', group: 'Text' },
  { key: 'heading', label: 'Headline', group: 'Text' },
  { key: 'body', label: 'Intro paragraphs', group: 'Text' },
  { key: 'faq_open_accent', label: 'Open-state accent', group: 'List', hint: 'Border + chevron tint when a question is expanded.' },
  { key: 'primary_button_bg', label: 'Primary button — background', group: 'Buttons' },
  { key: 'primary_button_fg', label: 'Primary button — text', group: 'Buttons' },
  { key: 'secondary_button_border', label: 'Secondary button — border', group: 'Buttons' },
  { key: 'secondary_button_fg', label: 'Secondary button — text', group: 'Buttons' },
] as const;

export const TESTIMONIALS_COLOR_SLOTS: readonly SectionColorSlot[] = [
  { key: 'eyebrow', label: 'Eyebrow', group: 'Text' },
  { key: 'heading', label: 'Headline', group: 'Text' },
  { key: 'body', label: 'Quote text', group: 'Text' },
  { key: 'accent', label: 'Attribution / verified badge', group: 'Text' },
  { key: 'star', label: 'Star color', group: 'List', hint: 'Filled star icon for 5-star reviews.' },
  { key: 'link', label: 'Review link', group: 'Buttons', hint: 'Color of the "Leave a review" link.' },
] as const;

export const FOOTER_CTA_COLOR_SLOTS: readonly SectionColorSlot[] = [
  { key: 'eyebrow', label: 'Eyebrow', group: 'Text' },
  { key: 'heading', label: 'Headline', group: 'Text' },
  { key: 'body', label: 'Description', group: 'Text' },
  { key: 'primary_button_bg', label: 'Button — background', group: 'CTA' },
  { key: 'primary_button_fg', label: 'Button — text', group: 'CTA' },
  { key: 'primary_button_hover_bg', label: 'Button — hover background', group: 'CTA' },
  { key: 'link', label: 'Phone numbers', group: 'CTA' },
] as const;

export const BRAND_STATEMENT_COLOR_SLOTS: readonly SectionColorSlot[] = [
  { key: 'eyebrow', label: 'Eyebrow', group: 'Text' },
  { key: 'heading', label: 'Headline (static)', group: 'Text' },
  { key: 'accent', label: 'Rotating words', group: 'Text', hint: 'The animated typewriter words between prefix and suffix.' },
  { key: 'body', label: 'Description paragraphs', group: 'Text' },
] as const;
