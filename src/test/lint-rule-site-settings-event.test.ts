// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning
 * `new CustomEvent('site-settings-draft-write', ...)` outside the
 * owning module (src/lib/siteSettingsDraft.ts).
 *
 * Why this rule exists: the May 2026 promo-popup snap-back regression
 * was caused by `triggerPreviewRefresh()` dispatching this event with
 * empty `{orgId, key}` detail. The empty detail triggered a broad
 * `['site-settings']` invalidation in the iframe + a refetch race that
 * snapped editor forms back to defaults.
 *
 * If this test fails, the lint rule is silently broken — the worst-case
 * scenario, since the doctrine looks enforced but isn't.
 */
describe('no-restricted-syntax: site-settings-draft-write event ownership', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
  });

  it('flags `new CustomEvent("site-settings-draft-write", ...)` outside siteSettingsDraft.ts', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/site-settings-event-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(messages.length).toBeGreaterThanOrEqual(1);
    // Confirm the message references the doctrine, not just any restricted-syntax fire.
    expect(messages[0].message).toMatch(/site-settings-draft-write|siteSettingsDraft\.ts/i);
  });

  it('does not flag unrelated CustomEvent dispatches', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/site-settings-event-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(messages).toHaveLength(0);
  });

  it('does not flag dispatches inside src/lib/siteSettingsDraft.ts (the owning module)', async () => {
    const results = await eslint.lintFiles(['src/lib/siteSettingsDraft.ts']);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    // The owning module dispatches this event multiple times by design;
    // none of them should be flagged.
    expect(messages).toHaveLength(0);
  });
});
