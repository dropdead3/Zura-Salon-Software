/**
 * useServiceRecipeBaselines — CRUD for service formula baselines.
 * Defines expected product usage per service type for variance detection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ServiceRecipeBaseline {
  id: string;
  organization_id: string;
  service_id: string;
  product_id: string;
  expected_quantity: number;
  unit: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useServiceRecipeBaselines(serviceId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-recipe-baselines', orgId, serviceId],
    queryFn: async (): Promise<ServiceRecipeBaseline[]> => {
      let query = supabase
        .from('service_recipe_baselines')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: true });

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ServiceRecipeBaseline[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertRecipeBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      service_id: string;
      product_id: string;
      expected_quantity: number;
      unit?: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('service_recipe_baselines')
        .upsert(
          {
            organization_id: params.organization_id,
            service_id: params.service_id,
            product_id: params.product_id,
            expected_quantity: params.expected_quantity,
            unit: params.unit || 'g',
            notes: params.notes || null,
            created_by: userId,
          },
          { onConflict: 'organization_id,service_id,product_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServiceRecipeBaseline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-recipe-baselines'] });
      toast.success('Recipe baseline saved');
    },
    onError: (error) => {
      toast.error('Failed to save baseline: ' + error.message);
    },
  });
}

export function useDeleteRecipeBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_recipe_baselines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-recipe-baselines'] });
      toast.success('Baseline removed');
    },
    onError: (error) => {
      toast.error('Failed to remove baseline: ' + error.message);
    },
  });
}
