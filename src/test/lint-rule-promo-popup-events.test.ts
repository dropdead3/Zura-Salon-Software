// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rules banning
 * `new CustomEvent('promo-popup-preview-reset' | 'promo-popup-preview-state', ...)`
 * outside the owning module (`src/lib/promoPopupPreviewReset.ts`).
 *
 * Mirrors `lint-rule-site-settings-event.test.ts`. If this test fails,
 * the lint rule is silently broken — the doctrine looks enforced but
 * isn't, which is exactly the failure mode that allowed the original
 * site-settings empty-detail regression.
 */
describe('no-restricted-syntax: promo-popup preview event ownership', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    // Bypass top-level `ignores` so we can lint the intentionally-violating
    // fixture file. Without this, the rule appears to pass because ESLint
    // skipped the file entirely.
    ignore: false,
  });

  it('flags both banned dispatches in the fixture', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/promo-popup-events-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    // Two violations expected — one per event.
    expect(messages.length).toBeGreaterThanOrEqual(2);
    const text = messages.map((m) => m.message).join('\n');
    expect(text).toMatch(/promo-popup-preview-reset/);
    expect(text).toMatch(/promo-popup-preview-state/);
  });

  it('does not flag dispatches inside the owning module', async () => {
    const results = await eslint.lintFiles(['src/lib/promoPopupPreviewReset.ts']);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    // The owning module dispatches both events by design with inline
    // `eslint-disable-next-line` comments; none should be flagged.
    expect(messages).toHaveLength(0);
  });
});
