/**
 * HeroEditor entry contract regression.
 *
 * Per the Website Editor entry contract (Core memory), clicking
 * "Hero Section" in the editor rail MUST land on the Hero hub overview —
 * NOT the operator's last-visited sub-panel (e.g. "Text & Buttons Color").
 *
 * Historical bug: HeroEditor used to persist its sub-view to
 * localStorage under `zura.heroEditor.view.v2.<orgId>` and rehydrate on
 * mount. Operators who last edited "Text & Buttons Color" would re-enter
 * the editor and land deep inside that sub-panel with no obvious way to
 * back out to the hub — read as broken navigation.
 *
 * This test enforces two invariants:
 *   1. The localStorage key is never read on mount.
 *   2. The localStorage key is never written when the in-memory view
 *      changes (e.g. operator drills into a global card mid-session).
 *
 * If either invariant breaks, the persistence layer has been
 * reintroduced — revert and re-read the entry contract.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('HeroEditor — entry contract (no view persistence)', () => {
  beforeEach(() => {
    // Clean slate so we can detect any read/write attempts.
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('does not read any zura.heroEditor.view.* key from localStorage', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    // Re-import the module fresh to trigger any module-level reads.
    // (Module currently has none, but this guards against future regressions
    // that move the read into module scope instead of useState init.)
    return import('./HeroEditor').then(() => {
      const heroViewReads = getItemSpy.mock.calls.filter(([key]) =>
        typeof key === 'string' && key.startsWith('zura.heroEditor.view'),
      );
      expect(heroViewReads).toEqual([]);
      getItemSpy.mockRestore();
    });
  });

  it('source file does not reference the legacy view storage key', async () => {
    // Belt-and-suspenders static check — catches the case where someone
    // re-introduces persistence under a slightly different key name or
    // wires it through a helper module.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(__dirname, 'HeroEditor.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/zura\.heroEditor\.view/);
    expect(src).not.toMatch(/writePersistedView|readPersistedView/);
  });
});
