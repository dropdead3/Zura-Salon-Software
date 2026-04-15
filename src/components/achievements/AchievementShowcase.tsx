import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AchievementProgressCard } from './AchievementProgressCard';
import { fetchAchievementContext } from '@/services/achievementService';
import { Loader2, Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
}

interface AchievementShowcaseProps {
  userId: string;
  showLocked?: boolean;
  maxDisplay?: number;
  compact?: boolean;
}

export function AchievementShowcase({
  userId,
  showLocked = false,
  maxDisplay,
  compact = false,
}: AchievementShowcaseProps) {
  const [context, setContext] = useState<Record<string, number>>({});

  // Fetch all achievements
  const { data: achievements = [], isLoading: loadingAchievements } = useQuery({
    queryKey: ['achievements-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_achievements')
        .select('*')
        .eq('is_active', true)
        .order('category');
      if (error) throw error;
      return data as unknown as Achievement[];
    },
  });

  // Fetch user's earned achievements
  const { data: userAchievements = [], isLoading: loadingUserAchievements } = useQuery({
    queryKey: ['user-achievements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id, achievement_id, earned_at')
        .eq('user_id', userId);
      if (error) throw error;
      return data as unknown as UserAchievement[];
    },
    enabled: !!userId,
  });

  // Fetch context for progress calculation
  useEffect(() => {
    if (userId) {
      fetchAchievementContext(userId).then(ctx => {
        setContext({
          training_completed: ctx.trainingCompleted || 0,
          bells_rung: ctx.bellsRung || 0,
          streak_days: ctx.streakDays || 0,
          high_fives_given: ctx.highFivesGiven || 0,
          high_fives_received: ctx.highFivesReceived || 0,
          swaps_helped: ctx.swapsHelped || 0,
          challenges_won: ctx.challengesWon || 0,
        });
      });
    }
  }, [userId]);

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const earnedMap = new Map(
    userAchievements.map(ua => [ua.achievement_id, ua.earned_at])
  );

  // Filter and sort achievements
  let displayAchievements = achievements.filter(a => {
    if (showLocked) return true;
    return earnedIds.has(a.id);
  });

  // Sort: earned first, then by category
  displayAchievements.sort((a, b) => {
    const aEarned = earnedIds.has(a.id) ? 0 : 1;
    const bEarned = earnedIds.has(b.id) ? 0 : 1;
    if (aEarned !== bEarned) return aEarned - bEarned;
    return a.category.localeCompare(b.category);
  });

  if (maxDisplay) {
    displayAchievements = displayAchievements.slice(0, maxDisplay);
  }

  const getProgressValue = (achievement: Achievement): number => {
    const typeToContextKey: Record<string, string> = {
      training_completed: 'training_completed',
      bells_rung: 'bells_rung',
      streak_days: 'streak_days',
      high_fives_given: 'high_fives_given',
      high_fives_received: 'high_fives_received',
      swaps_helped: 'swaps_helped',
      challenges_won: 'challenges_won',
    };
    const key = typeToContextKey[achievement.requirement_type];
    return key ? (context[key] || 0) : 0;
  };

  if (loadingAchievements || loadingUserAchievements) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (displayAchievements.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No achievements yet</p>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? 'flex flex-wrap gap-2'
          : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
      }
    >
      {displayAchievements.map(achievement => (
        <AchievementProgressCard
          key={achievement.id}
          achievement={achievement}
          currentValue={getProgressValue(achievement)}
          isEarned={earnedIds.has(achievement.id)}
          earnedAt={earnedMap.get(achievement.id)}
          className={compact ? 'w-auto' : undefined}
        />
      ))}
    </div>
  );
}
