import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface BackroomStation {
  id: string;
  organization_id: string;
  location_id: string;
  station_name: string;
  assigned_device_id: string | null;
  assigned_scale_id: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBackroomStations(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-stations', orgId, locationId],
    queryFn: async (): Promise<BackroomStation[]> => {
      let query = supabase
        .from('backroom_stations')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('station_name');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BackroomStation[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateBackroomStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      location_id: string;
      station_name: string;
    }) => {
      const { data, error } = await supabase
        .from('backroom_stations')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BackroomStation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-stations'] });
      toast.success('Station created');
    },
    onError: (error) => {
      toast.error('Failed to create station: ' + error.message);
    },
  });
}

export function useUpdateBackroomStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; station_name?: string; assigned_device_id?: string | null; assigned_scale_id?: string | null; is_active?: boolean }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('backroom_stations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BackroomStation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-stations'] });
      toast.success('Station updated');
    },
    onError: (error) => {
      toast.error('Failed to update station: ' + error.message);
    },
  });
}

export function useDeleteBackroomStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationId: string) => {
      const { error } = await supabase
        .from('backroom_stations')
        .delete()
        .eq('id', stationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-stations'] });
      toast.success('Station removed');
    },
    onError: (error) => {
      toast.error('Failed to remove station: ' + error.message);
    },
  });
}
