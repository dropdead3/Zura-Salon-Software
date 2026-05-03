/**
 * Reputation Platform Console — kill-switch + audit-write contract.
 *
 * Locks the two invariants that the wave 2/3 plan depends on:
 *   1. Engaging a kill switch writes the row patch AND inserts a
 *      `reputation_admin_actions` audit row whose action_type encodes
 *      both the switch key and the engaged/cleared direction.
 *   2. Per-org Reputation toggle goes through the shared feature-flag
 *      mutation AND writes an audit row with target_organization_id +
 *      org.reputation_enabled / org.reputation_disabled action_type.
 *
 * Regression: if either audit insert is dropped, platform staff lose
 * the "who flipped what, when, and why" paper trail that satisfies
 * compliance / outage post-mortems.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Capture every supabase call so we can assert the side-effect contract.
const calls: Array<{
  table: string;
  op: 'update' | 'insert';
  payload: any;
  filter?: { column: string; value: any };
}> = [];

vi.mock('@/integrations/supabase/client', () => {
  const buildUpdateChain = (table: string, payload: any) => ({
    eq: (column: string, value: any) => {
      calls.push({ table, op: 'update', payload, filter: { column, value } });
      return Promise.resolve({ error: null });
    },
  });
  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'platform-user-1' } } }),
      },
      from: (table: string) => ({
        update: (payload: any) => buildUpdateChain(table, payload),
        insert: (payload: any) => {
          calls.push({ table, op: 'insert', payload });
          return Promise.resolve({ error: null });
        },
      }),
    },
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

// useReputationOrgToggle delegates the feature-flag write to the shared hook;
// stub it so we can assert the toggle calls the right primitive AND still
// inserts its own audit row.
const updateFlagSpy = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useOrganizationFeatureFlags', () => ({
  useUpdateOrgFeatureFlag: () => ({
    mutateAsync: updateFlagSpy,
    isPending: false,
  }),
}));

import { useToggleReputationKillSwitch } from '@/hooks/reputation/useReputationKillSwitches';
import { useReputationOrgToggle } from '@/hooks/reputation/useReputationOrgToggle';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  calls.length = 0;
  updateFlagSpy.mockClear();
});

describe('useToggleReputationKillSwitch', () => {
  it('engaging a switch updates singleton row AND writes audit row with engaged action_type', async () => {
    const { result } = renderHook(() => useToggleReputationKillSwitch(), { wrapper });

    await result.current.mutateAsync({
      key: 'dispatch_disabled',
      enabled: true,
      reason: 'Twilio outage',
    });

    const update = calls.find((c) => c.table === 'reputation_kill_switches' && c.op === 'update');
    const audit = calls.find((c) => c.table === 'reputation_admin_actions' && c.op === 'insert');

    expect(update).toBeDefined();
    expect(update!.payload.dispatch_disabled).toBe(true);
    expect(update!.payload.disabled_reason).toBe('Twilio outage');
    expect(update!.payload.disabled_by).toBe('platform-user-1');
    expect(update!.filter).toEqual({ column: 'singleton', value: true });

    expect(audit).toBeDefined();
    expect(audit!.payload.action_type).toBe('kill_switch.dispatch_disabled.engaged');
    expect(audit!.payload.actor_user_id).toBe('platform-user-1');
    expect(audit!.payload.reason).toBe('Twilio outage');
    expect(audit!.payload.metadata).toEqual({ key: 'dispatch_disabled', enabled: true });
  });

  it('clearing a switch writes audit row with cleared action_type and does NOT stamp disabled_by', async () => {
    const { result } = renderHook(() => useToggleReputationKillSwitch(), { wrapper });

    await result.current.mutateAsync({ key: 'manual_send_disabled', enabled: false });

    const update = calls.find((c) => c.table === 'reputation_kill_switches' && c.op === 'update');
    const audit = calls.find((c) => c.table === 'reputation_admin_actions' && c.op === 'insert');

    expect(update!.payload.manual_send_disabled).toBe(false);
    // Clearing must not re-stamp actor (preserves the historical engagement record on the row).
    expect(update!.payload).not.toHaveProperty('disabled_by');
    expect(update!.payload).not.toHaveProperty('disabled_at');

    expect(audit!.payload.action_type).toBe('kill_switch.manual_send_disabled.cleared');
    expect(audit!.payload.metadata).toEqual({ key: 'manual_send_disabled', enabled: false });
  });
});

describe('useReputationOrgToggle', () => {
  it('delegates the flag write AND writes a per-org audit row', async () => {
    const { result } = renderHook(() => useReputationOrgToggle(), { wrapper });

    await result.current.mutateAsync({
      organizationId: 'org-123',
      organizationName: 'Drop Dead Salons',
      enabled: true,
      reason: 'comp — beta partner',
    });

    expect(updateFlagSpy).toHaveBeenCalledWith({
      organizationId: 'org-123',
      flagKey: 'reputation_enabled',
      isEnabled: true,
      reason: 'comp — beta partner',
    });

    const audit = calls.find(
      (c) => c.table === 'reputation_admin_actions' && c.op === 'insert',
    );
    expect(audit).toBeDefined();
    expect(audit!.payload.action_type).toBe('org.reputation_enabled');
    expect(audit!.payload.target_organization_id).toBe('org-123');
    expect(audit!.payload.actor_user_id).toBe('platform-user-1');
    expect(audit!.payload.reason).toBe('comp — beta partner');
    expect(audit!.payload.metadata).toEqual({ organization_name: 'Drop Dead Salons' });
  });

  it('disable path writes org.reputation_disabled action_type', async () => {
    const { result } = renderHook(() => useReputationOrgToggle(), { wrapper });

    await result.current.mutateAsync({
      organizationId: 'org-456',
      organizationName: 'Other Salon',
      enabled: false,
      reason: 'abuse — review spam',
    });

    const audit = calls.find(
      (c) => c.table === 'reputation_admin_actions' && c.op === 'insert',
    );
    expect(audit!.payload.action_type).toBe('org.reputation_disabled');
  });
});
