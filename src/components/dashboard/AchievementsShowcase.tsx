import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { Achievement, UserAchievement, useLeaderboardAchievements } from '@/hooks/useLeaderboardAchievements';
import { AchievementBadge } from './AchievementBadge';
import { useFormatDate } from '@/hooks/useFormatDate';

interface AchievementsShowcaseProps {
  userId?: string;
  compact?: boolean;
}

export function AchievementsShowcase({ userId, compact = false }: AchievementsShowcaseProps) {
  const { formatDate } = useFormatDate();
  const { achievements, userAchievements, loading, getUserAchievements } = useLeaderboardAchievements(userId);

  const earned = userId ? getUserAchievements(userId) : userAchievements;
  const earnedIds = new Set(earned.map(ua => ua.achievement_id));

  const categorizedAchievements = achievements.reduce((acc, ach) => {
    if (!acc[ach.category]) acc[ach.category] = [];
    acc[ach.category].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categoryLabels: Record<string, string> = {
    ranking: 'Rankings',
    streak: 'Streaks',
    improvement: 'Improvement',
    consistency: 'Consistency',
    category: 'Category Leaders',
    metric: 'Metrics',
    general: 'General',
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base tracking-wide">ACHIEVEMENTS</h3>
          </div>
          <span className="text-xs text-muted-foreground font-sans">
            {earned.length}/{achievements.length} earned
          </span>
        </div>

        {earned.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No achievements earned yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {earned.slice(0, 6).map((ua) => (
              ua.achievement && (
                <AchievementBadge
                  key={ua.id}
                  achievement={ua.achievement}
                  earnedAt={ua.earned_at}
                  size="md"
                />
              )
            ))}
            {earned.length > 6 && (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-display">
                +{earned.length - 6}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-display text-lg tracking-wide">ACHIEVEMENTS</h3>
            <p className="text-sm text-muted-foreground font-sans">
              {earned.length} of {achievements.length} earned
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display">{Math.round((earned.length / achievements.length) * 100)}%</div>
          <p className="text-xs text-muted-foreground">Complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(earned.length / achievements.length) * 100}%` }}
        />
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {Object.entries(categorizedAchievements).map(([category, categoryAchievements]) => (
          <div key={category} className="space-y-3">
            <h4 className="font-display text-xs tracking-wider text-muted-foreground">
              {categoryLabels[category] || category.toUpperCase()}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryAchievements.map((achievement) => {
                const userAch = earned.find(ua => ua.achievement_id === achievement.id);
                const isEarned = earnedIds.has(achievement.id);

                return (
                  <div
                    key={achievement.id}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${isEarned 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/30 border-muted opacity-60'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={isEarned ? '' : 'grayscale'}>
                        <AchievementBadge 
                          achievement={achievement} 
                          earnedAt={userAch?.earned_at}
                          size="md"
                          showTooltip={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm font-medium truncate">
                          {achievement.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {achievement.description}
                        </p>
                        {isEarned && userAch && (
                          <p className="text-[10px] text-primary mt-1">
                            Earned {formatDate(new Date(userAch.earned_at), 'MMM d')}
                          </p>
                        )}
                        {!isEarned && (
                          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                            <Lock className="w-3 h-3" />
                            <span className="text-[10px]">Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
