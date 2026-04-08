/**
 * TrendIntelligenceSection — Detailed trend projections and daily action plan.
 *
 * Placed below the StylistScorecard on My Graduation. Shows:
 *  - Projection summary banner (on-pace / needs-focus / at-risk)
 *  - Goal-setting mode (set a target date, reverse-calculate daily targets)
 *  - Retention risk nudge (soft, non-punitive)
 *  - AI coaching button + panel
 *  - Top action cards with daily targets + service recommendations
 *  - Full KPI projection table
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useState } from 'react';
import { addDays, addMonths } from 'date-fns';
import type { TrendProjectionResult, KpiProjection } from '@/hooks/useTrendProjection';
import type { GoalModeResult } from '@/hooks/useGoalMode';
import type { CoachingResult } from '@/hooks/useAICoaching';
import { AICoachingPanel } from './AICoachingPanel';

interface TrendIntelligenceSectionProps {
  projection: TrendProjectionResult;
  evaluationWindowDays: number;
  hasNextLevel: boolean;
  /** Goal mode state from useGoalMode */
  goalMode?: GoalModeResult;
  /** AI coaching state */
  coaching?: CoachingResult | null;
  isCoachingLoading?: boolean;
  onRequestCoaching?: () => void;
  onDismissCoaching?: () => void;
}

