/**
 * Policy Library Content Linter — Wave 28.11.8
 *
 * Dev-time tripwire that asserts content-authoring rules on `policy_library`
 * seed data. Catches author drift before content waves ship — e.g., a
 * `requires_minors=true` policy that wasn't actually authored as a minors
 * policy, or an extension policy misfiled in the wrong category.
 *
 * Doctrine: every new `requires_*` flag must also ship a rule entry below.
 * See `mem://features/policy-os-applicability-doctrine.md`.
 *
 * The rule table is exported so future surfaces (admin badge, pre-seed CLI)
 * can consume the same source of truth.
 */
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

interface LibraryRow {
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
  applies: (row: LibraryRow) => boolean;
  assert: (row: LibraryRow) => string | null; // null = pass; string = failure message
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

describe('policy_library content linter', () => {
  it('every seeded row passes all applicable rules', async () => {
    const { data, error } = await supabase
      .from('policy_library')
      .select(
        'id, key, category, audience, title, why_it_matters, requires_extensions, requires_retail, requires_packages, requires_minors',
      );
    expect(error).toBeNull();
    const rows = (data ?? []) as LibraryRow[];
    expect(rows.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const row of rows) {
      for (const rule of POLICY_LIBRARY_LINT_RULES) {
        if (!rule.applies(row)) continue;
        const msg = rule.assert(row);
        if (msg) failures.push(`[lib:${row.key}] (${rule.id}) ${msg}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `policy_library lint failures (${failures.length}):\n${failures.join('\n')}`,
      );
    }
  });
});
