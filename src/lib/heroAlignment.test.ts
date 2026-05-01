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

describe('resolveHeroAlignment — shell vs inner wrapper canon', () => {
  // The rotating hero needs a STABLE outer shell (centered + width-clamped)
  // and a separate INNER per-slide wrapper that owns the horizontal anchor.
  // Without this split, the outer wrapper flips alignment when slides change,
  // making left→right transitions look like content slides through center.
  it.each(ALL_ALIGNMENTS)(
    'shellWrapper is centered + width-clamped regardless of alignment=%s',
    (alignment) => {
      const a = resolveHeroAlignment(alignment);
      expect(a.shellWrapper).toContain('mx-auto');
      expect(a.shellWrapper).toContain('max-w-4xl');
      expect(a.shellWrapper).not.toContain('mr-auto');
      expect(a.shellWrapper).not.toContain('ml-auto ');
    },
  );

  it('innerWrapper carries left anchor for left alignment', () => {
    const a = resolveHeroAlignment('left');
    expect(a.innerWrapper).toContain('mr-auto');
    expect(a.innerWrapper).toContain('text-left');
  });

  it('innerWrapper carries center anchor for center alignment', () => {
    const a = resolveHeroAlignment('center');
    expect(a.innerWrapper).toContain('mx-auto');
    expect(a.innerWrapper).toContain('text-center');
  });

  it('innerWrapper carries right anchor for right alignment', () => {
    const a = resolveHeroAlignment('right');
    expect(a.innerWrapper).toContain('ml-auto');
    expect(a.innerWrapper).toContain('text-right');
  });

  it('falls back to center innerWrapper for unset values', () => {
    expect(resolveHeroAlignment(undefined).innerWrapper).toContain('text-center');
    expect(resolveHeroAlignment(null).innerWrapper).toContain('text-center');
  });
});
