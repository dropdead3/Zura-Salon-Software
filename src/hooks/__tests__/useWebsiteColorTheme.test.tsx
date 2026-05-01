/**
 * Regression coverage for the May 2026 "Site Theme picker won't go back to
 * Cream Lux" report. Two invariants must hold:
 *
 *  1. `useUpdateWebsiteColorTheme().mutateAsync(theme)` writes the new value
 *     into BOTH the draft and live React Query cache keys synchronously,
 *     before the underlying mutation resolves. Without this, the picker
 *     ring stays stuck on the previous theme until the network refetch lands.
 *
 *  2. The mutation forwards to `useUpdateSiteSetting` with the canonical
 *     `website_active_color_theme` key + `{ theme }` shape — guarding against
 *     anyone "simplifying" the wrapper into a string-shaped payload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const ORG_ID = 'org-test-1';
const SETTING_KEY = 'website_active_color_theme';

const mutateAsyncMock = vi.fn();

vi.mock('@/hooks/useSettingsOrgId', () => ({
  useSettingsOrgId: () => ORG_ID,
}));

vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({ data: undefined, isLoading: false }),
  useUpdateSiteSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

import { useUpdateWebsiteColorTheme } from '../useWebsiteColorTheme';

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateWebsiteColorTheme', () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue(undefined);
  });

  it('optimistically writes the new theme into BOTH draft and live caches before the mutation resolves', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Seed both cache keys with a stale theme so we can detect the optimistic write.
    qc.setQueryData(['site-settings', ORG_ID, SETTING_KEY, 'draft'], { theme: 'neon' });
    qc.setQueryData(['site-settings', ORG_ID, SETTING_KEY, 'live'], { theme: 'neon' });

    // Pause the mutation so we can inspect the cache mid-flight.
    let resolveMutation!: () => void;
    mutateAsyncMock.mockImplementation(
      () => new Promise<void>((r) => { resolveMutation = r; }),
    );

    const { result } = renderHook(() => useUpdateWebsiteColorTheme(), {
      wrapper: makeWrapper(qc),
    });

    let inflight: Promise<unknown>;
    act(() => {
      inflight = result.current.mutateAsync('cream-lux');
    });

    // The optimistic cache writes happen synchronously inside mutateAsync,
    // BEFORE the await on the underlying useUpdateSiteSetting mutation resolves.
    expect(qc.getQueryData(['site-settings', ORG_ID, SETTING_KEY, 'draft']))
      .toEqual({ theme: 'cream-lux' });
    expect(qc.getQueryData(['site-settings', ORG_ID, SETTING_KEY, 'live']))
      .toEqual({ theme: 'cream-lux' });

    resolveMutation();
    await inflight!;
  });

  it('forwards to useUpdateSiteSetting with the canonical key + { theme } shape', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useUpdateWebsiteColorTheme(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync('marine');
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      key: SETTING_KEY,
      value: { theme: 'marine' },
    });
  });

  it('writes optimistically even when re-issuing the same theme (recovery from stale state)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['site-settings', ORG_ID, SETTING_KEY, 'draft'], { theme: 'cream-lux' });

    const { result } = renderHook(() => useUpdateWebsiteColorTheme(), {
      wrapper: makeWrapper(qc),
    });

    // Re-click cream-lux. The hook MUST still issue the mutation and write
    // the cache — there is no `if (id === current) return` short-circuit.
    await act(async () => {
      await result.current.mutateAsync('cream-lux');
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(['site-settings', ORG_ID, SETTING_KEY, 'draft']))
      .toEqual({ theme: 'cream-lux' });
  });
});
