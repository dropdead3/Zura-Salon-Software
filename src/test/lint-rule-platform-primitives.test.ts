// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-imports rule banning raw shadcn
 * primitives in `src/components/platform/**` and
 * `src/pages/dashboard/platform/**`. Asserts the rule fires on the
 * banned fixture, stays silent on the allowed fixture, and does NOT
 * fire on equivalent imports outside the platform scope.
 *
 * If this test fails, the platform-theme-isolation gate is silently
 * broken — the worst-case scenario, since the doctrine looks enforced
 * but isn't.
 */
describe('no-restricted-imports: platform-primitive isolation', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
  });

  it('flags raw shadcn primitive imports inside src/components/platform/**', async () => {
    const results = await eslint.lintFiles([
      'src/components/platform/__lint-fixtures__/raw-primitive-banned.tsx',
    ]);
    const restrictedImportMessages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-imports');
    // Two banned imports in the fixture (checkbox + switch).
    expect(restrictedImportMessages.length).toBeGreaterThanOrEqual(2);
    // Sanity-check the message points at the Platform* wrapper.
    expect(restrictedImportMessages[0].message).toMatch(/Platform/);
  });

  it('does not flag Platform* wrapper imports inside the platform scope', async () => {
    const results = await eslint.lintFiles([
      'src/components/platform/__lint-fixtures__/raw-primitive-allowed.tsx',
    ]);
    const restrictedImportMessages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-imports');
    expect(restrictedImportMessages).toHaveLength(0);
  });

  it('does not flag raw shadcn imports OUTSIDE the platform scope', async () => {
    // Critical scoping check. A leaky `files:` glob would silently ban
    // raw primitives across the whole dashboard, breaking everything.
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/platform-primitive-outside-scope.tsx',
    ]);
    const restrictedImportMessages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-imports');
    expect(restrictedImportMessages).toHaveLength(0);
  });

  it('selector config matches snapshot (regression guard)', async () => {
    // Snapshots the resolved no-restricted-imports rule config so any
    // future "harmless refactor" of the path list fails CI loudly. Same
    // pattern as the Loader2 canon snapshot test.
    const config = await eslint.calculateConfigForFile(
      path.resolve(
        __dirname,
        '../../src/components/platform/ui/PlatformCheckbox.tsx',
      ),
    );
    expect(config.rules?.['no-restricted-imports']).toMatchSnapshot();
  });
});
