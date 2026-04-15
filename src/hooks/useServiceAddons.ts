import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceAddon {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  duration_minutes: number | null;
  is_active: boolean;
  display_order: number;
  linked_service_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useServiceAddons(organizationId?: string) {
  return useQuery({
    queryKey: ['service-addons', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_addons')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('is_active', true)
        .order('display_order')
        .order('name');
      if (error) throw error;
      return data as unknown as ServiceAddon[];
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateServiceAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      name: string;
      price: number;
      cost?: number | null;
      duration_minutes?: number | null;
      description?: string | null;
      linked_service_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('service_addons')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['service-addons', v.organization_id] });
      toast.success('Add-on created');
    },
    onError: (err: Error) => toast.error('Failed to create add-on: ' + err.message),
  });
}

export function useUpdateServiceAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organizationId, ...updates }: {
      id: string;
      organizationId: string;
      name?: string;
      price?: number;
      cost?: number | null;
      duration_minutes?: number | null;
      description?: string | null;
      is_active?: boolean;
      linked_service_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('service_addons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data, organizationId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['service-addons', r.organizationId] });
      toast.success('Add-on updated');
    },
    onError: (err: Error) => toast.error('Failed to update: ' + err.message),
  });
}

export function useDeleteServiceAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('service_addons')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['service-addons', r.organizationId] });
      qc.invalidateQueries({ queryKey: ['addon-assignments'] });
      toast.success('Add-on removed');
    },
    onError: (err: Error) => toast.error('Failed to remove: ' + err.message),
  });
}

/** Batch-update display_order for drag-to-reorder */
export function useReorderServiceAddons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ organizationId, items }: {
      organizationId: string;
      items: { id: string; display_order: number }[];
    }) => {
      const updates = items.map(item =>
        supabase
          .from('service_addons')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
      return { organizationId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['service-addons', r.organizationId] });
    },
    onError: (err: Error) => toast.error('Failed to reorder: ' + err.message),
  });
}
