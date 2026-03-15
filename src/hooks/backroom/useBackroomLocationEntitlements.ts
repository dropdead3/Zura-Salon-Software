/**
 * useBackroomLocationEntitlements — Fetches per-location Backroom entitlements
 * and provides helpers for checking location-level access.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BackroomLocationEntitlement {
  id: string;
  organization_id: string;
  location_id: string;
  plan_tier: string;
  scale_count: number;
  status: string;
  trial_end_date: string | null;
  billing_interval: string | null;
  stripe_subscription_id: string | null;
  activated_at: string;
  activated_by: string | null;
  notes: string | null;
  refund_eligible_until: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  prior_refund_count: number;
  created_at: string;
  updated_at: string;
}

export function useBackroomLocationEntitlements(organizationId: string | undefined) {
  const query = useQuery({
    queryKey: ['backroom-location-entitlements', organizationId],
    queryFn: async (): Promise<BackroomLocationEntitlement[]> => {
      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as BackroomLocationEntitlement[];
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
      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .upsert(
          {
            organization_id: params.organization_id,
            location_id: params.location_id,
            plan_tier: params.plan_tier ?? 'starter',
            scale_count: params.scale_count ?? 0,
            status: params.status ?? 'active',
            trial_end_date: params.trial_end_date ?? null,
            billing_interval: params.billing_interval ?? 'monthly',
            notes: params.notes ?? null,
            activated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'organization_id,location_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['backroom-location-entitlements', vars.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-backroom-entitlements'],
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
        queryKey: ['backroom-location-entitlements', vars.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-backroom-entitlements'],
      });
    },
    onError: (error) => {
      toast.error('Failed to remove location entitlement: ' + error.message);
    },
  });
}
