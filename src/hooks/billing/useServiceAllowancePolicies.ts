/**
 * useServiceAllowancePolicies — CRUD for service allowance policies.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ServiceAllowancePolicy {
  id: string;
  organization_id: string;
  service_id: string;
  included_allowance_qty: number;
  allowance_unit: string;
  overage_rate: number;
  overage_rate_type: string;
  overage_cap: number | null;
  billing_mode: 'allowance' | 'parts_and_labor';
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  allowance_health_status: string | null;
  allowance_health_pct: number | null;
  last_health_check_at: string | null;
}

export function useServiceAllowancePolicies(serviceId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-allowance-policies', orgId, serviceId],
    queryFn: async () => {
      let query = supabase
        .from('service_allowance_policies')
        .select('*')
        .eq('organization_id', orgId!);

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ServiceAllowancePolicy[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertAllowancePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: {
      organization_id: string;
      service_id: string;
      included_allowance_qty: number;
      allowance_unit?: string;
      overage_rate: number;
      overage_rate_type?: string;
      overage_cap?: number | null;
      billing_mode?: 'allowance' | 'parts_and_labor';
      is_active?: boolean;
      notes?: string | null;
      allowance_health_status?: string | null;
      allowance_health_pct?: number | null;
      last_health_check_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('service_allowance_policies')
        .upsert(
          {
            ...policy,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
          { onConflict: 'organization_id,service_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-allowance-policies'] });
      toast.success('Allowance policy saved');
    },
    onError: (error) => {
      toast.error('Failed to save allowance policy: ' + error.message);
    },
  });
}

export function useDeleteAllowancePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await supabase
        .from('service_allowance_policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-allowance-policies'] });
      toast.success('Allowance policy removed');
    },
    onError: (error) => {
      toast.error('Failed to remove policy: ' + error.message);
    },
  });
}
