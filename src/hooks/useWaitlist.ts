import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaitlistEntry {
  id: string;
  organization_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  service_name: string | null;
  preferred_stylist_id: string | null;
  preferred_date_start: string;
  preferred_date_end: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  status: string;
  priority: number;
  notes: string | null;
  offered_at: string | null;
  resolved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WaitlistFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useWaitlistEntries(orgId?: string, filters: WaitlistFilters = {}) {
  return useQuery({
    queryKey: ['waitlist-entries', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('waitlist_entries')
        .select('*')
        .eq('organization_id', orgId!)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else if (!filters.status) {
        query = query.in('status', ['waiting', 'offered']);
      }

      if (filters.dateFrom) {
        query = query.gte('preferred_date_start', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('preferred_date_start', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WaitlistEntry[];
    },
    enabled: !!orgId,
    staleTime: 30000,
  });
}

export interface AddWaitlistInput {
  organization_id: string;
  client_id?: string | null;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  service_name?: string | null;
  preferred_stylist_id?: string | null;
  preferred_date_start: string;
  preferred_date_end?: string | null;
  preferred_time_start?: string | null;
  preferred_time_end?: string | null;
  priority?: number;
  notes?: string | null;
}

export function useAddWaitlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddWaitlistInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('waitlist_entries')
        .insert({
          ...input,
          status: 'waiting',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] });
      toast.success('Client added to waitlist');
    },
    onError: (error) => {
      toast.error('Failed to add to waitlist: ' + error.message);
    },
  });
}

export function useUpdateWaitlistStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === 'offered') updates.offered_at = new Date().toISOString();
      if (['booked', 'expired', 'cancelled'].includes(status)) updates.resolved_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('waitlist_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] });
      toast.success(`Entry marked as ${status}`);
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}
