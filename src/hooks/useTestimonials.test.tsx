import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mocks must be hoisted before importing the hook.
const rows = [
  { id: '1', title: 'A', author: 'a', body: 'a', rating: 5, source_url: null, sort_order: 0, feature_scopes: ['homepage'] },
  { id: '2', title: 'B', author: 'b', body: 'b', rating: 5, source_url: null, sort_order: 1, feature_scopes: ['service'] },
  { id: '3', title: 'C', author: 'c', body: 'c', rating: 5, source_url: null, sort_order: 2, feature_scopes: ['stylist', 'homepage'] },
  { id: '4', title: 'D-legacy', author: 'd', body: 'd', rating: 5, source_url: null, sort_order: 3, feature_scopes: [] },
  { id: '5', title: 'E-null', author: 'e', body: 'e', rating: 5, source_url: null, sort_order: 4, feature_scopes: null },
];

vi.mock('@/integrations/supabase/client', () => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    then: (resolve: (v: { data: typeof rows; error: null }) => unknown) =>
      resolve({ data: rows, error: null }),
  };
  return {
    supabase: {
      from: () => builder,
    },
  };
});

vi.mock('./useSettingsOrgId', () => ({
  useSettingsOrgId: () => 'org-1',
}));

import { useVisibleTestimonials } from './useTestimonials';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useVisibleTestimonials placement scope', () => {
  beforeEach(() => vi.clearAllMocks());

  it('homepage scope includes legacy rows (empty/null feature_scopes)', async () => {
    const { result } = renderHook(() => useVisibleTestimonials('general', 'homepage'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const ids = (result.current.data ?? []).map((r: any) => r.id).sort();
    expect(ids).toEqual(['1', '3', '4', '5']);
  });

  it('service scope excludes legacy rows', async () => {
    const { result } = renderHook(() => useVisibleTestimonials('general', 'service'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const ids = (result.current.data ?? []).map((r: any) => r.id);
    expect(ids).toEqual(['2']);
  });

  it('stylist scope returns only rows that opt in', async () => {
    const { result } = renderHook(() => useVisibleTestimonials('general', 'stylist'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const ids = (result.current.data ?? []).map((r: any) => r.id);
    expect(ids).toEqual(['3']);
  });

  it('back-compat: 2nd arg as explicit orgId still works (defaults to homepage)', async () => {
    const { result } = renderHook(
      () => useVisibleTestimonials('general', '00000000-0000-0000-0000-000000000000'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    const ids = (result.current.data ?? []).map((r: any) => r.id).sort();
    expect(ids).toEqual(['1', '3', '4', '5']);
  });
});
