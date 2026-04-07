import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { GraduationCap, CheckCircle2, ShieldCheck, AlertTriangle, DollarSign, Check } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { useResolveCommission } from '@/hooks/useResolveCommission';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useLevelUpliftEstimate } from '@/hooks/useLevelUpliftEstimate';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

interface LevelProgressCardProps {
  userId: string | undefined;
  compact?: boolean;
}

function formatValue(val: number, unit: string) {
  if (unit === '/mo' || unit === '$') return `$${val.toLocaleString()}`;
  if (unit === '%') return `${val.toFixed(1)}%`;
  if (unit === '$/hr') return `$${val}/hr`;
  if (unit === 'd') return `${val}d`;
  return String(val);
}

function formatGap(gap: number, unit: string) {
  if (unit === '/mo' || unit === '$') return `-$${Math.round(gap).toLocaleString()}`;
  if (unit === '%') return `-${gap.toFixed(1)} pts`;
  if (unit === '$/hr') return `-$${Math.round(gap)}`;
  if (unit === 'd') return `-${gap}d`;
  return `-${gap}`;
}

function CriterionRow({ label, current, target, percent, unit, gap }: {
  label: string;
  current: number;
  target: number;
  percent: number;
  unit: string;
  gap: number;
}) {
  const isMet = percent >= 100;

  return (
    <div className={cn(
      'rounded-md px-2 py-1.5',
      isMet && 'border-l-2 border-emerald-500/60'
    )}>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums text-right w-16">
          {formatValue(target, unit)}
        </span>
        <span className={cn(
          'tabular-nums text-right w-16',
          isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
        )}>
          {formatValue(current, unit)}
        </span>
        <span className="w-16 text-right">
          {isMet ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 inline-block" />
          ) : (
            <span className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
              {formatGap(gap, unit)}
            </span>
          )}
        </span>
      </div>
      <Progress
        value={Math.min(100, percent)}
        className="h-1 mt-1"
        indicatorClassName={cn(
          isMet ? 'bg-emerald-500' : percent >= 75 ? 'bg-primary' : 'bg-amber-500'
        )}
      />
    </div>
  );
}