function TrajectoryIcon({ trajectory }: { trajectory: 'improving' | 'declining' | 'flat' }) {
  if (trajectory === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trajectory === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function formatProjectedValue(value: number, unit: string): string {
  if (unit === '/mo' || unit === '$') return `$${Math.round(value).toLocaleString()}`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === '$/hr') return `$${Math.round(value)}/hr`;
  if (unit === 'd') return `${Math.round(value)}d`;
  return String(Math.round(value));
}

const feasibilityConfig = {
  achievable: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-950/10', label: 'Achievable' },
  aggressive: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/10', label: 'Aggressive' },
  extreme: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/50 dark:bg-rose-950/10', label: 'Very Aggressive' },
};

function ActionCard({ projection, goalTarget }: { projection: KpiProjection; goalTarget?: { dailyLabel: string; feasibility: 'achievable' | 'aggressive' | 'extreme' } }) {
  const [expanded, setExpanded] = useState(false);

  const trajectoryLabel = projection.trajectory === 'improving'
    ? 'Trending up'
    : projection.trajectory === 'declining'
    ? 'Trending down'
    : 'Holding steady';

  const trajectoryColor = projection.trajectory === 'improving'
    ? 'text-emerald-600 dark:text-emerald-400'
    : projection.trajectory === 'declining'
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-all cursor-pointer',
        projection.trajectory === 'declining'
          ? 'border-rose-200/60 bg-rose-50/30 dark:border-rose-800/40 dark:bg-rose-950/10'
          : 'border-border/60 bg-card-inner-deep hover:border-border/80'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrajectoryIcon trajectory={projection.trajectory} />
          <span className="text-sm text-foreground">{projection.label}</span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums">
            {goalTarget ? goalTarget.dailyLabel : projection.dailyTarget}
          </Badge>
          {goalTarget && (
            <span className={cn('text-[9px]', feasibilityConfig[goalTarget.feasibility].color)}>
              {feasibilityConfig[goalTarget.feasibility].label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {projection.daysToTarget !== null && (
            <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{projection.daysToTarget}d
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <Progress
          value={Math.min(100, (projection.current / Math.max(1, projection.target)) * 100)}
          className="h-1.5 flex-1"
          indicatorClassName={cn(
            projection.isMet ? 'bg-emerald-500'
              : projection.trajectory === 'declining' ? 'bg-rose-500'
              : 'bg-amber-500'
          )}
        />
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {projection.unit === '/mo' || projection.unit === '$'
            ? <BlurredAmount>{formatProjectedValue(projection.current, projection.unit)}</BlurredAmount>
            : formatProjectedValue(projection.current, projection.unit)
          }
          {' / '}
          {projection.unit === '/mo' || projection.unit === '$'
            ? <BlurredAmount>{formatProjectedValue(projection.target, projection.unit)}</BlurredAmount>
            : formatProjectedValue(projection.target, projection.unit)
          }
        </span>
      </div>

      {/* Trajectory label */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className={trajectoryColor}>{trajectoryLabel}</span>
        {projection.daysToTarget !== null && projection.trajectory === 'improving' && (
          <span className="text-muted-foreground">
            — on pace to reach target in ~{projection.daysToTarget} days
          </span>
        )}
        {projection.trajectory === 'declining' && (
          <span className="text-muted-foreground">
            — needs attention to avoid falling further behind
          </span>
        )}
      </div>

      {/* Expanded: recommendation */}
      {expanded && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {projection.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendIntelligenceSection({
  projection,
  evaluationWindowDays,
  hasNextLevel,
  goalMode,
  coaching,
  isCoachingLoading,
  onRequestCoaching,
  onDismissCoaching,
}: TrendIntelligenceSectionProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (projection.projections.length === 0) return null;

  // Top-level stylists (no next level) — show maintenance view if any metrics declining
  const isTopLevel = !hasNextLevel;
  const decliningMetrics = projection.projections.filter(p => p.trajectory === 'declining');
  if (isTopLevel && decliningMetrics.length === 0) return null; // All stable, no need to show

  const unmetProjections = projection.projections.filter(p => !p.isMet);
  const allMet = unmetProjections.length === 0;

  // Build goal target lookup
  const goalTargetMap = new Map<string, { dailyLabel: string; feasibility: 'achievable' | 'aggressive' | 'extreme' }>();
  if (goalMode?.isActive && goalMode.goalTargets.length > 0) {
    for (const gt of goalMode.goalTargets) {
      goalTargetMap.set(gt.key, { dailyLabel: gt.dailyLabel, feasibility: gt.feasibility });
    }
  }

  // Summary banner colors
  const bannerConfig = {
    on_track: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/40',
      icon: <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      textColor: 'text-emerald-700 dark:text-emerald-400',
    },
    needs_focus: {
      bg: 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-800/40',
      icon: <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      textColor: 'text-amber-700 dark:text-amber-400',
    },
    at_risk: {
      bg: 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-800/40',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      textColor: 'text-rose-700 dark:text-rose-400',
    },
  }[projection.summaryStatus];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={cn(tokens.card.title, 'flex items-center gap-1.5')}>
                Trend Intelligence
                <MetricInfoTooltip description={`Based on your ${evaluationWindowDays}-day rolling performance trend. Projections show when you'll reach each target at your current pace, plus daily action targets to accelerate.`} />
              </CardTitle>
              <CardDescription className="text-xs">
                {evaluationWindowDays}-day trend analysis · What to focus on
              </CardDescription>
            </div>
          </div>

          {/* Goal Mode + AI Coaching buttons */}
          <div className="flex items-center gap-2">
            {/* Goal-setting mode toggle */}
            {goalMode && (
              goalMode.isActive ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn(
                    'text-[10px] h-5 px-1.5 border',
                    feasibilityConfig[goalMode.overallFeasibility].color,
                  )}>
                    <CalendarDays className="w-3 h-3 mr-0.5" />
                    {goalMode.daysRemaining}d left
                  </Badge>
                  <button
                    onClick={() => goalMode.setTargetDate(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
                      <CalendarDays className="w-3 h-3" />
                      Set Goal Date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={undefined}
                      onSelect={(date) => {
                        if (date) {
                          goalMode.setTargetDate(date);
                          setCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => date < addDays(new Date(), 7)}
                      initialFocus
                      fromDate={addDays(new Date(), 7)}
                      toDate={addMonths(new Date(), 12)}
                    />
                  </PopoverContent>
                </Popover>
              )
            )}

            {/* AI Coaching button */}
            {onRequestCoaching && !coaching && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1 px-2"
                onClick={onRequestCoaching}
                disabled={isCoachingLoading}
              >
                {isCoachingLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {isCoachingLoading ? 'Generating...' : 'AI Coaching'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Goal Mode Summary */}
        {goalMode?.isActive && goalMode.daysRemaining && (
          <div className={cn(
            'rounded-lg border p-3 flex items-center gap-3',
            feasibilityConfig[goalMode.overallFeasibility].bg,
            goalMode.overallFeasibility === 'achievable' ? 'border-emerald-200/60 dark:border-emerald-800/40'
              : goalMode.overallFeasibility === 'aggressive' ? 'border-amber-200/60 dark:border-amber-800/40'
              : 'border-rose-200/60 dark:border-rose-800/40'
          )}>
            <CalendarDays className={cn('w-4 h-4', feasibilityConfig[goalMode.overallFeasibility].color)} />
            <div className="flex-1">
              <p className={cn('text-sm', feasibilityConfig[goalMode.overallFeasibility].color)}>
                Goal: Level up in {goalMode.daysRemaining} days — {feasibilityConfig[goalMode.overallFeasibility].label.toLowerCase()} pace
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Daily targets below are adjusted to meet your goal date. {goalMode.overallFeasibility === 'extreme' && 'This timeline requires exceptional effort — consider a longer horizon.'}
              </p>
            </div>
          </div>
        )}

        {/* Projection Summary Banner */}
        {!goalMode?.isActive && (
          <div className={cn(
            'rounded-lg border p-3 flex items-center gap-3',
            isTopLevel
              ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-800/40'
              : bannerConfig.bg
          )}>
            {isTopLevel ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : bannerConfig.icon}
            <div className="flex-1">
              <p className={cn('text-sm', isTopLevel ? 'text-amber-700 dark:text-amber-400' : bannerConfig.textColor)}>
                {isTopLevel
                  ? `${decliningMetrics.length} metric${decliningMetrics.length > 1 ? 's' : ''} trending down — review recommended`
                  : projection.summaryLabel}
              </p>
              {isTopLevel && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Maintaining your current level requires steady performance across all metrics.
                </p>
              )}
              {!isTopLevel && allMet && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Maintain your current performance to stay qualified for promotion.
                </p>
              )}
            </div>
            {!isTopLevel && allMet && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
          </div>
        )}

        {/* AI Coaching Panel */}
        {coaching && onDismissCoaching && (
          <AICoachingPanel coaching={coaching} onClose={onDismissCoaching} />
        )}

        {/* Retention Risk Nudge (soft) */}
        {projection.retentionRisks.length > 0 && (
          <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Below minimum standards — coaching recommended
              </span>
            </div>
            <div className="space-y-1">
              {projection.retentionRisks.map(risk => (
                <div key={risk.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrajectoryIcon trajectory={risk.trajectory} />
                  <span>{risk.label}:</span>
                  <span className="tabular-nums text-foreground">
                    {formatProjectedValue(risk.current, risk.unit)}
                  </span>
                  <span>→ min</span>
                  <span className="tabular-nums">
                    {formatProjectedValue(risk.minimum, risk.unit)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Priority Actions */}
        {projection.topActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-display text-xs tracking-wide text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              {allMet ? 'Maintenance Focus' : 'Highest-Impact Actions'}
            </h4>
            <div className="space-y-2">
              {projection.topActions.map(action => (
                <ActionCard
                  key={action.key}
                  projection={action}
                  goalTarget={goalTargetMap.get(action.key)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Full KPI Projection Grid (remaining KPIs not in top actions) */}
        {remainingMetrics.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <h4 className="font-display text-xs tracking-wide text-muted-foreground">
              All Metrics
            </h4>
            <div className="space-y-1.5">
              {remainingMetrics.map(p => (
                <div key={p.key} className="flex items-center gap-3 text-xs">
                  <TrajectoryIcon trajectory={p.trajectory} />
                  <span className="text-muted-foreground flex-1">{p.label}</span>
                  {p.isMet ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 tabular-nums">
                        {goalTargetMap.get(p.key)?.dailyLabel || p.dailyTarget}
                      </Badge>
                      {p.daysToTarget !== null && (
                        <span className="text-muted-foreground tabular-nums text-[10px]">
                          ~{p.daysToTarget}d
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
          Projections based on {evaluationWindowDays}-day rolling window.
          {goalMode?.isActive ? ' Daily targets adjusted to meet your goal date.' : ' Daily targets assume consistent effort over the evaluation period.'}
        </div>
      </CardContent>
    </Card>
  );
}
