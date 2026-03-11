import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';

export interface DraftBooking {
  id: string;
  organization_id: string;
  location_id: string | null;
  created_by: string;
  created_by_name: string | null;
  appointment_date: string | null;
  start_time: string | null;
  client_id: string | null;
  client_name: string | null;
  staff_user_id: string | null;
  staff_name: string | null;
  selected_services: { id: string; name: string }[];
  notes: string | null;
  step_reached: string | null;
  is_redo: boolean;
  redo_metadata: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
}

export interface DraftBookingInput {
  id?: string;
  organization_id: string;
  location_id?: string;
  appointment_date?: string;
  start_time?: string;
  client_id?: string | null;
  client_name?: string | null;
  staff_user_id?: string | null;
  staff_name?: string | null;
  selected_services?: { id: string; name: string }[];
  notes?: string;
  step_reached?: string;
  is_redo?: boolean;
  redo_metadata?: Record<string, unknown> | null;
}

export function useDraftBookings(orgId: string | undefined) {
  return useQuery({
    queryKey: ['draft-bookings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draft_bookings')
        .select('*')
        .eq('organization_id', orgId!)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        selected_services: Array.isArray(d.selected_services) ? d.selected_services : [],
      })) as DraftBooking[];
    },
    enabled: !!orgId,
    staleTime: 30000,
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();

  return useMutation({
    mutationFn: async (input: DraftBookingInput) => {
      const payload = {
        organization_id: input.organization_id,
        location_id: input.location_id || null,
        created_by: user?.id,
        created_by_name: profile ? formatDisplayName(profile.full_name, profile.display_name) : null,
        appointment_date: input.appointment_date || null,
        start_time: input.start_time || null,
        client_id: input.client_id || null,
        client_name: input.client_name || null,
        staff_user_id: input.staff_user_id || null,
        staff_name: input.staff_name || null,
        selected_services: input.selected_services || [],
        notes: input.notes || null,
        step_reached: input.step_reached || null,
        is_redo: input.is_redo || false,
        redo_metadata: (input.redo_metadata as any) || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('draft_bookings')
          .update(payload)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('draft_bookings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draft-bookings', variables.organization_id] });
    },
    onError: (error) => {
      console.error('Failed to save draft:', error);
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase
        .from('draft_bookings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['draft-bookings', result.orgId] });
    },
    onError: (error) => {
      toast.error('Failed to delete draft: ' + error.message);
    },
  });
}

export function useBatchDeleteDrafts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, orgId }: { ids: string[]; orgId: string }) => {
      const { error } = await supabase
        .from('draft_bookings')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return { orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['draft-bookings', result.orgId] });
    },
    onError: (error) => {
      toast.error('Failed to delete drafts: ' + error.message);
    },
  });
}
