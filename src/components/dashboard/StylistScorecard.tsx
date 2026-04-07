/**
 * StylistScorecard — Unified performance scorecard for stylists.
 * Merges level progress KPIs, Color Bar metrics, peer context, trends,
 * coaching signals, and commission uplift into a single motivating view.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Beaker,
  Lightbulb,
  DollarSign,
  ArrowRight,
  Check,
} from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useLevelProgress, type CriterionProgress } from '@/hooks/useLevelProgress';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { useStaffColorBarPerformance } from '@/hooks/color-bar/useStaffColorBarPerformance';
import { useStylistPeerAverages } from '@/hooks/useStylistPeerAverages';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useLevelUpliftEstimate } from '@/hooks/useLevelUpliftEstimate';
import { format, subDays } from 'date-fns';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

interface StylistScorecardProps {
  userId: string | undefined;
  locationId?: string | null;
}

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (direction === 'down') return <TrendingDown className="w-3 h-3 text-rose-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function formatKpiValue(value: number, unit: string) {
  if (unit === '/mo' || unit === '$') return `$${value.toLocaleString()}`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === '$/hr') return `$${value}`;
  if (unit === 'd') return `${value}d`;
  return String(value);
}

function formatGap(gap: number, unit: string) {
  if (unit === '/mo' || unit === '$') return `-$${Math.round(gap).toLocaleString()}`;
  if (unit === '%') return `-${gap.toFixed(1)} pts`;
  if (unit === '$/hr') return `-$${Math.round(gap)}`;
  if (unit === 'd') return `-${gap}d`;
  return `-${gap}`;
}

export function StylistScorecard({ userId, locationId }: StylistScorecardProps) {
  const progress = useLevelProgress(userId);
  const { data: allLevels = [] } = useStylistLevels();
  const { formatCurrency } = useFormatCurrency();

  // Color bar data — last 30 days
  const endStr = format(new Date(), 'yyyy-MM-dd');
  const startStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const { data: colorBarData } = useStaffColorBarPerformance(startStr, endStr, undefined, userId);

  // Peer averages — scoped to location if provided
  const peerAverages = useStylistPeerAverages(
    progress?.currentLevelSlug,
    userId,
    progress?.evaluationWindowDays || 30,
    locationId,
  );

  // Find current + next level commission rates
  const commissionInfo = useMemo(() => {
    if (!progress || !allLevels.length) return null;
    const sorted = [...allLevels].sort((a, b) => a.display_order - b.display_order);
    const currentIdx = sorted.findIndex(l => l.slug === progress.currentLevelSlug);
    if (currentIdx === -1) return null;

    const current = sorted[currentIdx];
    const next = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

    const normalize = (v: number) => v > 1 ? v : v * 100;

    const currentSvcRate = normalize(Number(current.service_commission_rate) || 0);
    const currentRetRate = normalize(Number(current.retail_commission_rate) || 0);
    const nextSvcRate = next ? normalize(Number(next.service_commission_rate) || 0) : null;
    const nextRetRate = next ? normalize(Number(next.retail_commission_rate) || 0) : null;

    return {
      currentSvcRate: Math.round(currentSvcRate),
      currentRetRate: Math.round(currentRetRate),
      nextSvcRate: nextSvcRate !== null ? Math.round(nextSvcRate) : null,
      nextRetRate: nextRetRate !== null ? Math.round(nextRetRate) : null,
      // Raw decimal rates for uplift hook
      currentSvcRateDecimal: (Number(current.service_commission_rate) || 0),
      nextSvcRateDecimal: next ? (Number(next.service_commission_rate) || 0) : 0,
    };
  }, [progress, allLevels]);

  // Service-price-aware uplift calculation
  const upliftEstimate = useLevelUpliftEstimate({
    userId,
    currentLevelId: progress?.currentLevelId,
    nextLevelId: progress?.nextLevelId ?? undefined,
    currentCommRate: commissionInfo?.currentSvcRateDecimal ?? 0,
    nextCommRate: commissionInfo?.nextSvcRateDecimal ?? 0,
    evaluationWindowDays: progress?.evaluationWindowDays || 30,
  });

  // Aggregate color bar metrics
  const colorBarMetrics = useMemo(() => {
    if (!colorBarData?.length) return null;
    const totalSessions = colorBarData.reduce((s, d) => s + d.mix_session_count, 0);
    const totalCost = colorBarData.reduce((s, d) => s + d.total_product_cost, 0);
    const avgWaste = totalSessions > 0
      ? colorBarData.reduce((s, d) => s + d.waste_rate * d.mix_session_count, 0) / totalSessions
      : 0;
    const avgReweigh = totalSessions > 0
      ? colorBarData.reduce((s, d) => s + d.reweigh_compliance_rate * d.mix_session_count, 0) / totalSessions
      : 0;
    const avgCost = totalSessions > 0 ? totalCost / totalSessions : 0;

    return {
      reweighCompliance: Math.round(avgReweigh),
      wasteRate: Math.round(avgWaste * 10) / 10,
      avgChemicalCost: Math.round(avgCost * 100) / 100,
      mixSessions: totalSessions,
    };
  }, [colorBarData]);

  // Generate coaching signals
  const coachingSignals = useMemo(() => {
    if (!progress) return [];
    const signals: string[] = [];

    for (const cp of progress.criteriaProgress) {
      if (cp.percent < 75 && cp.weight > 0) {
        signals.push(`${cp.label} is ${Math.round(cp.gap)} ${cp.unit === '%' ? 'pts' : cp.unit === '/mo' || cp.unit === '$' ? '' : ''} below target — focus area`);
      }
    }

    if (colorBarMetrics) {
      if (colorBarMetrics.reweighCompliance < 80) {
        signals.push(`Reweigh compliance at ${colorBarMetrics.reweighCompliance}% — below 80% target`);
      }
      if (colorBarMetrics.wasteRate > 15) {
        signals.push(`Waste rate at ${colorBarMetrics.wasteRate}% — review dispensing habits`);
      }
    }

    return signals.slice(0, 3);
  }, [progress, colorBarMetrics]);

  if (!progress) {
    return null;
  }

  const hasNextLevel = !!progress.nextLevelLabel;
  const hasColorBar = !!colorBarMetrics;
  const isTopLevel = !hasNextLevel;

  // Build dynamic column config
  const hasPeers = !!peerAverages;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={tokens.card.iconBox}>
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={cn(tokens.card.title, 'flex items-center gap-1.5')}>
                Performance Scorecard
                <MetricInfoTooltip description="A unified view of your KPI performance, Color Bar metrics, and peer standing — everything that factors into your level progression." />
              </CardTitle>
              <CardDescription className="text-xs">
                {hasNextLevel
                  ? `${progress.currentLevelLabel} → ${progress.nextLevelLabel}`
                  : `${progress.currentLevelLabel} — Current Performance`}
                {progress.levelSince && (
                  <span className="text-muted-foreground/60 ml-2">
                    Since {format(new Date(progress.levelSince), 'MMM yyyy')}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {progress.isFullyQualified && hasNextLevel ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Qualified
              </Badge>
            ) : hasNextLevel ? (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {progress.compositeScore}% Ready
              </Badge>
            ) : isTopLevel ? (
              <Badge variant="secondary" className="text-xs">
                Top Level
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Readiness — only when progressing */}
        {hasNextLevel && progress.criteria && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Overall Readiness</span>
              <span className="font-medium tabular-nums">{progress.compositeScore}%</span>
            </div>
            <Progress
              value={Math.min(100, progress.compositeScore)}
              className="h-2.5"
              indicatorClassName={cn(
                progress.compositeScore >= 100 ? 'bg-emerald-500' : 'bg-primary'
              )}
            />
          </div>
        )}

        {/* Commission Uplift — only when there's a next level */}
        {commissionInfo && commissionInfo.nextSvcRate !== null && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Commission Rates</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Current: </span>
                <span className="text-foreground tabular-nums">
                  {commissionInfo.currentSvcRate}% svc / {commissionInfo.currentRetRate}% ret
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Next Level: </span>
                <span className="text-foreground tabular-nums">
                  {commissionInfo.nextSvcRate}% svc / {commissionInfo.nextRetRate}% ret
                </span>
              </div>
            </div>
            {upliftEstimate.totalMonthlyUplift > 0 && (
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  Est. +<BlurredAmount>{formatCurrency(upliftEstimate.totalMonthlyUplift)}</BlurredAmount>/mo at next level
                </p>
                <p className="text-[9px] text-muted-foreground/60 ml-4">
                  includes service price increases
                </p>
              </div>
            )}
          </div>
        )}

        {/* KPI Performance Table */}
        {progress.criteriaProgress.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display text-xs tracking-wide text-foreground">
                {hasNextLevel ? 'What You Need' : 'Current Performance'}
              </h4>
              {hasPeers && (
                <span className="text-[10px] text-muted-foreground">
                  vs {peerAverages.peerCount} peer{peerAverages.peerCount !== 1 ? 's' : ''}
                  {locationId ? ' at this location' : ' org-wide'}
                </span>
              )}
            </div>

            {/* Column headers */}
            <div className={cn(
              'grid gap-x-3 px-2 text-[10px] text-muted-foreground border-b border-border/40 pb-1',
              hasNextLevel
                ? (hasPeers ? 'grid-cols-[1fr_auto_auto_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto_auto_auto]')
                : (hasPeers ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]')
            )}>
              <span>Metric</span>
              {hasNextLevel && <span className="text-right w-16">Target</span>}
              <span className="text-right w-16">You</span>
              {hasNextLevel && <span className="text-right w-16">Gap</span>}
              {hasPeers && <span className="text-right w-16">Avg</span>}
              <span className="w-4" />
            </div>

            {progress.criteriaProgress.filter(cp => cp.weight > 0).map(cp => {
              const peerVal = getPeerValue(cp.key, peerAverages);
              const trend = getTrend(cp);
              const isMet = cp.percent >= 100;

              return (
                <div key={cp.key} className={cn(
                  'space-y-1',
                  isMet && 'border-l-2 border-emerald-500/60 rounded-r-md'
                )}>
                  <div className={cn(
                    'grid gap-x-3 items-center px-2',
                    hasNextLevel
                      ? (hasPeers ? 'grid-cols-[1fr_auto_auto_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto_auto_auto]')
                      : (hasPeers ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]')
                  )}>
                    <span className="text-xs text-muted-foreground">{cp.label}</span>
                    {hasNextLevel && (
                      <span className="text-xs text-muted-foreground tabular-nums text-right w-16">
                        {cp.unit === '/mo' || cp.unit === '$'
                          ? <BlurredAmount>{formatKpiValue(cp.target, cp.unit)}</BlurredAmount>
                          : formatKpiValue(cp.target, cp.unit)
                        }
                      </span>
                    )}
                    <span className={cn(
                      'text-xs tabular-nums text-right w-16',
                      isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    )}>
                      {cp.unit === '/mo' || cp.unit === '$'
                        ? <BlurredAmount>{formatKpiValue(cp.current, cp.unit)}</BlurredAmount>
                        : formatKpiValue(cp.current, cp.unit)
                      }
                    </span>
                    {hasNextLevel && (
                      <span className="w-16 text-right">
                        {isMet ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500 inline-block" />
                        ) : (
                          <span className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
                            {formatGap(cp.gap, cp.unit)}
                          </span>
                        )}
                      </span>
                    )}
                    {hasPeers && (
                      <span className="text-xs text-muted-foreground/70 tabular-nums text-right w-16">
                        {peerVal !== null
                          ? (cp.unit === '/mo' || cp.unit === '$'
                            ? <BlurredAmount>{formatKpiValue(peerVal, cp.unit)}</BlurredAmount>
                            : formatKpiValue(peerVal, cp.unit))
                          : '—'
                        }
                      </span>
                    )}
                    <div className="w-4 flex justify-center">
                      <TrendIcon direction={trend} />
                    </div>
                  </div>
                  {hasNextLevel && (
                    <Progress
                      value={Math.min(100, cp.percent)}
                      className="h-1 mx-2"
                      indicatorClassName={cn(
                        isMet ? 'bg-emerald-500' : cp.percent >= 75 ? 'bg-primary' : 'bg-amber-500'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Color Bar Performance */}
        {hasColorBar && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <h4 className="font-display text-xs tracking-wide text-foreground flex items-center gap-1.5">
              <Beaker className="w-3.5 h-3.5 text-primary" />
              Color Bar Performance
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reweigh Compliance</span>
                <span className={cn(
                  'tabular-nums',
                  colorBarMetrics!.reweighCompliance >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                )}>
                  {colorBarMetrics!.reweighCompliance}%
                  {colorBarMetrics!.reweighCompliance >= 80 ? ' ✓' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Waste Rate</span>
                <span className={cn(
                  'tabular-nums',
                  colorBarMetrics!.wasteRate <= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                )}>
                  {colorBarMetrics!.wasteRate}%
                  {colorBarMetrics!.wasteRate <= 15 ? ' ✓' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg Chemical Cost</span>
                <span className="text-foreground tabular-nums">
                  <BlurredAmount>{formatCurrency(colorBarMetrics!.avgChemicalCost)}</BlurredAmount>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mix Sessions</span>
                <span className="text-foreground tabular-nums">{colorBarMetrics!.mixSessions}</span>
              </div>
            </div>
          </div>
        )}

        {/* Coaching Signals */}
        {coachingSignals.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <h4 className="font-display text-xs tracking-wide text-foreground flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Focus Areas
            </h4>
            <div className="space-y-1">
              {coachingSignals.map((signal, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {signal}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
          <span>{progress.evaluationWindowDays > 0 ? `${progress.evaluationWindowDays}-day rolling window` : ''}</span>
          {progress.timeAtLevelDays > 0 && (
            <span>{progress.timeAtLevelDays} days at current level</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Map criterion key to peer average value */
function getPeerValue(key: string, peers: ReturnType<typeof useStylistPeerAverages>): number | null {
  if (!peers) return null;
  switch (key) {
    case 'revenue': return peers.avgRevenue;
    case 'retail': return peers.avgRetailPct;
    case 'rebooking': return peers.avgRebookPct;
    case 'avg_ticket': return peers.avgTicket;
    case 'retention_rate': return peers.avgRetentionRate || null;
    case 'utilization': return peers.avgUtilization;
    case 'rev_per_hour': return peers.avgRevPerHour;
    case 'new_clients': return peers.avgNewClients;
    default: return null;
  }
}

/** Determine trend direction — real period-over-period comparison.
 *  Uses priorCurrent from the previous eval window vs current value.
 *  A 3% relative change threshold determines up/down vs flat. */
function getTrend(cp: CriterionProgress): 'up' | 'down' | 'flat' {
  if (cp.priorCurrent === 0 && cp.current === 0) return 'flat';
  if (cp.priorCurrent === 0) return 'up';

  const changePct = ((cp.current - cp.priorCurrent) / cp.priorCurrent) * 100;
  if (changePct > 3) return 'up';
  if (changePct < -3) return 'down';
  return 'flat';
}
