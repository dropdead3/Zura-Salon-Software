import { describe, it, expect } from 'vitest';
import { resolveScrim } from './heroScrim';

describe('resolveScrim', () => {
  it('uses section default when slide override is null/null', () => {
    expect(
      resolveScrim({
        slideStyle: null,
        slideStrength: null,
        sectionStyle: 'flat',
        sectionStrength: 0.8,
      }),
    ).toEqual({ style: 'flat', strength: 0.8 });
  });

  it('uses slide override when present', () => {
    expect(
      resolveScrim({
        slideStyle: 'vignette',
        slideStrength: 0.4,
        sectionStyle: 'gradient-bottom',
        sectionStrength: 0.55,
      }),
    ).toEqual({ style: 'vignette', strength: 0.4 });
  });

  it('treats slide strength of 0 paired with a non-none style as inherit (heals legacy data)', () => {
    // This was the bug: 3 of 4 slides had `scrim_strength: 0` paired with
    // `scrim_style: 'gradient-bottom'`, which silently shadowed the
    // section-level strength (1.0) and made the section slider feel inert.
    expect(
      resolveScrim({
        slideStyle: 'gradient-bottom',
        slideStrength: 0,
        sectionStyle: 'gradient-bottom',
        sectionStrength: 1,
      }),
    ).toEqual({ style: 'gradient-bottom', strength: 1 });
  });

  it('respects an explicit `none` style (operator chose to suppress the scrim)', () => {
    expect(
      resolveScrim({
        slideStyle: 'none',
        slideStrength: 0,
        sectionStyle: 'gradient-bottom',
        sectionStrength: 1,
      }),
    ).toEqual({ style: 'none', strength: 0 });
  });

  it('respects a non-zero slide strength even if the slide style matches section', () => {
    expect(
      resolveScrim({
        slideStyle: 'flat',
        slideStrength: 0.2,
        sectionStyle: 'flat',
        sectionStrength: 0.8,
      }),
    ).toEqual({ style: 'flat', strength: 0.2 });
  });

  it('falls back to defaults when both slide and section are null', () => {
    expect(
      resolveScrim({
        slideStyle: null,
        slideStrength: null,
        sectionStyle: null,
        sectionStrength: null,
      }),
    ).toEqual({ style: 'gradient-bottom', strength: 0.55 });
  });
});
