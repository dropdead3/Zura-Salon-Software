/**
 * useAllowanceBowls — CRUD for service allowance bowls (recipe-based calculator).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface AllowanceBowl {
  id: string;
  organization_id: string;
  service_id: string;
  bowl_number: number;
  label: string;
  created_at: string;
  updated_at: string;
}

export function useAllowanceBowls(serviceId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['allowance-bowls', orgId, serviceId],
    queryFn: async (): Promise<AllowanceBowl[]> => {
      const { data, error } = await supabase
        .from('service_allowance_bowls')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('service_id', serviceId!)
        .order('bowl_number', { ascending: true });

      if (error) throw error;
      return data as unknown as AllowanceBowl[];
    },
    enabled: !!orgId && !!serviceId,
  });
}

export function useUpsertAllowanceBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      organization_id: string;
      service_id: string;
      bowl_number: number;
      label: string;
    }) => {
      if (params.id) {
        const { data, error } = await supabase
          .from('service_allowance_bowls')
          .update({ label: params.label, bowl_number: params.bowl_number })
          .eq('id', params.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as AllowanceBowl;
      }

      const { data, error } = await supabase
        .from('service_allowance_bowls')
        .insert({
          organization_id: params.organization_id,
          service_id: params.service_id,
          bowl_number: params.bowl_number,
          label: params.label,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AllowanceBowl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowance-bowls'] });
    },
    onError: (error) => {
      toast.error('Failed to save bowl: ' + error.message);
    },
  });
}

export function useDeleteAllowanceBowl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_allowance_bowls')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowance-bowls'] });
      queryClient.invalidateQueries({ queryKey: ['service-recipe-baselines'] });
    },
    onError: (error) => {
      toast.error('Failed to remove bowl: ' + error.message);
    },
  });
}
