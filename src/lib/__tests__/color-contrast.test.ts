/**
 * Color contrast canon — locks the contrast picks for the curated promo
 * popup accent presets and the public-site cream-lux fallback.
 *
 * Why this test exists: a future "let's tune the luminance threshold" PR
 * could silently flip CTA legibility on already-shipped popups. These
 * assertions make that flip break CI instead of breaking visitors.
 */

import { describe, expect, it } from 'vitest';
import {
  bestTextContrast,
  contrastRatio,
  pickReadableForeground,
  readableForegroundFor,
} from '@/lib/color-contrast';

describe('readableForegroundFor — curated promo accent presets', () => {
  it('"High Contrast" near-black (#111111) → white text', () => {
    expect(pickReadableForeground('#111111')).toBe('light');
    expect(readableForegroundFor('#111111')).toBe('#ffffff');
  });

  it('"Soft Neutral" warm taupe (#A1887F) → white text (luminance ≤ 0.5)', () => {
    // Luminance of #A1887F is ~0.27 → "light" foreground (white text).
    // Locks the pick so a threshold change can't flip taupe to black text
    // and silently degrade CTA legibility on shipped offers.
    expect(pickReadableForeground('#A1887F')).toBe('light');
    expect(readableForegroundFor('#A1887F')).toBe('#ffffff');
  });

  it('"House Default" (undefined) → CSS-var fallback', () => {
    // House Default leaves accentColor undefined so the renderer falls
    // through to `hsl(var(--primary))`. The contrast helper has no value
    // to parse and must defer to the theme's `--primary-foreground`.
    expect(pickReadableForeground(undefined)).toBeNull();
    expect(readableForegroundFor(undefined)).toBe('hsl(var(--primary-foreground))');
  });

  it('CSS variable refs (hsl(var(--primary))) → CSS-var fallback', () => {
    // We can't parse var() refs at runtime — must defer rather than guess.
    expect(pickReadableForeground('hsl(var(--primary))')).toBeNull();
    expect(readableForegroundFor('hsl(var(--primary))')).toBe(
      'hsl(var(--primary-foreground))',
    );
  });

  it('respects custom fallback override', () => {
    expect(readableForegroundFor(undefined, '#abcdef')).toBe('#abcdef');
  });
});

describe('readableForegroundFor — boundary + format coverage', () => {
  it('parses 3-digit hex (#fff → light bg → black text)', () => {
    expect(pickReadableForeground('#fff')).toBe('dark');
    expect(readableForegroundFor('#fff')).toBe('#111111');
  });

  it('parses hsl(...) syntax (vivid red → white text)', () => {
    expect(pickReadableForeground('hsl(0 80% 50%)')).toBe('light');
  });

  it('returns null for malformed input', () => {
    expect(pickReadableForeground('not-a-color')).toBeNull();
    expect(pickReadableForeground('')).toBeNull();
  });
});

describe('contrastRatio + bestTextContrast — WCAG floors', () => {
  it('black on white = 21:1 (max contrast)', () => {
    const r = contrastRatio('#000000', '#ffffff');
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(21, 0);
  });

  it('identical colors = 1:1 (no contrast)', () => {
    expect(contrastRatio('#7c3aed', '#7c3aed')).toBeCloseTo(1, 2);
  });

  it('returns null when either color is unparseable', () => {
    expect(contrastRatio('hsl(var(--primary))', '#000')).toBeNull();
    expect(contrastRatio('#000', undefined)).toBeNull();
  });

  it('pale yellow (#FFF080) does NOT trip the warning — high contrast vs black', () => {
    // Important behavioral note: a "weak" color like pale yellow looks
    // washed out against white but has 16:1 against black. The warning
    // fires only when *both* black AND white text fail 3:1 — which is
    // a narrow band of mid-luminance, low-saturation colors. This test
    // documents the reality so a future contributor doesn't widen the
    // warning to fire on visually-pale-but-mathematically-fine accents.
    const r = bestTextContrast('#FFF080');
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThanOrEqual(3);
  });

  it('mid-gray (#888888) clears 3:1 with black text — warning stays silent', () => {
    // Pure mid-grays look low-contrast intuitively, but black text on
    // #888 still clears WCAG's 3:1 UI floor (~5.3:1). Warning silent.
    const r = bestTextContrast('#888888');
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThanOrEqual(3);
  });

  it('curated taupe (#A1887F) clears 3:1 floor with white text', () => {
    // Confirms the "Soft Neutral" preset is safe — no warning should fire.
    const r = bestTextContrast('#A1887F');
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThanOrEqual(3);
  });

  it('near-black (#111111) easily clears 3:1 with white text', () => {
    const r = bestTextContrast('#111111');
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(15);
  });
});
