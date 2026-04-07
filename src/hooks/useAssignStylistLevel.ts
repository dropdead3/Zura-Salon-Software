import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAssignStylistLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, levelSlug }: { userId: string; levelSlug: string | null }) => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ stylist_level: levelSlug, stylist_level_since: new Date().toISOString() } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['stylists-by-level'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-stylists'] });
    },
    onError: (error) => {
      console.error('Error assigning stylist level:', error);
      toast.error('Failed to assign level');
    },
  });
}

export function useBulkAssignStylistLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userIds, levelSlug }: { userIds: string[]; levelSlug: string | null }) => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ stylist_level: levelSlug, stylist_level_since: new Date().toISOString() } as any)
        .in('user_id', userIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['stylists-by-level'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-stylists'] });
    },
    onError: (error) => {
      console.error('Error bulk assigning stylist levels:', error);
      toast.error('Failed to assign levels');
    },
  });
}
