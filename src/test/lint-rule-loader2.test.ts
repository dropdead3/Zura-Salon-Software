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

  it('honors the inline escape hatch (eslint-disable-next-line)', async () => {
    // Distinct from loader2-allowed.tsx (which uses a file-level disable).
    // This fixture uses ONLY the inline directive — if this passes, we know
    // the documented one-line override actually works.
    const results = await eslint.lintFiles(['src/test/lint-fixtures/loader2-escape-hatch.tsx']);
    const restrictedSyntaxMessages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(restrictedSyntaxMessages).toHaveLength(0);
  });

  it('selector config matches snapshot (regression guard)', async () => {
    // Snapshots the resolved no-restricted-syntax rule config so any future
    // "harmless refactor" of the selector string fails CI loudly. The bug
    // we just fixed (`:not(:has(JSXElement))` false-negativing self-closing
    // Loader2) was syntactically valid but semantically wrong — exactly the
    // class of regression a snapshot catches that unit tests can miss.
    const config = await eslint.calculateConfigForFile(
      path.resolve(__dirname, '../../src/components/ui/BootLuxeLoader.tsx'),
    );
    expect(config.rules?.['no-restricted-syntax']).toMatchSnapshot();
  });
});
