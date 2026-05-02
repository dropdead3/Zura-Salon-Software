/**
 * Locks the migration shim that maps legacy `imageTreatment` onto the new
 * per-surface fields (`modalImageLayout`, `cornerCardImage`).
 *
 * The bug this prevents: before the split, `cover` and `hidden-on-corner`
 * rendered identically on the modal — only the corner card differed. The
 * editor surfaced both as distinct options, so operators thought one was
 * broken. Splitting into per-surface fields removes the phantom equivalence,
 * and this resolver makes sure existing rows that only have `imageTreatment`
 * still render correctly until the operator interacts with the new toggles.
 */
import { describe, it, expect } from 'vitest';
import { resolveImageRender } from './usePromotionalPopup';

const url = 'https://example.com/img.jpg';

describe('resolveImageRender', () => {
  it('returns none/none when no imageUrl', () => {
    expect(resolveImageRender({ imageUrl: undefined })).toEqual({ modal: 'none', cornerCard: 'none' });
  });

  describe('legacy imageTreatment fallback (new fields absent)', () => {
    it('cover → modal=cover, corner=top', () => {
      expect(resolveImageRender({ imageUrl: url, imageTreatment: 'cover' })).toEqual({ modal: 'cover', cornerCard: 'top' });
    });
    it('side → modal=side, corner=top', () => {
      expect(resolveImageRender({ imageUrl: url, imageTreatment: 'side' })).toEqual({ modal: 'side', cornerCard: 'top' });
    });
    it('hidden-on-corner → modal=cover, corner=none (the original intent)', () => {
      expect(resolveImageRender({ imageUrl: url, imageTreatment: 'hidden-on-corner' })).toEqual({ modal: 'cover', cornerCard: 'none' });
    });
    it('undefined legacy → defaults to cover/top', () => {
      expect(resolveImageRender({ imageUrl: url })).toEqual({ modal: 'cover', cornerCard: 'top' });
    });
  });

  describe('new fields take precedence over legacy', () => {
    it('modalImageLayout=side overrides legacy cover', () => {
      expect(resolveImageRender({ imageUrl: url, imageTreatment: 'cover', modalImageLayout: 'side' }).modal).toBe('side');
    });
    it('cornerCardImage=hide overrides legacy cover', () => {
      expect(resolveImageRender({ imageUrl: url, imageTreatment: 'cover', cornerCardImage: 'hide' }).cornerCard).toBe('none');
    });
    it('cornerCardImage=show overrides legacy hidden-on-corner', () => {
      expect(resolveImageRender({ imageUrl: url, imageTreatment: 'hidden-on-corner', cornerCardImage: 'show' }).cornerCard).toBe('top');
    });
  });

  it('per-surface fields can be set independently', () => {
    expect(resolveImageRender({ imageUrl: url, modalImageLayout: 'side', cornerCardImage: 'hide' })).toEqual({
      modal: 'side',
      cornerCard: 'none',
    });
  });
});