export function LevelProgressCard({ userId, compact = false }: LevelProgressCardProps) {
  const progress = useLevelProgress(userId);
  const { resolveCommission } = useResolveCommission();
  const { data: allLevels = [] } = useStylistLevels();

  // Compute commission rates for uplift (must be before early return for hooks rules)
  const currentResolved = (progress?.nextLevelLabel && userId) ? resolveCommission(userId, 1000, 0) : null;
  const nextLevelObj = allLevels.find(l => l.id === progress?.nextLevelId);
  const currentSvcRate = currentResolved?.serviceRate ?? 0;
  const nextSvcRate = nextLevelObj?.service_commission_rate ?? 0;

  const upliftEstimate = useLevelUpliftEstimate({
    userId,
    currentLevelId: progress?.currentLevelId,
    nextLevelId: progress?.nextLevelId ?? undefined,
    currentCommRate: currentSvcRate,
    nextCommRate: nextSvcRate,
    evaluationWindowDays: progress?.evaluationWindowDays || 30,
  });

  if (!progress || (!progress.nextLevelLabel && !progress.retention?.isAtRisk)) {
    return null;
  }

  // Use price-aware uplift if available, otherwise fall back to simple rate-delta calculation
  const monthlyRevenue = progress.criteriaProgress.find(cp => cp.key === 'revenue')?.current || 0;
  const simpleUplift = Math.round(monthlyRevenue * (nextSvcRate - currentSvcRate));
  const effectiveUplift = upliftEstimate.totalMonthlyUplift > 0 ? upliftEstimate.totalMonthlyUplift : simpleUplift;
  const hasPriceComponent = upliftEstimate.totalMonthlyUplift > 0 && upliftEstimate.priceUplift > 0;

  let upliftSection: React.ReactNode = null;
  if (progress.nextLevelLabel && nextSvcRate > currentSvcRate && effectiveUplift > 0) {
    upliftSection = (
      <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 mb-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-medium">Income Opportunity</span>
          <MetricInfoTooltip description="This estimate is based on your actual service mix over the evaluation window. It accounts for two factors: (1) higher service prices at the next level, and (2) a higher commission rate applied to that revenue. The uplift reflects what you'd earn monthly if you were already at the next level, compared to today." />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Commission Today</p>
            <p className="text-sm tabular-nums">{(currentSvcRate * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">At {progress.nextLevelLabel}</p>
            <p className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400">{(nextSvcRate * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Monthly Uplift</p>
            <BlurredAmount className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
              +${upliftEstimate.totalMonthlyUplift.toLocaleString()}
            </BlurredAmount>
          </div>
        </div>
        <p className="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 mt-1 text-center">
          includes service price increases
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={tokens.card.iconBox}>
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={cn(tokens.card.title, 'flex items-center gap-1.5')}>
                Level Progress
                <MetricInfoTooltip description="Shows how close this stylist is to meeting the graduation criteria for their next level, based on rolling performance data." />
              </CardTitle>
              <CardDescription className="text-xs">
                {progress.nextLevelLabel
                  ? `${progress.currentLevelLabel} → ${progress.nextLevelLabel}`
                  : `${progress.currentLevelLabel} — Retention Status`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {progress.isFullyQualified && progress.nextLevelLabel ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Qualified
              </Badge>
            ) : progress.nextLevelLabel ? (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {progress.compositeScore}%
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Retention warning */}
        {progress.retention?.isAtRisk && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20 space-y-2">
            <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-medium">
                {progress.retention.actionType === 'demotion_eligible' ? 'Below minimum standards — demotion eligible' : 'Below minimum standards — coaching recommended'}
              </span>
            </div>
            {progress.retention.failures.map(f => (
              <div key={f.key} className="flex items-center justify-between text-xs">
                <span className="text-rose-600 dark:text-rose-400">{f.label}</span>
                <span className="tabular-nums text-rose-700 dark:text-rose-300">
                  {f.unit === '/mo' || f.unit === '$' ? `$${f.current.toLocaleString()}` : `${f.current}${f.unit}`}
                  <span className="text-rose-400"> / min {f.unit === '/mo' || f.unit === '$' ? `$${f.minimum.toLocaleString()}` : `${f.minimum}${f.unit}`}</span>
                </span>
              </div>
            ))}
            {progress.retention.gracePeriodDays > 0 && (
              <p className="text-[10px] text-rose-500">{progress.retention.gracePeriodDays}-day grace period</p>
            )}
          </div>
        )}

        {/* Composite progress bar */}
        {progress.nextLevelLabel && progress.criteria && (
          <>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Overall Readiness</span>
                <span className="font-medium tabular-nums">{progress.compositeScore}%</span>
              </div>
              <Progress
                value={Math.min(100, progress.compositeScore)}
                className="h-2"
                indicatorClassName={cn(
                  progress.compositeScore >= 100 ? 'bg-emerald-500' : 'bg-primary'
                )}
              />
            </div>

            {/* What You Need — criterion table */}
            <div className="space-y-1">
              <h4 className="font-display text-xs tracking-wide text-foreground mb-2">
                What You Need
              </h4>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-2 text-[10px] text-muted-foreground border-b border-border/40 pb-1">
                <span>Metric</span>
                <span className="text-right w-16">Target</span>
                <span className="text-right w-16">You</span>
                <span className="text-right w-16">Gap</span>
              </div>

              {progress.criteriaProgress.map(cp => (
                <CriterionRow
                  key={cp.key}
                  label={cp.label}
                  current={cp.current}
                  target={cp.target}
                  percent={cp.percent}
                  unit={cp.unit}
                  gap={cp.gap}
                />
              ))}
            </div>
          </>
        )}

        {/* Income Opportunity */}
        {upliftSection}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
          <span>{progress.evaluationWindowDays > 0 ? `${progress.evaluationWindowDays}-day rolling window` : ''}</span>
          {progress.requiresApproval && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Requires approval
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
