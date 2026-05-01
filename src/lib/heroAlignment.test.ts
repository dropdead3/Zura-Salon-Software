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
import {
  resolveHeroAlignment,
  resolveHeroAlignmentWithWidth,
  resolveHeroWidthClamp,
  type HeroContentAlignment,
  type HeroContentWidth,
} from './heroAlignment';

const ALL_ALIGNMENTS: HeroContentAlignment[] = ['left', 'center', 'right'];
const ALL_WIDTHS: HeroContentWidth[] = ['narrow', 'default', 'wide'];

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
  // The rotating hero needs a STABLE outer shell that fills the container
  // edge-to-edge so the inner per-slide wrapper can travel to the correct
  // page-padding edge for left/right alignment. The width clamp lives on
  // `innerWrapper` so the content column itself stays readable.
  // Without this split, left/right alignment got trapped inside a centered
  // ~896px column and looked stranded mid-screen instead of hugging the edge.
  it.each(ALL_ALIGNMENTS)(
    'shellWrapper fills the container regardless of alignment=%s',
    (alignment) => {
      const a = resolveHeroAlignment(alignment);
      expect(a.shellWrapper).toContain('w-full');
      // Width clamp must NOT live on the shell — it belongs on the inner
      // wrapper so left/right alignment can travel to the page edges.
      expect(a.shellWrapper).not.toContain('max-w-4xl');
      expect(a.shellWrapper).not.toContain('mx-auto');
    },
  );

  it.each(ALL_ALIGNMENTS)(
    'innerWrapper carries the width clamp for alignment=%s',
    (alignment) => {
      const a = resolveHeroAlignment(alignment);
      expect(a.innerWrapper).toContain('max-w-4xl');
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

describe('resolveHeroAlignment — edge breathing room canon', () => {
  // Flush left/right text on ultra-wide displays visually kissed the
  // container edge. `lg:pl-8` / `lg:pr-8` add a small inset so the
  // content reads as anchored, not pinned. Center is symmetric and
  // intentionally has no inset.
  it('adds lg:pl-8 inset on left alignment', () => {
    const a = resolveHeroAlignment('left');
    expect(a.innerWrapper).toContain('lg:pl-8');
    expect(a.innerWrapper).not.toContain('lg:pr-8');
  });

  it('adds lg:pr-8 inset on right alignment', () => {
    const a = resolveHeroAlignment('right');
    expect(a.innerWrapper).toContain('lg:pr-8');
    expect(a.innerWrapper).not.toContain('lg:pl-8');
  });

  it('does NOT add an inset on center alignment', () => {
    const a = resolveHeroAlignment('center');
    expect(a.innerWrapper).not.toContain('lg:pl-8');
    expect(a.innerWrapper).not.toContain('lg:pr-8');
  });
});

describe('resolveHeroWidthClamp', () => {
  it.each([
    ['narrow', 'max-w-2xl'],
    ['default', 'max-w-4xl'],
    ['wide', 'max-w-6xl'],
  ] as const)('maps width=%s to %s', (width, expected) => {
    expect(resolveHeroWidthClamp(width)).toBe(expected);
  });

  it('falls back to default clamp for unset values', () => {
    expect(resolveHeroWidthClamp(undefined)).toBe('max-w-4xl');
    expect(resolveHeroWidthClamp(null)).toBe('max-w-4xl');
  });
});

describe('resolveHeroAlignmentWithWidth — width override canon', () => {
  // Operators can override the per-slide content column width so a punchy
  // single-line headline can flex wider than copy-heavy slides. The width
  // override swaps the clamp on `innerWrapper` and `wrapper` while leaving
  // every other class untouched.
  it.each(ALL_ALIGNMENTS)(
    'leaves the default clamp untouched when width is undefined for alignment=%s',
    (alignment) => {
      const base = resolveHeroAlignment(alignment);
      const overridden = resolveHeroAlignmentWithWidth(alignment, undefined);
      expect(overridden.innerWrapper).toBe(base.innerWrapper);
      expect(overridden.wrapper).toBe(base.wrapper);
    },
  );

  it.each(ALL_ALIGNMENTS)(
    'leaves the default clamp untouched when width is "default" for alignment=%s',
    (alignment) => {
      const base = resolveHeroAlignment(alignment);
      const overridden = resolveHeroAlignmentWithWidth(alignment, 'default');
      expect(overridden.innerWrapper).toBe(base.innerWrapper);
      expect(overridden.wrapper).toBe(base.wrapper);
    },
  );

  it.each(ALL_ALIGNMENTS)(
    'swaps in narrow clamp (max-w-2xl) for alignment=%s',
    (alignment) => {
      const a = resolveHeroAlignmentWithWidth(alignment, 'narrow');
      expect(a.innerWrapper).toContain('max-w-2xl');
      expect(a.innerWrapper).not.toContain('max-w-4xl');
      expect(a.innerWrapper).not.toContain('max-w-6xl');
    },
  );

  it.each(ALL_ALIGNMENTS)(
    'swaps in wide clamp (max-w-6xl) for alignment=%s',
    (alignment) => {
      const a = resolveHeroAlignmentWithWidth(alignment, 'wide');
      expect(a.innerWrapper).toContain('max-w-6xl');
      expect(a.innerWrapper).not.toContain('max-w-4xl');
      expect(a.innerWrapper).not.toContain('max-w-2xl');
    },
  );

  it.each(ALL_WIDTHS)('preserves the breathing-room inset under width=%s for left alignment', (width) => {
    const a = resolveHeroAlignmentWithWidth('left', width);
    expect(a.innerWrapper).toContain('lg:pl-8');
  });

  it.each(ALL_WIDTHS)('preserves the breathing-room inset under width=%s for right alignment', (width) => {
    const a = resolveHeroAlignmentWithWidth('right', width);
    expect(a.innerWrapper).toContain('lg:pr-8');
  });
});
