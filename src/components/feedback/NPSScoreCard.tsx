import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Users, ThumbsUp, Meh, ThumbsDown } from 'lucide-react';
import { useNPSStats } from '@/hooks/useNPSAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { openReputationGlossary } from './ReputationGlossary';
import { tokens } from '@/lib/design-tokens';

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

  const NPS_MIN_REPLIES = 5;
  const totalReplies = stats?.totalResponses ?? 0;

  if (!stats || totalReplies < NPS_MIN_REPLIES) {
    const remaining = Math.max(0, NPS_MIN_REPLIES - totalReplies);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Client Happiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-medium text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {totalReplies === 0
              ? 'Once 5 clients reply to a feedback request, you\'ll see a 0–100 score showing how your clients feel overall.'
              : `${totalReplies} of 5 replies in — ${remaining} more and we'll show your happiness score.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats.trend === 'up' ? 'text-green-500' : stats.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const delta = stats.currentNPS - stats.previousNPS;

  // Plain-language happiness tier
  const getTier = (score: number) => {
    if (score >= 50) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 30) return { label: 'Healthy', color: 'text-green-600' };
    if (score >= 0) return { label: 'Mixed', color: 'text-amber-600' };
    return { label: 'Needs attention', color: 'text-red-600' };
  };
  const tier = getTier(stats.currentNPS);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Client Happiness
          {delta !== 0 && (
            <span className={cn('flex items-center gap-1 text-xs', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {delta > 0 ? '+' : ''}{delta} vs last period
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-4xl font-medium', tier.color)}>
            {stats.currentNPS}
          </span>
          <span className={cn('text-sm font-medium', tier.color)}>{tier.label}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <ThumbsUp className="h-3 w-3" />
              <span className="text-lg font-medium">{stats.promoters}</span>
            </div>
            <p className="text-xs text-muted-foreground">Love you</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-amber-600">
              <Meh className="h-3 w-3" />
              <span className="text-lg font-medium">{stats.passives}</span>
            </div>
            <p className="text-xs text-muted-foreground">Lukewarm</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <ThumbsDown className="h-3 w-3" />
              <span className="text-lg font-medium">{stats.detractors}</span>
            </div>
            <p className="text-xs text-muted-foreground">Unhappy</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm border-t pt-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{stats.totalResponses} {stats.totalResponses === 1 ? 'reply' : 'replies'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Avg rating:</span>
            <span className="font-medium">{stats.averageRating}/5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
