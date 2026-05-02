import { describe, it, expect } from 'vitest';
import {
  enforceCap,
  snapshotConfig,
  SAVED_PROMO_CAP,
  type SavedPromo,
} from './usePromoLibrary';
import { DEFAULT_PROMO_POPUP } from './usePromotionalPopup';

// ── Library lock tests ──
//
// Pure helpers only. The hook itself is a thin wrapper around the existing
// site-settings draft pattern (already covered by siteSettingsDraft.test.ts);
// what's worth locking here is the cap enforcement + the snapshot contract
// (no `enabled` ever leaks back into a snapshot — that's the auto-publish
// trap the doctrine forbids).

const mkPromo = (overrides: Partial<SavedPromo> = {}): SavedPromo => ({
  id: crypto.randomUUID(),
  name: 'Promo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  config: snapshotConfig(DEFAULT_PROMO_POPUP),
  ...overrides,
});

describe('snapshotConfig', () => {
  it('strips `enabled` from the saved snapshot (no auto-publish on reload)', () => {
    const enabled = { ...DEFAULT_PROMO_POPUP, enabled: true };
    const snap = snapshotConfig(enabled);
    expect((snap as Record<string, unknown>).enabled).toBeUndefined();
  });

  it('preserves every other field', () => {
    const snap = snapshotConfig(DEFAULT_PROMO_POPUP);
    expect(snap.headline).toBe(DEFAULT_PROMO_POPUP.headline);
    expect(snap.appearance).toBe(DEFAULT_PROMO_POPUP.appearance);
    expect(snap.frequency).toBe(DEFAULT_PROMO_POPUP.frequency);
  });
});

describe('enforceCap', () => {
  it('returns the list unchanged when below cap', () => {
    const list = [mkPromo(), mkPromo()];
    expect(enforceCap(list)).toHaveLength(2);
  });

  it('drops the oldest by updatedAt when over cap', () => {
    const list: SavedPromo[] = [];
    for (let i = 0; i < SAVED_PROMO_CAP + 3; i++) {
      list.push(
        mkPromo({
          name: `Promo ${i}`,
          updatedAt: new Date(2026, 0, 1, 0, i).toISOString(),
        }),
      );
    }
    const trimmed = enforceCap(list);
    expect(trimmed).toHaveLength(SAVED_PROMO_CAP);
    // Oldest entries (Promo 0, 1, 2) should be the ones evicted.
    expect(trimmed.find((p) => p.name === 'Promo 0')).toBeUndefined();
    expect(trimmed.find((p) => p.name === 'Promo 1')).toBeUndefined();
    expect(trimmed.find((p) => p.name === 'Promo 2')).toBeUndefined();
    // Newest entry should survive.
    expect(trimmed.find((p) => p.name === `Promo ${SAVED_PROMO_CAP + 2}`)).toBeDefined();
  });

  it('respects a custom cap', () => {
    const list = [mkPromo(), mkPromo(), mkPromo()];
    expect(enforceCap(list, 2)).toHaveLength(2);
  });
});
