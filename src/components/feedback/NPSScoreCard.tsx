import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Users, ThumbsUp, Meh, ThumbsDown } from 'lucide-react';
import { useNPSStats } from '@/hooks/useNPSAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface NPSScoreCardProps {
  organizationId?: string;
}

export function NPSScoreCard({ organizationId }: NPSScoreCardProps) {
  const { data: stats, isLoading } = useNPSStats(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No feedback data yet</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats.trend === 'up' ? 'text-green-500' : stats.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  // NPS color based on score
  const getNPSColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          NPS Score
          <span className={cn('flex items-center gap-1 text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {stats.trend === 'up' ? '+' : stats.trend === 'down' ? '' : ''}
            {stats.currentNPS - stats.previousNPS} vs last period
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-4xl font-medium', getNPSColor(stats.currentNPS))}>
            {stats.currentNPS}
          </span>
          <span className="text-muted-foreground text-sm">/ 100</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <ThumbsUp className="h-3 w-3" />
              <span className="text-lg font-medium">{stats.promoters}</span>
            </div>
            <p className="text-xs text-muted-foreground">Promoters</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-amber-600">
              <Meh className="h-3 w-3" />
              <span className="text-lg font-medium">{stats.passives}</span>
            </div>
            <p className="text-xs text-muted-foreground">Passives</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <ThumbsDown className="h-3 w-3" />
              <span className="text-lg font-medium">{stats.detractors}</span>
            </div>
            <p className="text-xs text-muted-foreground">Detractors</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm border-t pt-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{stats.totalResponses} responses</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Avg Rating:</span>
            <span className="font-medium">{stats.averageRating}/5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
