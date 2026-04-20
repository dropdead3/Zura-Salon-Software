/**
 * Smoke spec for `computeHiddenByReason` — locks the
 * `applicabilityReason().service` key contract.
 *
 * If someone renames a service key (e.g. 'minors' → 'underage') without
 * updating the doctrine + Library hidden-chip JSX + this test, the
 * regression fails loudly here.
 */
import { describe, it, expect } from 'vitest';
import { computeHiddenByReason } from '@/lib/policy/applicability-summary';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import type { PolicyOrgProfile } from '@/hooks/policy/usePolicyOrgProfile';

// Minimal entry factory — only the fields touched by `isApplicableToProfile`
// + `applicabilityReason` matter for this helper.
const entry = (overrides: Partial<PolicyLibraryEntry> = {}): PolicyLibraryEntry =>
  ({
    id: 'e',
    key: 'k',
    category: 'client',
    audience: 'external',
    title: 't',
    why_it_matters: null,
    requires_extensions: false,
    requires_retail: false,
    requires_packages: false,
    requires_minors: false,
    recommendation: 'recommended',
    ...overrides,
  }) as PolicyLibraryEntry;

const profile = (overrides: Partial<PolicyOrgProfile> = {}): PolicyOrgProfile =>
  ({
    organization_id: 'org-1',
    offers_extensions: true,
    offers_retail: true,
    offers_packages: true,
    offers_memberships: true,
    serves_minors: true,
    setup_completed_at: new Date().toISOString(),
    ...overrides,
  }) as PolicyOrgProfile;

describe('computeHiddenByReason', () => {
  it('groups 3 hidden entries across 2 services with correct counts + labels', () => {
    const library = [
      entry({ key: 'ext_a', requires_extensions: true }),
      entry({ key: 'ext_b', requires_extensions: true }),
      entry({ key: 'minor_a', requires_minors: true }),
    ];
    const result = computeHiddenByReason(
      library,
      profile({ offers_extensions: false, serves_minors: false }),
    );
    expect(result).toEqual({
      extensions: { count: 2, label: 'extensions' },
      minors: { count: 1, label: 'minors (under 18)' },
    });
  });

  it('returns {} when all entries are applicable', () => {
    const library = [
      entry({ requires_extensions: true }),
      entry({ requires_retail: true }),
    ];
    const result = computeHiddenByReason(library, profile());
    expect(result).toEqual({});
  });

  it('returns {} when profile is null (silence over wrong number)', () => {
    const library = [
      entry({ requires_extensions: true }),
      entry({ requires_minors: true }),
    ];
    expect(computeHiddenByReason(library, null)).toEqual({});
    expect(computeHiddenByReason(library, undefined)).toEqual({});
  });

  it('returns single key when only one service hides entries (lets JSX drop colon segment)', () => {
    const library = [
      entry({ key: 'ext_a', requires_extensions: true }),
      entry({ key: 'ext_b', requires_extensions: true }),
      entry({ key: 'ok', requires_retail: true }),
    ];
    const result = computeHiddenByReason(
      library,
      profile({ offers_extensions: false }),
    );
    expect(Object.keys(result)).toEqual(['extensions']);
    expect(result.extensions.count).toBe(2);
  });
});
