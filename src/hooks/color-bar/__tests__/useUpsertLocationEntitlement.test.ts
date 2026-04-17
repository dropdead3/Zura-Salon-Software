/**
 * Data Integrity: transition matrix tests for the per-location entitlement
 * upsert path. The reconciliation gate is invariant — if it regresses,
 * supply-low alerts resume on stale quantities after a tracking gap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Captured payload + injectable existing row state.
let capturedUpsertPayload: any = null;
let existingRow: { id: string; activated_at: string | null; status: string } | null = null;

vi.mock('@/integrations/supabase/client', () => {
  // The mutation chain:
  //   supabase.from(...).select(...).eq(...).eq(...).maybeSingle()
  //   supabase.from(...).upsert(payload, opts).select().single()
  const buildSelectChain = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () =>
        Promise.resolve({ data: existingRow, error: null }),
    };
    return chain;
  };
  const buildUpsertChain = (payload: any) => {
    capturedUpsertPayload = payload;
    return {
      select: () => ({
        single: () => Promise.resolve({ data: { ...payload, id: 'new-row' }, error: null }),
      }),
    };
  };
  return {
    supabase: {
      from: () => ({
        select: () => buildSelectChain().select(),
        eq: (..._args: any[]) => buildSelectChain().eq(),
        upsert: (payload: any, _opts: any) => buildUpsertChain(payload),
      }),
    },
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useUpsertLocationEntitlement } from '../useColorBarLocationEntitlements';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const baseParams = {
  organization_id: 'org-1',
  location_id: 'loc-1',
};

beforeEach(() => {
  capturedUpsertPayload = null;
  existingRow = null;
});

describe('useUpsertLocationEntitlement — transition matrix', () => {
  it('(no row) → active: stamps activated_at, no reconciliation flag', async () => {
    existingRow = null;
    const { result } = renderHook(() => useUpsertLocationEntitlement(), { wrapper });
    await result.current.mutateAsync({ ...baseParams, status: 'active' });
    await waitFor(() => expect(capturedUpsertPayload).not.toBeNull());

    expect(capturedUpsertPayload.activated_at).toBeTruthy();
    expect(capturedUpsertPayload.requires_inventory_reconciliation).toBeUndefined();
    expect(capturedUpsertPayload.reactivated_at).toBeUndefined();
    expect(capturedUpsertPayload.status).toBe('active');
  });

  it('active → active: does NOT overwrite activated_at, no flag flip', async () => {
    existingRow = { id: 'existing', activated_at: '2024-01-01T00:00:00Z', status: 'active' };
    const { result } = renderHook(() => useUpsertLocationEntitlement(), { wrapper });
    await result.current.mutateAsync({ ...baseParams, status: 'active' });
    await waitFor(() => expect(capturedUpsertPayload).not.toBeNull());

    expect(capturedUpsertPayload.activated_at).toBeUndefined();
    expect(capturedUpsertPayload.requires_inventory_reconciliation).toBeUndefined();
    expect(capturedUpsertPayload.reactivated_at).toBeUndefined();
  });

  it('suspended → active: stamps reactivated_at, flips reconciliation gate', async () => {
    existingRow = { id: 'existing', activated_at: '2024-01-01T00:00:00Z', status: 'suspended' };
    const { result } = renderHook(() => useUpsertLocationEntitlement(), { wrapper });
    await result.current.mutateAsync({ ...baseParams, status: 'active' });
    await waitFor(() => expect(capturedUpsertPayload).not.toBeNull());

    expect(capturedUpsertPayload.reactivated_at).toBeTruthy();
    expect(capturedUpsertPayload.requires_inventory_reconciliation).toBe(true);
    expect(capturedUpsertPayload.inventory_verified_at).toBeNull();
    expect(capturedUpsertPayload.inventory_verified_by).toBeNull();
    expect(capturedUpsertPayload.activated_at).toBeUndefined();
  });

  it('active → suspended: writes status, no reconciliation flag (gate fires only on reactivation)', async () => {
    existingRow = { id: 'existing', activated_at: '2024-01-01T00:00:00Z', status: 'active' };
    const { result } = renderHook(() => useUpsertLocationEntitlement(), { wrapper });
    await result.current.mutateAsync({ ...baseParams, status: 'suspended' });
    await waitFor(() => expect(capturedUpsertPayload).not.toBeNull());

    expect(capturedUpsertPayload.status).toBe('suspended');
    expect(capturedUpsertPayload.requires_inventory_reconciliation).toBeUndefined();
    expect(capturedUpsertPayload.reactivated_at).toBeUndefined();
    expect(capturedUpsertPayload.activated_at).toBeUndefined();
  });
});
