import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import {
  GraduationCap,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowDownCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { useTeamLevelProgress } from '@/hooks/useTeamLevelProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useLeadershipCheck } from '@/hooks/useLeadershipCheck';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

/**
 * LevelProgressNudge — dual-mode dashboard surface.
 *
 * - Leadership (owner/admin/manager): renders the analytic KPI card.
 * - Stylist (non-leadership): renders the personal single-user nudge.
 *
 * The leadership card is also exported as `LevelProgressKpiCard` so it can be
 * mounted standalone in the Analytics Hub Staffing tab and in the Command
 * Center pinned-analytics surface.
 */
export function LevelProgressNudge() {
  const { isLeadership } = useLeadershipCheck();
  return isLeadership ? <LevelProgressKpiCard /> : <MyLevelProgressNudge />;
}

// ─── Leadership: 4-bucket analytic KPI card ──────────────────────────────────

interface BucketTileProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  dotClassName: string;
  valueClassName: string;
}

function BucketTile({ label, count, icon, dotClassName, valueClassName }: BucketTileProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClassName)} />
        {icon}
        <span className="text-[11px] font-display tracking-wide uppercase truncate">{label}</span>
      </div>
      <div className={cn('text-3xl font-display tabular-nums', valueClassName)}>{count}</div>
    </div>
  );
}

/**
 * Leadership-facing 4-bucket level-progress KPI card.
 * Mountable anywhere — dashboard sections, Analytics Hub Staffing tab,
 * Command Center pinned grid.
 */
export function LevelProgressKpiCard() {
  const { counts, isLoading } = useTeamLevelProgress();
  const { dashPath } = useOrgDashboardPath();

  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <GraduationCap className={tokens.card.icon} />
            </div>
            <CardTitle className={tokens.card.title}>LEVEL PROGRESS</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Visibility-contract canon: silence is valid output when no team to evaluate.
  if (counts.total === 0) return null;

  const readyToLevelUp = counts.ready;
  const onPace = counts.inProgress;
  const atRisk = counts.atRisk;
  const needsReview = counts.belowStandard;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={tokens.card.iconBox}>
              <GraduationCap className={tokens.card.icon} />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className={tokens.card.title}>LEVEL PROGRESS</CardTitle>
              <MetricInfoTooltip description="Team-wide career progression. Ready to Level Up = meets all promotion criteria. On Pace = actively progressing. At Risk = below retention minimums (coaching). Needs Review = retention failures triggering demotion-eligible review." />
            </div>
          </div>
          <Badge variant="outline" className="text-xs tabular-nums shrink-0 font-sans">
            {counts.total} stylist{counts.total === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BucketTile
            label="Ready to Level Up"
            count={readyToLevelUp}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            dotClassName="bg-emerald-500"
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <BucketTile
            label="On Pace"
            count={onPace}
            icon={<TrendingUp className="w-3.5 h-3.5 text-primary" />}
            dotClassName="bg-primary"
            valueClassName="text-foreground"
          />
          <BucketTile
            label="At Risk"
            count={atRisk}
            icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
            dotClassName="bg-amber-500"
            valueClassName="text-amber-600 dark:text-amber-400"
          />
          <BucketTile
            label="Needs Review (Level Down)"
            count={needsReview}
            icon={<ArrowDownCircle className="w-3.5 h-3.5 text-rose-600" />}
            dotClassName="bg-rose-500"
            valueClassName="text-rose-600 dark:text-rose-400"
          />
        </div>

        <Link
          to={dashPath('/admin/graduation-tracker')}
          className="flex items-center justify-center gap-1 w-full py-2 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors group"
        >
          View team progress
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Stylist: personal single-user nudge ─────────────────────────────────────

function MyLevelProgressNudge() {
  const { user } = useAuth();
  const progress = useLevelProgress(user?.id);
  const { dashPath } = useOrgDashboardPath();

  if (!progress || !progress.currentLevelLabel) return null;

  const hasRetentionRisk = progress.retention.isAtRisk;
  const hasNextLevel = !!progress.nextLevelLabel;
  const score = Math.round(progress.compositeScore);

  return (
    <Link to={dashPath('/my-graduation')} className="block group">
      <Card className={cn(
        "relative p-4 rounded-xl transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5",
        hasRetentionRisk && "border-destructive/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            hasRetentionRisk ? "bg-destructive/10" : "bg-primary/10"
          )}>
            {hasRetentionRisk ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <GraduationCap className="w-5 h-5 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-display tracking-wide">
                {progress.currentLevelLabel}
              </span>
              {hasNextLevel && (
                <>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-muted-foreground">{progress.nextLevelLabel}</span>
                </>
              )}
            </div>

            {hasNextLevel ? (
              <div className="flex items-center gap-2">
                <Progress value={score} className="h-1.5 flex-1" />
                <span className="text-xs font-medium tabular-nums text-muted-foreground">{score}%</span>
              </div>
            ) : hasRetentionRisk ? (
              <p className="text-xs text-destructive">
                {progress.retention.failures.length} metric{progress.retention.failures.length !== 1 ? 's' : ''} below minimum
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Top level — maintaining standards</p>
            )}
          </div>

          {hasRetentionRisk && (
            <Badge variant="destructive" className="text-[10px] shrink-0">At Risk</Badge>
          )}
          {progress.isFullyQualified && hasNextLevel && (
            <Badge variant="default" className="text-[10px] shrink-0">Ready</Badge>
          )}

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
