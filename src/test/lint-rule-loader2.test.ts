// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning <Loader2 /> outside
 * button contexts. Asserts the rule fires on the banned fixture and stays
 * silent on the allowed fixture. If this test fails, the lint rule is
 * silently broken — the worst-case scenario, since the doctrine looks
 * enforced but isn't.
 */
describe('no-restricted-syntax: Loader2 ban', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
  });

  it('flags Loader2 used outside button contexts', async () => {
    const results = await eslint.lintFiles(['src/test/lint-fixtures/loader2-banned.tsx']);
    const restrictedSyntaxMessages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(restrictedSyntaxMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag Loader2 nested inside Button / button / *Button components', async () => {
    const results = await eslint.lintFiles(['src/test/lint-fixtures/loader2-allowed.tsx']);
    const restrictedSyntaxMessages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(restrictedSyntaxMessages).toHaveLength(0);
  });
});
