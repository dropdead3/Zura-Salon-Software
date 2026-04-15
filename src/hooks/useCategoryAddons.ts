import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoryAddon {
  id: string;
  organization_id: string;
  source_category_id: string;
  addon_label: string;
  addon_category_name: string | null;
  addon_service_name: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Fetch add-ons for a specific category */
export function useCategoryAddons(categoryId?: string) {
  return useQuery({
    queryKey: ['category-addons', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_category_addons')
        .select('*')
        .eq('source_category_id', categoryId!)
        .eq('is_active', true)
        .order('display_order')
        .order('addon_label');
      if (error) throw error;
      return data as unknown as CategoryAddon[];
    },
    enabled: !!categoryId,
  });
}

/** Fetch ALL add-ons for an org, returned as a lookup map keyed by source_category_id */
export function useAllCategoryAddons(organizationId?: string) {
  return useQuery({
    queryKey: ['category-addons-all', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_category_addons')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('is_active', true)
        .order('display_order')
        .order('addon_label');
      if (error) throw error;

      // Build a lookup map: { [source_category_id]: CategoryAddon[] }
      const map: Record<string, CategoryAddon[]> = {};
      (data as CategoryAddon[]).forEach(addon => {
        if (!map[addon.source_category_id]) map[addon.source_category_id] = [];
        map[addon.source_category_id].push(addon);
      });
      return map;
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 min — config data
  });
}

export function useCreateCategoryAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      source_category_id: string;
      addon_label: string;
      addon_category_name?: string | null;
      addon_service_name?: string | null;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('service_category_addons')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['category-addons', variables.source_category_id] });
      queryClient.invalidateQueries({ queryKey: ['category-addons-all', variables.organization_id] });
      toast.success('Add-on created');
    },
    onError: (err: Error) => {
      toast.error('Failed to create add-on: ' + err.message);
    },
  });
}

export function useDeleteCategoryAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, categoryId, organizationId }: { id: string; categoryId: string; organizationId: string }) => {
      const { error } = await supabase
        .from('service_category_addons')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { categoryId, organizationId };
    },
    onSuccess: ({ categoryId, organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['category-addons', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['category-addons-all', organizationId] });
      toast.success('Add-on removed');
    },
    onError: (err: Error) => {
      toast.error('Failed to remove add-on: ' + err.message);
    },
  });
}
