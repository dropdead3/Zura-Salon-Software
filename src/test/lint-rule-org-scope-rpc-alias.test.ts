// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import path from 'path';

/**
 * Smoke test for the no-restricted-syntax rule banning the
 *   .rpc('is_org_admin' | 'is_org_member', { _organization_id: ... })
 * alias. The Postgres helpers expect `_org_id`; passing `_organization_id`
 * silently returns NULL and authorization falls through.
 *
 * Belt + suspenders with `src/test/edge-fn-org-scope-rpc-contract.test.ts`:
 *   - The contract test scans every edge fn at `bun run test`.
 *   - This ESLint rule fires on save, in src/ + scripts/ + anywhere
 *     ESLint runs (edge fns are ignored from frontend lint, but the
 *     rule is global so any future client-side caller is also caught).
 */
describe('no-restricted-syntax: is_org_admin / is_org_member arg alias', () => {
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '../..'),
    overrideConfigFile: path.resolve(__dirname, '../..', 'eslint.config.js'),
    ignore: false,
  });

  it('flags `.rpc("is_org_admin", { _organization_id })` and the is_org_member variant', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/org-scope-rpc-alias-banned.ts',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    // Two banned calls in the fixture (admin + member variant).
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0].message).toMatch(/_org_id/);
  });

  it('does not flag canonical `_org_id` calls', async () => {
    const results = await eslint.lintFiles([
      'src/test/lint-fixtures/org-scope-rpc-alias-allowed.ts',
    ]);
    const messages = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(messages).toHaveLength(0);
  });
});
