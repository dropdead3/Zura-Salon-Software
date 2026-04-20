/**
 * Policy Library Content Lint Rules — single source of truth
 *
 * Pure module with no test-framework dependencies. Imported by:
 *  - `src/__tests__/policy-library-content.test.ts` (CI tripwire)
 *  - Future admin-side dev badge / pre-seed CLI consumers
 *
 * Doctrine: every new `requires_*` flag must add a rule entry here.
 * See `mem://features/policy-os-applicability-doctrine.md` (paired-shipping rule).
 */

export interface PolicyLibraryRow {
  id: string;
  key: string;
  category: string;
  audience: string;
  title: string;
  why_it_matters: string | null;
  requires_extensions: boolean;
  requires_retail: boolean;
  requires_packages: boolean;
  requires_minors: boolean;
}

export interface PolicyLintRule {
  id: string;
  description: string;
  applies: (row: PolicyLibraryRow) => boolean;
  assert: (row: PolicyLibraryRow) => string | null; // null = pass; string = failure message
}

export const POLICY_LIBRARY_LINT_RULES: PolicyLintRule[] = [
  {
    id: 'minors-category',
    description: 'requires_minors=true must be filed under client category',
    applies: (r) => r.requires_minors === true,
    assert: (r) =>
      r.category === 'client'
        ? null
        : `requires_minors=true but category='${r.category}' (expected 'client')`,
  },
  {
    id: 'minors-rationale',
    description: 'requires_minors=true must explain minor/guardian context in why_it_matters',
    applies: (r) => r.requires_minors === true,
    assert: (r) => {
      const text = r.why_it_matters ?? '';
      return /minor|guardian|under 18/i.test(text)
        ? null
        : `requires_minors=true but why_it_matters does not mention "minor", "guardian", or "under 18"`;
    },
  },
  {
    id: 'extensions-category',
    description: 'requires_extensions=true must be filed under extensions category',
    applies: (r) => r.requires_extensions === true,
    assert: (r) =>
      r.category === 'extensions'
        ? null
        : `requires_extensions=true but category='${r.category}' (expected 'extensions')`,
  },
  {
    id: 'packages-rationale',
    description: 'requires_packages=true must mention package/membership/subscription somewhere',
    applies: (r) => r.requires_packages === true,
    assert: (r) => {
      const text = `${r.title ?? ''} ${r.why_it_matters ?? ''}`;
      return /package|membership|subscription/i.test(text)
        ? null
        : `requires_packages=true but title/why_it_matters does not mention "package", "membership", or "subscription"`;
    },
  },
  {
    id: 'multi-flag-rationale',
    description: '2+ requires_* flags set must include substantive why_it_matters explanation',
    applies: (r) => {
      const flags = [
        r.requires_extensions,
        r.requires_retail,
        r.requires_packages,
        r.requires_minors,
      ].filter(Boolean).length;
      return flags >= 2;
    },
    assert: (r) => {
      const text = r.why_it_matters ?? '';
      return text.length >= 40
        ? null
        : `multiple requires_* flags set but why_it_matters is missing or under 40 chars (got ${text.length})`;
    },
  },
];

/**
 * Pure runner — accepts any row collection (live DB rows, fixtures, CLI input)
 * and returns a flat list of failure messages. No I/O, no test infra.
 */
export function runPolicyLibraryLint(rows: PolicyLibraryRow[]): { failures: string[] } {
  const failures: string[] = [];
  for (const row of rows) {
    for (const rule of POLICY_LIBRARY_LINT_RULES) {
      if (!rule.applies(row)) continue;
      const msg = rule.assert(row);
      if (msg) failures.push(`[lib:${row.key}] (${rule.id}) ${msg}`);
    }
  }
  return { failures };
}
