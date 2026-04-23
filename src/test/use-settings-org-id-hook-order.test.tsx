/**
 * Regression coverage for the hook-safety canon enforced by `useSettingsOrgId`.
 *
 * The previous implementation early-returned before reading contexts and
 * called `useContext(PublicOrgContext)` only conditionally. That branched the
 * hook call graph by context availability and corrupted React's hook state
 * during org transitions (visible as "Should have a queue" runtime errors and
 * as theme palettes failing to commit after a picker click).
 *
 * These tests assert the canonical behavior:
 *   1. The hook calls the same hooks in the same order on every render.
 *   2. It never throws when neither provider is mounted.
 *   3. Resolution priority is: explicit > dashboard > public > undefined.
 *   4. Switching from "no org" → dashboard org does not violate hook order.
 *   5. Switching between dashboard orgs (God Mode style) does not throw.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { OrganizationContext } from '@/contexts/OrganizationContext';
import { PublicOrgContext } from '@/contexts/PublicOrgContext';
import type { Organization } from '@/hooks/useOrganizations';

const makeOrg = (id: string, slug = `org-${id}`): Organization =>
  ({ id, slug, name: `Org ${id}` }) as unknown as Organization;

function makeDashboardCtxValue(org: Organization | null) {
  return {
    currentOrganization: org,
    selectedOrganization: null,
    effectiveOrganization: org,
    isImpersonating: false,
    isMultiOrgOwner: false,
    userOrganizations: [],
    setSelectedOrganization: () => {},
    clearSelection: () => {},
    isLoading: false,
  };
}

function makePublicCtxValue(org: Organization, slug: string) {
  return {
    organization: org,
    orgSlug: slug,
    orgPath: (p?: string) => `/org/${slug}${p ?? ''}`,
  };
}

describe('useSettingsOrgId — hook-safety canon', () => {
  it('does NOT throw when no provider is mounted', () => {
    expect(() => {
      renderHook(() => useSettingsOrgId());
    }).not.toThrow();
  });

  it('returns undefined when no provider is mounted and no explicit id', () => {
    const { result } = renderHook(() => useSettingsOrgId());
    expect(result.current).toBeUndefined();
  });

  it('honors an explicit org id even with no providers', () => {
    const { result } = renderHook(() => useSettingsOrgId('explicit-1'));
    expect(result.current).toBe('explicit-1');
  });

  it('resolves to the dashboard org when OrganizationProvider supplies one', () => {
    const org = makeOrg('dash-1');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationContext.Provider value={makeDashboardCtxValue(org)}>
        {children}
      </OrganizationContext.Provider>
    );
    const { result } = renderHook(() => useSettingsOrgId(), { wrapper });
    expect(result.current).toBe('dash-1');
  });

  it('falls back to the public org when only PublicOrgContext is mounted', () => {
    const org = makeOrg('pub-1', 'pub-slug');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PublicOrgContext.Provider value={makePublicCtxValue(org, 'pub-slug')}>
        {children}
      </PublicOrgContext.Provider>
    );
    const { result } = renderHook(() => useSettingsOrgId(), { wrapper });
    expect(result.current).toBe('pub-1');
  });

  it('prefers dashboard org over public org when both are mounted', () => {
    const dash = makeOrg('dash-2');
    const pub = makeOrg('pub-2', 'pub-slug-2');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationContext.Provider value={makeDashboardCtxValue(dash)}>
        <PublicOrgContext.Provider value={makePublicCtxValue(pub, 'pub-slug-2')}>
          {children}
        </PublicOrgContext.Provider>
      </OrganizationContext.Provider>
    );
    const { result } = renderHook(() => useSettingsOrgId(), { wrapper });
    expect(result.current).toBe('dash-2');
  });

  it('prefers explicit id over both providers', () => {
    const dash = makeOrg('dash-3');
    const pub = makeOrg('pub-3', 'pub-slug-3');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationContext.Provider value={makeDashboardCtxValue(dash)}>
        <PublicOrgContext.Provider value={makePublicCtxValue(pub, 'pub-slug-3')}>
          {children}
        </PublicOrgContext.Provider>
      </OrganizationContext.Provider>
    );
    const { result } = renderHook(() => useSettingsOrgId('forced'), { wrapper });
    expect(result.current).toBe('forced');
  });

  it('does NOT change hook count when an org appears mid-session', () => {
    // Simulate the dashboard's real lifecycle: provider mounts with no org,
    // then resolves to one. Under the previous implementation this transition
    // could change the hook call graph and throw "Should have a queue".
    function Harness({ org }: { org: Organization | null }) {
      return (
        <OrganizationContext.Provider value={makeDashboardCtxValue(org)}>
          <Inner />
        </OrganizationContext.Provider>
      );
    }
    function Inner() {
      // Local state hook present BEFORE useSettingsOrgId — if useSettingsOrgId
      // changes its hook count between renders, React will detect a mismatch
      // against this slot and throw.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_n] = useState(0);
      const orgId = useSettingsOrgId();
      return <span data-testid="orgid">{orgId ?? 'NONE'}</span>;
    }

    const { rerender, container } = (function render() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { render: rtlRender } = require('@testing-library/react');
      const utils = rtlRender(<Harness org={null} />);
      return utils;
    })();

    expect(container.querySelector('[data-testid="orgid"]')!.textContent).toBe('NONE');

    expect(() => {
      rerender(<Harness org={makeOrg('lifecycle-1')} />);
    }).not.toThrow();
    expect(container.querySelector('[data-testid="orgid"]')!.textContent).toBe('lifecycle-1');

    expect(() => {
      rerender(<Harness org={makeOrg('lifecycle-2')} />);
    }).not.toThrow();
    expect(container.querySelector('[data-testid="orgid"]')!.textContent).toBe('lifecycle-2');

    expect(() => {
      rerender(<Harness org={null} />);
    }).not.toThrow();
    expect(container.querySelector('[data-testid="orgid"]')!.textContent).toBe('NONE');
  });

  it('handles God Mode style org switching without throwing', () => {
    let setOrg!: (o: Organization) => void;
    function Harness() {
      const [org, _setOrg] = useState<Organization>(makeOrg('god-a'));
      setOrg = _setOrg;
      return (
        <OrganizationContext.Provider value={makeDashboardCtxValue(org)}>
          <Probe />
        </OrganizationContext.Provider>
      );
    }
    function Probe() {
      const orgId = useSettingsOrgId();
      return <span data-testid="god">{orgId}</span>;
    }

    const { container } = (function () {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { render: rtlRender } = require('@testing-library/react');
      return rtlRender(<Harness />);
    })();

    expect(container.querySelector('[data-testid="god"]')!.textContent).toBe('god-a');

    expect(() => {
      act(() => setOrg(makeOrg('god-b')));
    }).not.toThrow();
    expect(container.querySelector('[data-testid="god"]')!.textContent).toBe('god-b');

    expect(() => {
      act(() => setOrg(makeOrg('god-c')));
    }).not.toThrow();
    expect(container.querySelector('[data-testid="god"]')!.textContent).toBe('god-c');
  });
});
