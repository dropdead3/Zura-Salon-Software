/**
 * Preview-vs-live drift guard for hero notes alignment.
 *
 * Renders `HeroSectionPreview` (the editor thumbnail) under each
 * `content_alignment` value and asserts the consultation notes container
 * carries the matching `items-*` class — never a hardcoded `items-center`
 * when alignment is `left` or `right`. Covers the same canon as the
 * sibling `heroAlignment.test.ts` but at the JSX integration layer.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeroSectionPreview } from './HeroSectionPreview';
import type { HeroConfig } from '@/hooks/useSectionConfig';
import type { HeroContentAlignment } from '@/lib/heroAlignment';

function makeConfig(alignment: HeroContentAlignment): HeroConfig {
  return {
    eyebrow: 'EYEBROW',
    show_eyebrow: true,
    headline_text: 'Headline',
    rotating_words: ['Salon'],
    show_subheadline: true,
    subheadline_line1: 'sub one',
    subheadline_line2: 'sub two',
    cta_new_client: 'I am a new client',
    cta_returning_client: 'I am a returning client',
    consultation_note_line1: 'NOTE_LINE_1',
    consultation_note_line2: 'NOTE_LINE_2',
    content_alignment: alignment,
  } as unknown as HeroConfig;
}

const EXPECTED: Record<HeroContentAlignment, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
};

describe('HeroSectionPreview — notes alignment', () => {
  (['left', 'center', 'right'] as HeroContentAlignment[]).forEach((alignment) => {
    it(`uses ${EXPECTED[alignment]} on the notes container for content_alignment=${alignment}`, () => {
      const { container } = render(<HeroSectionPreview config={makeConfig(alignment)} />);
      const noteEl = container.querySelector('p')?.closest('div');
      // Find the specific notes wrapper by locating the line1 text first.
      const line1 = Array.from(container.querySelectorAll('p')).find(
        (p) => p.textContent === 'NOTE_LINE_1',
      );
      expect(line1).toBeTruthy();
      const notesContainer = line1!.parentElement!;
      expect(notesContainer.className).toContain(EXPECTED[alignment]);

      if (alignment !== 'center') {
        expect(notesContainer.className).not.toContain('items-center');
      }
      // Sanity: the unrelated nearest div lookup didn't match nothing
      expect(noteEl).toBeTruthy();
    });
  });
});
