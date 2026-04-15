import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StylistPersonalGoal {
  id: string;
  user_id: string;
  monthly_target: number;
  weekly_target: number;
  retail_monthly_target: number;
  retail_weekly_target: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useStylistPersonalGoals(userId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['stylist-personal-goals', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('stylist_personal_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as StylistPersonalGoal | null;
    },
    enabled: !!userId,
  });

  const upsertGoals = useMutation({
    mutationFn: async (goals: {
      monthlyTarget: number;
      weeklyTarget: number;
      retailMonthlyTarget?: number;
      retailWeeklyTarget?: number;
      notes?: string;
    }) => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('stylist_personal_goals')
        .upsert({
          user_id: userId,
          monthly_target: goals.monthlyTarget,
          weekly_target: goals.weeklyTarget,
          retail_monthly_target: goals.retailMonthlyTarget ?? 0,
          retail_weekly_target: goals.retailWeeklyTarget ?? 0,
          notes: goals.notes || null,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-personal-goals', userId] });
      queryClient.invalidateQueries({ queryKey: ['aggregated-retail-goals'] });
      toast({
        title: 'Goals saved',
        description: 'Your personal sales targets have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving goals',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    goals: query.data,
    isLoading: query.isLoading,
    upsertGoals: upsertGoals.mutate,
    isUpdating: upsertGoals.isPending,
  };
}
