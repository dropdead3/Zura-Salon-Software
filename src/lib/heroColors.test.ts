/**
 * Auto-contrast tone fallback regression — locks the table documented in
 * `mem://style/hero-alignment-canon`. A "tidy-up" that reverts these
 * fallbacks to `text-muted-foreground` would make hero notes / eyebrow
 * near-invisible on dark photo backgrounds (the May 2026 trap).
 */
import { describe, it, expect } from 'vitest';
import { resolveHeroColors } from './heroColors';

describe('resolveHeroColors — auto-contrast tone fallback', () => {
  describe('over media (hasBackground = true)', () => {
    const r = resolveHeroColors({}, true);

    it('headline → text-white', () => {
      expect(r.headlineClass).toBe('text-white');
    });
    it('subheadline → text-white/80', () => {
      expect(r.subheadlineClass).toBe('text-white/80');
    });
    it('eyebrow → text-white/70', () => {
      expect(r.eyebrowToneClass).toBe('text-white/70');
    });
    it('notes → text-white/70', () => {
      expect(r.notesToneClass).toBe('text-white/70');
    });
  });

  describe('over theme background (hasBackground = false)', () => {
    const r = resolveHeroColors({}, false);

    it('headline → text-foreground', () => {
      expect(r.headlineClass).toBe('text-foreground');
    });
    it('subheadline → text-muted-foreground', () => {
      expect(r.subheadlineClass).toBe('text-muted-foreground');
    });
    it('eyebrow → text-muted-foreground', () => {
      expect(r.eyebrowToneClass).toBe('text-muted-foreground');
    });
    it('notes → text-muted-foreground', () => {
      expect(r.notesToneClass).toBe('text-muted-foreground');
    });
  });

  it('explicit override clears the tone class so inline style wins', () => {
    const r = resolveHeroColors({ eyebrow: '#ff0000', notes: '#00ff00' }, true);
    expect(r.eyebrowToneClass).toBe('');
    expect(r.notesToneClass).toBe('');
    expect(r.eyebrowStyle).toEqual({ color: '#ff0000' });
    expect(r.notesStyle).toEqual({ color: '#00ff00' });
  });
});
