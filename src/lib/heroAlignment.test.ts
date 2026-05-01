/**
 * Hero alignment canon — `notes` must mirror `cta` for every alignment value.
 *
 * Background: the consultation note lines under the hero CTAs originally
 * hardcoded `items-center`, which silently ignored the operator's
 * `content_alignment` choice. Fix introduced a dedicated `notes` key on
 * `HeroAlignmentClasses` so future hero variants can't reintroduce a
 * hardcoded centering class. This test locks the contract in CI.
 */
import { describe, it, expect } from 'vitest';
import { resolveHeroAlignment, type HeroContentAlignment } from './heroAlignment';

const ALL_ALIGNMENTS: HeroContentAlignment[] = ['left', 'center', 'right'];

describe('resolveHeroAlignment — notes canon', () => {
  it.each(ALL_ALIGNMENTS)(
    'returns a notes class that matches cta for alignment=%s',
    (alignment) => {
      const a = resolveHeroAlignment(alignment);
      expect(a.notes).toBe(a.cta);
    },
  );

  it('returns items-start (not items-center) for left alignment', () => {
    const a = resolveHeroAlignment('left');
    expect(a.notes).toBe('items-start');
    expect(a.notes).not.toContain('items-center');
  });

  it('returns items-end (not items-center) for right alignment', () => {
    const a = resolveHeroAlignment('right');
    expect(a.notes).toBe('items-end');
    expect(a.notes).not.toContain('items-center');
  });

  it('falls back to center notes alignment for unset values', () => {
    expect(resolveHeroAlignment(undefined).notes).toBe('items-center');
    expect(resolveHeroAlignment(null).notes).toBe('items-center');
  });
});
