/**
 * HeroNotes — preview-vs-live parity guard.
 *
 * Both `HeroSection` (live) and `HeroSectionPreview` (editor thumbnail)
 * render `<HeroNotes>` with the same `alignment` object. Asserting the
 * pure component renders the right `items-*` class therefore covers BOTH
 * surfaces in one assertion — exactly the parity the original bug
 * exposed when the live hero re-typed `items-center` inline.
 *
 * If this test fails, either:
 *   1. The `notes` key was renamed/removed in heroAlignment.ts (fix the
 *      sibling test `src/lib/heroAlignment.test.ts` first), OR
 *   2. A new hero variant introduced its own notes container without
 *      using <HeroNotes/>. Fix by routing the new variant through this
 *      component instead of duplicating the JSX.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeroNotes } from './HeroNotes';
import { resolveHeroAlignment, type HeroContentAlignment } from '@/lib/heroAlignment';

const EXPECTED: Record<HeroContentAlignment, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
};

describe('HeroNotes', () => {
  (['left', 'center', 'right'] as HeroContentAlignment[]).forEach((alignment) => {
    it(`uses ${EXPECTED[alignment]} when content_alignment=${alignment}`, () => {
      const { container } = render(
        <HeroNotes
          alignment={resolveHeroAlignment(alignment)}
          line1="LINE_ONE"
          line2="LINE_TWO"
        />,
      );
      const notes = container.querySelector('[data-hero-notes]');
      expect(notes).toBeTruthy();
      expect(notes!.className).toContain(EXPECTED[alignment]);

      if (alignment !== 'center') {
        // Hardcoded `items-center` was the original regression — make sure
        // it never reappears for left/right alignment.
        expect(notes!.className).not.toContain('items-center');
      }
    });
  });

  it('renders both note lines as <p> children', () => {
    const { container } = render(
      <HeroNotes
        alignment={resolveHeroAlignment('left')}
        line1="LINE_ONE"
        line2="LINE_TWO"
      />,
    );
    const ps = container.querySelectorAll('[data-hero-notes] > p');
    expect(ps).toHaveLength(2);
    expect(ps[0].textContent).toBe('LINE_ONE');
    expect(ps[1].textContent).toBe('LINE_TWO');
  });
});
