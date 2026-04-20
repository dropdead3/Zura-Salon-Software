/**
 * Policy Library Content Linter — Wave 28.11.8
 *
 * Two-tier dev-time tripwire:
 *  1. **Pure rule-logic suite** (always runs in CI) — exercises each lint rule's
 *     pass and fail path against synthetic rows. No DB. Author drift in the
 *     RULE definitions fails the build.
 *  2. **Live seed integration suite** (skipped without Supabase env) — fetches
 *     `policy_library` and asserts every seeded row passes. Author drift in
 *     SEEDED CONTENT fails locally with creds; in CI without secrets it skips
 *     silently rather than false-failing.
 *
 * Rules + helper live in `src/lib/policy/lint-rules.ts` so future surfaces
 * (admin badge, pre-seed CLI) can consume them without dragging in vitest.
 *
 * See `mem://features/policy-os-applicability-doctrine.md` (paired-shipping rule).
 */
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  POLICY_LIBRARY_LINT_RULES,
  runPolicyLibraryLint,
  type PolicyLibraryRow,
} from '@/lib/policy/lint-rules';

// Re-export for backward compatibility / discoverability from the test path.
export { POLICY_LIBRARY_LINT_RULES, type PolicyLibraryRow };

// ---------------------------------------------------------------------------
// Tier 1 — pure rule logic (always runs)
// ---------------------------------------------------------------------------

const baseRow = (overrides: Partial<PolicyLibraryRow> = {}): PolicyLibraryRow => ({
  id: 'fixture-id',
  key: 'fixture_key',
  category: 'client',
  audience: 'external',
  title: 'Fixture Policy',
  why_it_matters: null,
  requires_extensions: false,
  requires_retail: false,
  requires_packages: false,
  requires_minors: false,
  ...overrides,
});

describe('rule logic — pure', () => {
  it('exposes a stable rule registry', () => {
    const ids = POLICY_LIBRARY_LINT_RULES.map((r) => r.id).sort();
    expect(ids).toEqual([
      'extensions-category',
      'minors-category',
      'minors-rationale',
      'multi-flag-rationale',
      'packages-rationale',
    ]);
  });

  it('passes a clean row with no requires_* flags', () => {
    const { failures } = runPolicyLibraryLint([baseRow()]);
    expect(failures).toEqual([]);
  });

  describe('minors-category', () => {
    it('passes when requires_minors=true and category=client', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          requires_minors: true,
          category: 'client',
          why_it_matters: 'Guardians must consent for minors under 18.',
        }),
      ]);
      expect(failures).toEqual([]);
    });

    it('fails when requires_minors=true but category is wrong', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          key: 'minor_misfiled',
          requires_minors: true,
          category: 'extensions',
          why_it_matters: 'Guardian consent required for minors.',
        }),
      ]);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('minors-category');
      expect(failures[0]).toContain('minor_misfiled');
    });
  });

  describe('minors-rationale', () => {
    it('fails when why_it_matters lacks minor/guardian/under 18', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          key: 'minor_no_rationale',
          requires_minors: true,
          category: 'client',
          why_it_matters: 'A generic explanation with no protected keywords.',
        }),
      ]);
      expect(failures.some((f) => f.includes('minors-rationale'))).toBe(true);
    });

    it('passes when rationale mentions "guardian" (case-insensitive)', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          requires_minors: true,
          category: 'client',
          why_it_matters: 'Requires Guardian sign-off.',
        }),
      ]);
      expect(failures).toEqual([]);
    });
  });

  describe('extensions-category', () => {
    it('fails when requires_extensions=true but category != extensions', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          key: 'ext_misfiled',
          requires_extensions: true,
          category: 'client',
        }),
      ]);
      expect(failures.some((f) => f.includes('extensions-category'))).toBe(true);
    });
  });

  describe('packages-rationale', () => {
    it('fails when requires_packages=true but no keyword in title/why', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          key: 'pkg_no_rationale',
          requires_packages: true,
          title: 'Service Terms',
          why_it_matters: 'Standard terms of service.',
        }),
      ]);
      expect(failures.some((f) => f.includes('packages-rationale'))).toBe(true);
    });

    it('passes when title mentions "membership"', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          requires_packages: true,
          title: 'Membership Renewal Terms',
          why_it_matters: 'Standard terms.',
        }),
      ]);
      expect(failures).toEqual([]);
    });
  });

  describe('multi-flag-rationale', () => {
    it('fails when 2+ flags set with thin why_it_matters', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          key: 'multi_thin',
          requires_extensions: true,
          requires_retail: true,
          category: 'extensions',
          why_it_matters: 'short.',
        }),
      ]);
      expect(failures.some((f) => f.includes('multi-flag-rationale'))).toBe(true);
    });

    it('passes when 2+ flags ship with substantive (>=40 char) rationale', () => {
      const { failures } = runPolicyLibraryLint([
        baseRow({
          requires_extensions: true,
          requires_retail: true,
          category: 'extensions',
          why_it_matters:
            'Extension aftercare requires retail product compliance for warranty coverage.',
        }),
      ]);
      expect(failures).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Tier 2 — live seed integration (skipped without Supabase env vars)
// ---------------------------------------------------------------------------

const hasSupabaseEnv =
  typeof import.meta !== 'undefined' &&
  !!(import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL;

describe.skipIf(!hasSupabaseEnv)('policy_library content linter — live seed', () => {
  it('every seeded row passes all applicable rules', async () => {
    const { data, error } = await supabase
      .from('policy_library')
      .select(
        'id, key, category, audience, title, why_it_matters, requires_extensions, requires_retail, requires_packages, requires_minors',
      );
    expect(error).toBeNull();
    const rows = (data ?? []) as PolicyLibraryRow[];

    // RLS guard: when the test runs without an authenticated session, the
    // anon role may return zero rows. Skip the assertion rather than
    // false-fail — the pure rule tier still protects rule definitions.
    if (rows.length === 0) {
      console.warn('[lint:live] policy_library returned 0 rows (RLS or empty table) — skipping seed assertion');
      return;
    }

    const { failures } = runPolicyLibraryLint(rows);
    if (failures.length > 0) {
      throw new Error(
        `policy_library lint failures (${failures.length}):\n${failures.join('\n')}`,
      );
    }
  });
});
