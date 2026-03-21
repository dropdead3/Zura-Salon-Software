import { tokens } from '@/lib/design-tokens';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, ChevronRight, Target, Clock,
  Bell, DollarSign, UserPlus, Percent, GraduationCap 
} from 'lucide-react';
import { useMyActiveChallenges } from '@/hooks/useChallenges';
import { differenceInDays, isPast } from 'date-fns';

const metricIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  bells: Bell,
  retail: DollarSign,
  new_clients: UserPlus,
  retention: Percent,
  training: GraduationCap,
  tips: DollarSign,
};

interface ActiveChallengesWidgetProps {
  className?: string;
  maxItems?: number;
}

export function ActiveChallengesWidget({ 
  className, 
  maxItems = 3 
}: ActiveChallengesWidgetProps) {
  const { data: challenges = [], isLoading } = useMyActiveChallenges();

  const displayChallenges = challenges.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Active Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayChallenges.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Active Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No active challenges</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back later for new competitions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Active Challenges
          </CardTitle>
          {challenges.length > maxItems && (
            <Link to="/dashboard/admin/challenges">
              <Button variant="ghost" size={tokens.button.inline} className="text-xs">
                View All
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayChallenges.map((challenge, index) => {
          const MetricIcon = metricIcons[challenge.metric_type] || Target;
          const daysRemaining = differenceInDays(new Date(challenge.end_date), new Date());
          const isEnded = isPast(new Date(challenge.end_date));
          const progress = challenge.goal_value && challenge.myValue
            ? Math.min((challenge.myValue / challenge.goal_value) * 100, 100)
            : 0;

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/dashboard/admin/challenges/${challenge.id}`}>
                <div className="group p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MetricIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium truncate">{challenge.title}</h4>
                        {challenge.myRank && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            #{challenge.myRank}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {isEnded ? 'Ended' : `${daysRemaining}d left`}
                        </span>
                        {challenge.goal_value && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {challenge.myValue?.toLocaleString() || 0} / {challenge.goal_value.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  
                  {challenge.goal_value && (
                    <Progress value={progress} className="h-1 mt-3" />
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
