import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProgramAchievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  badge_color: string;
  achievement_type: string;
  threshold: number;
  is_active: boolean;
}

export interface UserProgramAchievement {
  id: string;
  user_id: string;
  enrollment_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: ProgramAchievement;
}

export function useProgramAchievements() {
  return useQuery({
    queryKey: ['program-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_achievements')
        .select('*')
        .eq('is_active', true)
        .order('threshold');
      
      if (error) throw error;
      return data as unknown as ProgramAchievement[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useUserProgramAchievements(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['user-program-achievements', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return [];
      
      const { data, error } = await supabase
        .from('user_program_achievements')
        .select(`
          *,
          achievement:program_achievements(*)
        `)
        .eq('enrollment_id', enrollmentId);
      
      if (error) throw error;
      return data as unknown as UserProgramAchievement[];
    },
    enabled: !!enrollmentId,
  });
}

export function useAwardAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      enrollmentId, 
      achievementId 
    }: { 
      userId: string; 
      enrollmentId: string; 
      achievementId: string;
    }) => {
      // Check if already earned
      const { data: existing } = await supabase
        .from('user_program_achievements')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('achievement_id', achievementId)
        .maybeSingle();

      if (existing) return null; // Already earned

      const { data, error } = await supabase
        .from('user_program_achievements')
        .insert({
          user_id: userId,
          enrollment_id: enrollmentId,
          achievement_id: achievementId,
        })
        .select(`
          *,
          achievement:program_achievements(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['user-program-achievements'] });
        toast.success(`🏆 Achievement Unlocked: ${data.achievement?.title}`);
      }
    },
  });
}

export function useCheckAchievements() {
  const { data: achievements } = useProgramAchievements();
  const awardMutation = useAwardAchievement();

  const checkAndAwardAchievements = async (
    userId: string,
    enrollmentId: string,
    currentDay: number,
    streakCount: number,
    restartCount: number,
    weeklyProgress?: { completed: number; total: number }
  ) => {
    if (!achievements) return;

    for (const achievement of achievements) {
      let shouldAward = false;

      switch (achievement.achievement_type) {
        case 'streak':
          shouldAward = streakCount >= achievement.threshold;
          break;
        case 'milestone':
          if (achievement.key === 'halfway') {
            shouldAward = currentDay >= 38;
          } else if (achievement.key === 'finisher') {
            shouldAward = currentDay >= 75;
          } else if (achievement.key === 'week_1_complete') {
            shouldAward = currentDay > 7;
          }
          break;
        case 'special':
          if (achievement.key === 'perfect_week' && weeklyProgress) {
            shouldAward = weeklyProgress.total > 0 && 
                          weeklyProgress.completed === weeklyProgress.total;
          } else if (achievement.key === 'comeback_kid') {
            shouldAward = restartCount > 0 && currentDay >= 75;
          }
          break;
      }

      if (shouldAward) {
        await awardMutation.mutateAsync({
          userId,
          enrollmentId,
          achievementId: achievement.id,
        });
      }
    }
  };

  return { checkAndAwardAchievements };
}
