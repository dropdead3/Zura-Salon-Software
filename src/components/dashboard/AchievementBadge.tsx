import { 
  Crown, Flame, Star, TrendingUp, Award, Users, Heart, 
  ShoppingBag, Sparkles, Zap, Trophy, Medal 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Achievement } from '@/hooks/useLeaderboardAchievements';
import { useFormatDate } from '@/hooks/useFormatDate';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  crown: Crown,
  flame: Flame,
  star: Star,
  'trending-up': TrendingUp,
  award: Award,
  users: Users,
  heart: Heart,
  'shopping-bag': ShoppingBag,
  sparkles: Sparkles,
  zap: Zap,
  trophy: Trophy,
  medal: Medal,
};

const colorMap: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-300 dark:border-pink-700',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-300 dark:border-rose-700',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-300 dark:border-teal-700',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-300 dark:border-violet-700',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
  primary: 'bg-primary/10 text-primary border-primary/30',
};

interface AchievementBadgeProps {
  achievement: Achievement;
  earnedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function AchievementBadge({ 
  achievement, 
  earnedAt,
  size = 'md',
  showTooltip = true 
}: AchievementBadgeProps) {
  const { formatDate } = useFormatDate();
  const Icon = iconMap[achievement.icon] || Trophy;
  const colorClass = colorMap[achievement.badge_color] || colorMap.primary;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const badge = (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${colorClass} 
        rounded-full border flex items-center justify-center
        transition-transform hover:scale-110 cursor-pointer
      `}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-display text-xs tracking-wide">{achievement.name}</p>
            <p className="text-xs text-muted-foreground">{achievement.description}</p>
            {earnedAt && (
              <p className="text-[10px] text-muted-foreground/70 pt-1 border-t">
                Earned {formatDate(new Date(earnedAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AchievementBadgeStackProps {
  achievements: { achievement: Achievement; earnedAt?: string }[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadgeStack({ 
  achievements, 
  maxVisible = 3,
  size = 'sm' 
}: AchievementBadgeStackProps) {
  const visible = achievements.slice(0, maxVisible);
  const remaining = achievements.length - maxVisible;

  if (achievements.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1">
      {visible.map((item, index) => (
        <div key={item.achievement.id} style={{ zIndex: maxVisible - index }}>
          <AchievementBadge 
            achievement={item.achievement} 
            earnedAt={item.earnedAt}
            size={size}
          />
        </div>
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div 
                className={`
                  ${size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'}
                  bg-muted text-muted-foreground rounded-full border flex items-center justify-center
                  font-display cursor-pointer hover:scale-110 transition-transform
                `}
                style={{ zIndex: 0 }}
              >
                +{remaining}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{remaining} more badges</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
