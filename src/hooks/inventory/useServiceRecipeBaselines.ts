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
  bowl_id: string;
  cost_per_unit_snapshot: number | null;
  is_developer: boolean | null;
  developer_ratio: number | null;
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

/**
 * Insert a new recipe baseline. Uses plain insert (not upsert) since
 * handleSave follows a delete-then-recreate pattern and the unique
 * constraint now includes bowl_id.
 *
 * Pass `silent: true` to suppress toast notifications during batch saves.
 */
export function useInsertRecipeBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      service_id: string;
      product_id: string;
      bowl_id: string;
      expected_quantity: number;
      unit?: string;
      notes?: string;
      cost_per_unit_snapshot?: number;
      is_developer?: boolean;
      developer_ratio?: number;
      silent?: boolean;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('service_recipe_baselines')
        .insert({
          organization_id: params.organization_id,
          service_id: params.service_id,
          product_id: params.product_id,
          bowl_id: params.bowl_id,
          expected_quantity: params.expected_quantity,
          unit: params.unit || 'g',
          notes: params.notes || null,
          created_by: userId,
          cost_per_unit_snapshot: params.cost_per_unit_snapshot ?? null,
          is_developer: params.is_developer ?? false,
          developer_ratio: params.developer_ratio ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, _silent: params.silent } as unknown as ServiceRecipeBaseline & { _silent?: boolean };
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['service-recipe-baselines'] });
      // Don't toast during batch saves
    },
    onError: (error) => {
      toast.error('Failed to save baseline: ' + error.message);
    },
  });
}

/** @deprecated Use useInsertRecipeBaseline instead — kept for backward compat */
export function useUpsertRecipeBaseline() {
  return useInsertRecipeBaseline();
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
    },
    onError: (error) => {
      toast.error('Failed to remove baseline: ' + error.message);
    },
  });
}
