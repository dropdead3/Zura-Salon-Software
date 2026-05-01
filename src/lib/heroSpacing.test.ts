import { describe, expect, it } from 'vitest';
import {
  resolveHeroSpacing,
  HERO_SPACING_PRESETS,
  COMPACT_FORCE_BREAKPOINT,
  type HeroSpacingDensity,
} from '@/lib/heroSpacing';

describe('heroSpacing canon', () => {
  it('returns the compact preset by default when density is undefined/null', () => {
    expect(resolveHeroSpacing(undefined)).toEqual(resolveHeroSpacing('compact'));
    expect(resolveHeroSpacing(null)).toEqual(resolveHeroSpacing('compact'));
  });

  it('returns distinct class sets for each density', () => {
    const compact = resolveHeroSpacing('compact');
    const standard = resolveHeroSpacing('standard');
    const airy = resolveHeroSpacing('airy');
    expect(compact).not.toEqual(standard);
    expect(standard).not.toEqual(airy);
    expect(compact).not.toEqual(airy);
  });

  it.each<HeroSpacingDensity>(['compact', 'standard', 'airy'])(
    'forceCompact overrides %s and returns the compact preset',
    (density) => {
      expect(resolveHeroSpacing(density, true)).toEqual(resolveHeroSpacing('compact'));
    },
  );

  it('exposes a presets array that mirrors the resolver', () => {
    const ids = HERO_SPACING_PRESETS.map((p) => p.id);
    expect(ids).toEqual(['compact', 'standard', 'airy']);
    for (const { id } of HERO_SPACING_PRESETS) {
      // resolver must accept every advertised preset
      expect(resolveHeroSpacing(id)).toBeDefined();
    }
  });

  it('exports a numeric COMPACT_FORCE_BREAKPOINT', () => {
    expect(typeof COMPACT_FORCE_BREAKPOINT).toBe('number');
    expect(COMPACT_FORCE_BREAKPOINT).toBeGreaterThan(0);
  });

  it('every preset returns the four canonical class keys', () => {
    for (const { id } of HERO_SPACING_PRESETS) {
      const cls = resolveHeroSpacing(id);
      expect(cls).toMatchObject({
        eyebrow: expect.any(String),
        subheadline: expect.any(String),
        cta: expect.any(String),
        notesGap: expect.any(String),
      });
    }
  });
});
