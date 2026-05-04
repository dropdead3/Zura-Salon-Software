/**
 * ReviewVelocityCard — Trend tile showing public review click-throughs
 * in the last 30 days vs. the prior 30, with a per-platform breakdown.
 *
 * Doctrine alignment:
 *   - Visibility contract: hides numbers below MIN_FOR_SIGNAL, shows
 *     "need N more" instead of a misleading 0% trend.
 *   - Click-throughs are a deterministic proxy for new public reviews
 *     (the actual review post happens off-platform).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { useReviewVelocity } from '@/hooks/useReviewVelocity';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
  custom: 'Custom',
};

export function ReviewVelocityCard() {
  const { data, isLoading } = useReviewVelocity(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Review Momentum</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  const v = data;
  const deltaPct = v?.delta != null ? Math.round(v.delta * 100) : null;
  const TrendIcon =
    deltaPct == null ? Minus : deltaPct > 0 ? TrendingUp : deltaPct < 0 ? TrendingDown : Minus;
  const trendColor =
    deltaPct == null
      ? 'text-muted-foreground'
      : deltaPct > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : deltaPct < 0
      ? 'text-destructive'
      : 'text-muted-foreground';

  return (
    <Card className="relative">
      <div className={tokens.kpi.infoIcon}>
        <MetricInfoTooltip
          title="Review Momentum"
          description="How many clients clicked through to leave a public review in the last 30 days, compared to the 30 days before. Hidden until at least 3 click-throughs."
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" /> Review Momentum
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <p className={tokens.kpi.value}>{v?.hasSignal ? v.current : '—'}</p>
          {v?.hasSignal && deltaPct != null && (
            <span className={`text-xs flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(deltaPct)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {v?.hasSignal
            ? `${v.perWeek.toFixed(1)} per week · vs ${v.prior} the month before`
            : (v?.current ?? 0) === 0
            ? 'Once 3 clients click through to leave a public review, you\'ll see whether your reputation is speeding up or slowing down.'
            : `${v?.current ?? 0} of 3 click-throughs in — momentum trend appears soon.`}
        </p>
        {v?.hasSignal && v.byPlatform.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {v.byPlatform.slice(0, 4).map(({ platform, count }) => (
              <span
                key={platform}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
              >
                {PLATFORM_LABEL[platform] ?? platform} · {count}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
