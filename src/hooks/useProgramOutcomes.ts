import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProgramOutcome {
  id: string;
  icon: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProgramOutcomes() {
  return useQuery({
    queryKey: ['program-outcomes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_outcomes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as unknown as ProgramOutcome[];
    },
  });
}

export function useUpdateProgramOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramOutcome> }) => {
      const { data, error } = await supabase
        .from('program_outcomes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-outcomes'] });
      toast.success('Outcome updated successfully');
    },
    onError: (error) => {
      console.error('Error updating outcome:', error);
      toast.error('Failed to update outcome');
    },
  });
}
