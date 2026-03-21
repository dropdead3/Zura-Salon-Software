import { 
  Trophy, 
  Flame, 
  Target, 
  Star, 
  Bell, 
  CheckCircle2, 
  RotateCcw,
  Award,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flame: Flame,
  target: Target,
  star: Star,
  bell: Bell,
  'check-circle': CheckCircle2,
  'rotate-ccw': RotateCcw,
  award: Award,
  zap: Zap,
};

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', ring: 'ring-yellow-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', ring: 'ring-amber-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600', ring: 'ring-green-500/30' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', ring: 'ring-purple-500/30' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600', ring: 'ring-teal-500/30' },
  gold: { bg: 'bg-amber-400/20', text: 'text-amber-600', ring: 'ring-amber-400/40' },
};

interface ProgramAchievementBadgeProps {
  icon: string;
  badgeColor: string;
  title: string;
  description: string;
  earnedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function ProgramAchievementBadge({
  icon,
  badgeColor,
  title,
  description,
  earnedAt,
  size = 'md',
  showTooltip = true,
}: ProgramAchievementBadgeProps) {
  const Icon = iconMap[icon] || Trophy;
  const colors = colorMap[badgeColor] || colorMap.primary;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const badge = (
    <div 
      className={cn(
        sizeClasses[size],
        colors.bg,
        colors.text,
        "rounded-full flex items-center justify-center ring-2",
        colors.ring,
        "transition-transform hover:scale-110"
      )}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {earnedAt && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Earned {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface ProgramAchievementStackProps {
  achievements: Array<{
    icon: string;
    badge_color: string;
    title: string;
    description: string;
    earned_at?: string;
  }>;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgramAchievementStack({
  achievements,
  maxVisible = 4,
  size = 'sm',
}: ProgramAchievementStackProps) {
  const visible = achievements.slice(0, maxVisible);
  const remaining = achievements.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((achievement, index) => (
        <div key={index} className="relative" style={{ zIndex: maxVisible - index }}>
          <ProgramAchievementBadge
            icon={achievement.icon}
            badgeColor={achievement.badge_color}
            title={achievement.title}
            description={achievement.description}
            earnedAt={achievement.earned_at}
            size={size}
          />
        </div>
      ))}
      {remaining > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-background",
                size === 'sm' && 'w-8 h-8',
                size === 'md' && 'w-10 h-10',
                size === 'lg' && 'w-14 h-14'
              )}
            >
              +{remaining}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{remaining} more achievement{remaining > 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
