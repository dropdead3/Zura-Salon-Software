/**
 * useColorBarLocationEntitlements — Fetches per-location Color Bar entitlements
 * and provides helpers for checking location-level access.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ColorBarLocationEntitlement {
  id: string;
  organization_id: string;
  location_id: string;
  plan_tier: string;
  scale_count: number;
  status: string;
  billing_interval: string | null;
  stripe_subscription_id: string | null;
  activated_at: string;
  activated_by: string | null;
  notes: string | null;
  refund_eligible_until: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  prior_refund_count: number;
  // Suspension lifecycle
  suspended_at: string | null;
  reactivated_at: string | null;
  requires_inventory_reconciliation: boolean;
  inventory_verified_at: string | null;
  inventory_verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useColorBarLocationEntitlements(organizationId: string | undefined) {
  const query = useQuery({
    queryKey: ['color-bar-location-entitlements', organizationId],
    queryFn: async (): Promise<ColorBarLocationEntitlement[]> => {
      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as ColorBarLocationEntitlement[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const entitlementMap = new Map(
    (query.data ?? []).map((e) => [e.location_id, e])
  );

  const isLocationEntitled = (locationId: string): boolean => {
    const ent = entitlementMap.get(locationId);
    return !!ent && ent.status === 'active';
  };

  const getLocationEntitlement = (locationId: string) =>
    entitlementMap.get(locationId) ?? null;

  const isRefundEligible = (locationId: string): boolean => {
    const ent = entitlementMap.get(locationId);
    if (!ent?.refund_eligible_until) return false;
    return new Date(ent.refund_eligible_until) > new Date();
  };

  const activeCount = (query.data ?? []).filter(
    (e) => e.status === 'active'
  ).length;

  return {
    ...query,
    entitlements: query.data ?? [],
    entitlementMap,
    isLocationEntitled,
    getLocationEntitlement,
    isRefundEligible,
    activeCount,
  };
}

/** Upsert a location entitlement (platform admin or org admin). */
export function useUpsertLocationEntitlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      location_id: string;
      plan_tier?: string;
      scale_count?: number;
      status?: string;
      trial_end_date?: string | null;
      billing_interval?: string;
      notes?: string;
    }) => {
      // Check if a row already exists — only stamp activated_at on first
      // insert. Overwriting it on every update destroys "active for X days"
      // reporting and breaks audit trails.
      const { data: existing } = await supabase
        .from('backroom_location_entitlements')
        .select('id, activated_at')
        .eq('organization_id', params.organization_id as any)
        .eq('location_id', params.location_id as any)
        .maybeSingle();

      const payload: Record<string, any> = {
        organization_id: params.organization_id,
        location_id: params.location_id,
        plan_tier: params.plan_tier ?? 'starter',
        scale_count: params.scale_count ?? 0,
        status: params.status ?? 'active',
        trial_end_date: params.trial_end_date ?? null,
        billing_interval: params.billing_interval ?? 'monthly',
        notes: params.notes ?? null,
      };
      // Only set activated_at on first insert.
      if (!existing) {
        payload.activated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .upsert(payload as any, { onConflict: 'organization_id,location_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['color-bar-location-entitlements', vars.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-entitlements'],
      });
    },
    onError: (error) => {
      toast.error('Failed to update location entitlement: ' + error.message);
    },
  });
}

/** Delete (deactivate) a location entitlement. */
export function useDeleteLocationEntitlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      location_id: string;
    }) => {
      const { error } = await supabase
        .from('backroom_location_entitlements')
        .delete()
        .eq('organization_id', params.organization_id as any)
        .eq('location_id', params.location_id as any);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['color-bar-location-entitlements', vars.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-entitlements'],
      });
    },
    onError: (error) => {
      toast.error('Failed to remove location entitlement: ' + error.message);
    },
  });
}

/**
 * Bulk-suspend all active location entitlements for an org.
 * Soft-disable: preserves rows + history; sets status='suspended' + suspended_at=now().
 * Used when the org-level Color Bar master switch is turned off.
 */
export function useBulkSuspendLocationEntitlements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { organization_id: string }) => {
      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
        } as any)
        .eq('organization_id', params.organization_id as any)
        .eq('status', 'active' as any)
        .select('id, location_id');

      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['color-bar-location-entitlements', vars.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-entitlements'],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-all-entitlement-counts'],
      });
    },
  });
}

/**
 * Bulk-reactivate all suspended location entitlements for an org.
 * Sets status='active', stamps reactivated_at, AND raises
 * requires_inventory_reconciliation=true since tracked quantities can no
 * longer be trusted after a tracking gap.
 *
 * Returns the list of reactivated location_ids so callers can confirm
 * how many locations now require physical reconciliation.
 */
export function useBulkReactivateLocationEntitlements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { organization_id: string }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .update({
          status: 'active',
          reactivated_at: now,
          requires_inventory_reconciliation: true,
          inventory_verified_at: null,
          inventory_verified_by: null,
        } as any)
        .eq('organization_id', params.organization_id as any)
        .eq('status', 'suspended' as any)
        .select('id, location_id');

      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['color-bar-location-entitlements', vars.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-entitlements'],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-all-entitlement-counts'],
      });
    },
  });
}
