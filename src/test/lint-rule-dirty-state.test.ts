// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning the brittle
 *   JSON.stringify(local) !== JSON.stringify(server)
 * dirty-state pattern.
 *
 * Why this rule exists: JSON.stringify is key-order sensitive. After a
 * save round-trip, a refetched server object can serialize to a different
 * string than the local working copy even when they're semantically
 * equal — leaving "Unsaved changes" stuck on forever (May 2026
 * hero-editor regression). Use `useDirtyState` / `isStructurallyEqual`
 * instead.
 *
 * If this test fails, the lint rule is silently broken — the worst-case
 * scenario, since the doctrine looks enforced but isn't.
 */
describe('no-restricted-syntax: dirty-state JSON.stringify compare', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    // Bypass top-level `ignores` so we can lint the intentionally-violating
    // fixture file. Without this, the rule appears to pass because ESLint
    // skipped the file entirely.
    ignore: false,
  });

  it('flags `JSON.stringify(x) !== JSON.stringify(y)`', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/dirty-state-banned.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(messages.length).toBeGreaterThanOrEqual(1);
    // Confirm the message points to the canonical replacement, not just
    // any restricted-syntax fire.
    expect(messages[0].message).toMatch(/useDirtyState|isStructurallyEqual/);
  });

  it('does not flag canonical compares (isStructurallyEqual) or single-side stringify', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/dirty-state-allowed.tsx',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(messages).toHaveLength(0);
  });
});
