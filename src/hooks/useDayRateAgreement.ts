import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DayRateAgreement {
  id: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export function useDayRateAgreements() {
  return useQuery({
    queryKey: ['day-rate-agreements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_rate_agreements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as DayRateAgreement[];
    },
  });
}

export function useActiveAgreement() {
  return useQuery({
    queryKey: ['day-rate-agreements', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_rate_agreements')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as DayRateAgreement | null;
    },
  });
}

export function useCreateDayRateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreement: Omit<DayRateAgreement, 'id' | 'created_at' | 'created_by'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // If this is going to be active, deactivate others first
      if (agreement.is_active) {
        await supabase
          .from('day_rate_agreements')
          .update({ is_active: false })
          .eq('is_active', true);
      }

      const { data, error } = await supabase
        .from('day_rate_agreements')
        .insert({
          ...agreement,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-agreements'] });
      toast.success('Agreement created');
    },
    onError: (error) => {
      toast.error('Failed to create agreement', { description: error.message });
    },
  });
}

export function useUpdateDayRateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DayRateAgreement> & { id: string }) => {
      // If setting as active, deactivate others first
      if (updates.is_active) {
        await supabase
          .from('day_rate_agreements')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('day_rate_agreements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-agreements'] });
      toast.success('Agreement updated');
    },
    onError: (error) => {
      toast.error('Failed to update agreement', { description: error.message });
    },
  });
}

export function useSetActiveAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Deactivate all
      await supabase
        .from('day_rate_agreements')
        .update({ is_active: false })
        .neq('id', id);

      // Activate the selected one
      const { data, error } = await supabase
        .from('day_rate_agreements')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-agreements'] });
      toast.success('Active agreement updated');
    },
    onError: (error) => {
      toast.error('Failed to set active agreement', { description: error.message });
    },
  });
}

export function useDeleteDayRateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('day_rate_agreements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-rate-agreements'] });
      toast.success('Agreement deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete agreement', { description: error.message });
    },
  });
}
