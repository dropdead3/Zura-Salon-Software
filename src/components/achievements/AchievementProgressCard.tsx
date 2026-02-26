import { motion } from 'framer-motion';
import { 
  Award, Bell, Flame, GraduationCap, Trophy, Crown, 
  Heart, Star, Users, Medal, HandMetal, Lock 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  category: string;
  requirement_value: number;
}

interface AchievementProgressCardProps {
  achievement: Achievement;
  currentValue: number;
  isEarned: boolean;
  earnedAt?: string;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Bell,
  Flame,
  GraduationCap,
  Trophy,
  Crown,
  Heart,
  Star,
  Users,
  Medal,
  HandMetal,
};

export function AchievementProgressCard({
  achievement,
  currentValue,
  isEarned,
  earnedAt,
  className,
}: AchievementProgressCardProps) {
  const IconComponent = iconMap[achievement.icon] || Award;
  const progress = Math.min((currentValue / achievement.requirement_value) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        isEarned
          ? 'bg-gradient-to-br from-background to-muted/50 border-border/60'
          : 'bg-muted/30 border-border/40',
        className
      )}
    >
      {/* Lock overlay for unearned */}
      {!isEarned && (
        <div className="absolute inset-0 rounded-xl bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Badge icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            isEarned ? 'opacity-100' : 'opacity-40'
          )}
          style={{
            backgroundColor: isEarned
              ? `${achievement.badge_color}20`
              : 'hsl(var(--muted))',
          }}
        >
          <IconComponent
            className="w-6 h-6"
            style={{
              color: isEarned ? achievement.badge_color : 'hsl(var(--muted-foreground))',
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'font-display text-sm truncate',
              isEarned ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {achievement.name}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-sans">
            {achievement.description}
          </p>

          {/* Progress bar for unearned */}
          {!isEarned && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {currentValue} / {achievement.requirement_value}
              </p>
            </div>
          )}

          {/* Earned date */}
          {isEarned && earnedAt && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Earned {new Date(earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Earned badge */}
      {isEarned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
        >
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
