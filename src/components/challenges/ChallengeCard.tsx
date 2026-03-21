import { motion } from 'framer-motion';
import { differenceInDays, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Users, MapPin, Clock, Target, 
  Bell, DollarSign, UserPlus, Percent, GraduationCap,
  ChevronRight
} from 'lucide-react';
import type { TeamChallenge } from '@/hooks/useChallenges';

interface ChallengeCardProps {
  challenge: TeamChallenge & { 
    myValue?: number; 
    myRank?: number;
    participantCount?: number;
  };
  onJoin?: () => void;
  onView?: () => void;
  isJoined?: boolean;
  compact?: boolean;
}

const metricIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  bells: Bell,
  retail: DollarSign,
  new_clients: UserPlus,
  retention: Percent,
  training: GraduationCap,
  tips: DollarSign,
};

const metricLabels: Record<string, string> = {
  bells: 'Bells Rung',
  retail: 'Retail Sales',
  new_clients: 'New Clients',
  retention: 'Retention Rate',
  training: 'Trainings Completed',
  tips: 'Tips Earned',
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  individual: Trophy,
  team: Users,
  location: MapPin,
};

export function ChallengeCard({
  challenge,
  onJoin,
  onView,
  isJoined = false,
  compact = false,
}: ChallengeCardProps) {
  const { formatDate } = useFormatDate();
  const MetricIcon = metricIcons[challenge.metric_type] || Target;
  const TypeIcon = typeIcons[challenge.challenge_type] || Trophy;

  const daysRemaining = differenceInDays(new Date(challenge.end_date), new Date());
  const isEnded = isPast(new Date(challenge.end_date));
  const progress = challenge.goal_value && challenge.myValue
    ? Math.min((challenge.myValue / challenge.goal_value) * 100, 100)
    : 0;

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-500/10 text-green-600 dark:text-green-400',
    completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className="group"
      >
        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-all"
          onClick={onView}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MetricIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-sans font-medium text-sm truncate">{challenge.title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                {challenge.myRank && (
                  <span className="text-xs text-muted-foreground">
                    Rank #{challenge.myRank}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {isEnded ? 'Ended' : `${daysRemaining}d left`}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {challenge.goal_value && isJoined && (
            <Progress value={progress} className="h-1 mt-3" />
          )}
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Card className="overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <MetricIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg">{challenge.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <TypeIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">
                    {challenge.challenge_type}
                  </span>
                </div>
              </div>
            </div>
            <Badge className={statusColors[challenge.status]}>
              {challenge.status}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {challenge.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {challenge.description}
            </p>
          )}

          {/* Metric info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span>{metricLabels[challenge.metric_type]}</span>
            </div>
            {challenge.goal_value && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Goal:</span>
                <span className="font-medium">{challenge.goal_value.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {formatDate(new Date(challenge.start_date), 'MMM d')} - {formatDate(new Date(challenge.end_date), 'MMM d, yyyy')}
            </span>
            {!isEnded && (
              <Badge variant="secondary" className="ml-auto">
                {daysRemaining} days left
              </Badge>
            )}
          </div>

          {/* Prize */}
          {challenge.prize_description && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Prize</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {challenge.prize_description}
              </p>
            </div>
          )}

          {/* Progress for joined challenges */}
          {isJoined && challenge.goal_value && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Progress</span>
                <span className="font-medium">
                  {challenge.myValue?.toLocaleString() || 0} / {challenge.goal_value.toLocaleString()}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              {challenge.myRank && (
                <p className="text-xs text-muted-foreground text-center">
                  Currently ranked #{challenge.myRank}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!isJoined && challenge.status === 'active' && onJoin && (
              <Button onClick={onJoin} className="flex-1">
                Join Challenge
              </Button>
            )}
            {onView && (
              <Button 
                variant={isJoined ? 'default' : 'outline'} 
                onClick={onView}
                className={isJoined ? 'flex-1' : ''}
              >
                {isJoined ? 'View Leaderboard' : 'Details'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
