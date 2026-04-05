/**
 * useLocationGroups — CRUD for location groups (regions/markets).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface LocationGroup {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useLocationGroups() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['location-groups', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_groups')
        .select('*')
        .eq('organization_id', orgId!)
        .order('display_order');
      if (error) throw error;
      return (data || []) as unknown as LocationGroup[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useCreateLocationGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { organization_id: string; name: string; slug: string; display_order?: number }) => {
      const { data, error } = await supabase
        .from('location_groups')
        .insert(params as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-groups'] });
      toast.success('Location group created');
    },
    onError: (error: any) => {
      toast.error('Failed to create group: ' + error.message);
    },
  });
}

export function useUpdateLocationGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LocationGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('location_groups')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-groups'] });
      toast.success('Location group updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update group: ' + error.message);
    },
  });
}

export function useDeleteLocationGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('location_groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-groups'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location group deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete group: ' + error.message);
    },
  });
}

export function useAssignLocationToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, groupId }: { locationId: string; groupId: string | null }) => {
      const { error } = await supabase
        .from('locations')
        .update({ location_group_id: groupId } as any)
        .eq('id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location-groups'] });
    },
  });
}
