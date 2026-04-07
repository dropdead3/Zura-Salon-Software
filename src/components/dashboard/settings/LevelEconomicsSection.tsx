/**
 * LevelEconomicsSection — Embedded within CommissionEconomicsTab.
 * Shows level summary cards, service × level margin matrix, and stylist snapshots.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { getLevelColor } from '@/lib/level-colors';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { formatCurrency as formatCurrencyUnified } from '@/lib/format';
import {
  BarChart3,
  ChevronDown,
  Grid3X3,
  Users,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  TrendingDown,
} from 'lucide-react';
import type { StylistLevel } from '@/hooks/useStylistLevels';
import {
  useLevelEconomicsAnalyzer,
  type LevelEconomicsData,
  type MarginHealthStatus,
  type ServiceLevelMargin,
} from '@/hooks/useLevelEconomicsAnalyzer';

interface LevelEconomicsSectionProps {
  levels: StylistLevel[];
  whatIfRates?: Record<string, { service?: number; retail?: number }>;
}

const STATUS_CONFIG: Record<MarginHealthStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'Healthy', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  tight: { label: 'Tight', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: AlertTriangle },
  negative: { label: 'Underpriced', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: TrendingDown },
};

function formatPct(val: number): string {
  if (!isFinite(val)) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

function formatCurrencyLocal(val: number): string {
  return formatCurrencyUnified(val, { noCents: true }) ?? '—';
}

function getMarginColor(marginPct: number, targetPct: number): string {
  if (marginPct >= targetPct) return 'text-emerald-600';
  if (marginPct >= 0) return 'text-amber-600';
  return 'text-rose-600';
}

function getMarginBg(marginPct: number, targetPct: number): string {
  if (marginPct >= targetPct) return 'bg-emerald-500/10';
  if (marginPct >= 0) return 'bg-amber-500/10';
  return 'bg-rose-500/10';
}

function getLevelDotColor(idx: number, total: number): string {
  const levelColor = getLevelColor(idx, total);
  if (levelColor.bg.includes('amber-500')) return '#f59e0b';
  if (levelColor.bg.includes('amber-300')) return '#fcd34d';
  if (levelColor.bg.includes('amber-200')) return '#fde68a';
  if (levelColor.bg.includes('amber-100')) return '#fef3c7';
  return '#a1a1aa';
}

export function LevelEconomicsSection({ levels, whatIfRates }: LevelEconomicsSectionProps) {
  const data = useLevelEconomicsAnalyzer(levels, whatIfRates);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);

  // Find silent margin erosion alerts
  const erosionAlerts = useMemo(() =>
    data.serviceMatrix.filter(m => m.isFallbackPrice && m.appointmentCount >= 10),
    [data.serviceMatrix]
  );

  // Group matrix by service category
  const categorizedServices = useMemo(() => {
    const categories = new Map<string, ServiceLevelMargin[]>();
    for (const m of data.serviceMatrix) {
      // Only show services with any appointments
      if (m.appointmentCount === 0) continue;
      const cat = m.serviceCategory || 'Uncategorized';
      const existing = categories.get(cat) ?? [];
      existing.push(m);
      categories.set(cat, existing);
    }
    return categories;
  }, [data.serviceMatrix]);

  // Get unique services for matrix (only those with data)
  const matrixServices = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; category: string | null }[] = [];
    for (const m of data.serviceMatrix) {
      if (m.appointmentCount === 0 || seen.has(m.serviceId)) continue;
      seen.add(m.serviceId);
      result.push({ id: m.serviceId, name: m.serviceName, category: m.serviceCategory });
    }
    return result;
  }, [data.serviceMatrix]);

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (data.levelSummaries.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Data freshness header */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <Info className="w-3 h-3 shrink-0" />
        {data.dateRange ? (
          <span>
            Based on {data.totalAppointments.toLocaleString()} appointments from {data.dateRange.start} to {data.dateRange.end}
          </span>
        ) : (
          <span>No appointment data available for analysis</span>
        )}
      </div>

      {/* Silent margin erosion alerts */}
      {erosionAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-display text-xs tracking-wide text-amber-600">SILENT MARGIN EROSION</span>
            <MetricInfoTooltip description="Detected when a level uses the base service price (no level-specific override) but has a higher commission rate than base. The salon pays more commission without charging more — margin shrinks silently." />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {erosionAlerts.length} service–level combination{erosionAlerts.length !== 1 ? 's use' : ' uses'} the base price instead of a level-specific price.
            Higher commission rates on these levels erode margin silently.
          </p>
        </div>
      )}

      {/* Level Summary Cards */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className={tokens.card.title}>LEVEL MARGIN ANALYSIS</CardTitle>
                <MetricInfoTooltip description="Weighted margin for each level based on their actual service mix from the last 90 days. Accounts for commission, product cost, overhead, and hourly wage where applicable." />
              </div>
              <CardDescription>Per-level profitability based on actual service volume</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.levelSummaries.map((summary) => {
              const dotColor = getLevelDotColor(summary.levelIndex, levels.length);
              const statusCfg = STATUS_CONFIG[summary.status];

              return (
                <div
                  key={summary.levelId}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className="font-display text-xs tracking-wide">{summary.levelLabel}</span>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', statusCfg.className)}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Main metric */}
                  {summary.hasEnoughData ? (
                    <div className="text-center py-1">
                      <BlurredAmount>
                        <span className={cn('text-2xl font-display tracking-wide', getMarginColor(summary.weightedMarginPct, 0.15))}>
                          {formatPct(summary.weightedMarginPct)}
                        </span>
                      </BlurredAmount>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">weighted margin <MetricInfoTooltip description="Average margin across all services this level performs, weighted by how often each service is booked." /></p>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <span className="text-xs text-muted-foreground/60">
                        Limited data ({summary.totalAppointments} appts)
                      </span>
                    </div>
                  )}

                  {/* Cost breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">Revenue / stylist <MetricInfoTooltip description="Average monthly service revenue per stylist at this level from trailing 90-day data." /></span>
                      <BlurredAmount>
                        <span className="text-foreground">{formatCurrencyLocal(summary.avgRevenuePerStylist)}/mo</span>
                      </BlurredAmount>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stylists</span>
                      <span className="text-foreground">{summary.stylistCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Appointments</span>
                      <span className="text-foreground">{summary.totalAppointments.toLocaleString()}</span>
                    </div>
                    {summary.servicesBelow > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-600 flex items-center gap-1">Services below target <MetricInfoTooltip description="Number of services where the margin at this level falls below your target margin percentage." /></span>
                        <span className="text-amber-600">{summary.servicesBelow}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service × Level Matrix */}
      {matrixServices.length > 0 && (
        <Collapsible open={matrixOpen} onOpenChange={setMatrixOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={tokens.card.iconBox}>
                      <Grid3X3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className={tokens.card.title}>SERVICE × LEVEL MATRIX</CardTitle>
                        <MetricInfoTooltip description="Per-service margin at each level. Cells with fewer than 10 appointments show '—' to avoid misleading data. Color indicates margin health: green ≥ target, amber ≥ 0%, red < 0%." />
                      </div>
                      <CardDescription>Margin heatmap by service and level</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', matrixOpen && 'rotate-180')} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="rounded-xl border bg-card overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={cn(tokens.table.columnHeader, 'sticky left-0 bg-card z-10 min-w-[180px]')}>Service</TableHead>
                        {levels.map((level, idx) => (
                          <TableHead key={level.id} className={cn(tokens.table.columnHeader, 'text-center min-w-[100px]')}>
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getLevelDotColor(idx, levels.length) }} />
                              <span>{level.label}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="sticky left-0 bg-card z-10 text-sm">
                            <div className="flex flex-col">
                              <span>{service.name}</span>
                              {service.category && (
                                <span className="text-[10px] text-muted-foreground/60">{service.category}</span>
                              )}
                            </div>
                          </TableCell>
                          {levels.map((level) => {
                            const cell = data.serviceMatrix.find(
                              m => m.serviceId === service.id && m.levelId === level.id
                            );
                            if (!cell || cell.appointmentCount < 10) {
                              return (
                                <TableCell key={level.id} className="text-center text-xs text-muted-foreground/40">
                                  —
                                </TableCell>
                              );
                            }
                            return (
                              <TableCell key={level.id} className="text-center">
                                <div className={cn('inline-flex flex-col items-center rounded-md px-2 py-1', getMarginBg(cell.marginPct, 0.15))}>
                                  <BlurredAmount>
                                    <span className="text-xs text-foreground">{formatCurrencyLocal(cell.price)}</span>
                                  </BlurredAmount>
                                  <span className={cn('text-[10px]', getMarginColor(cell.marginPct, 0.15))}>
                                    {formatPct(cell.marginPct)}
                                  </span>
                                </div>
                                {cell.isFallbackPrice && (
                                  <div className="text-[9px] text-amber-500 mt-0.5">base price</div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Stylist Snapshots */}
      {data.stylistSnapshots.length > 0 && (
        <Collapsible open={snapshotsOpen} onOpenChange={setSnapshotsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={tokens.card.iconBox}>
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className={tokens.card.title}>STYLIST SNAPSHOTS</CardTitle>
                        <MetricInfoTooltip description="Per-stylist effective contribution based on their actual service mix and level. Sorted by hourly contribution (lowest first) to surface problems." />
                      </div>
                      <CardDescription>Individual margin performance by stylist</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', snapshotsOpen && 'rotate-180')} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="rounded-xl border bg-card overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={tokens.table.columnHeader}>Stylist</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Level</TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-center')}><div className="flex items-center justify-center gap-1">Appointments <MetricInfoTooltip description="Total appointments for this stylist in the 90-day analysis window." /></div></TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-center')}><div className="flex items-center justify-center gap-1">Revenue <MetricInfoTooltip description="Total service revenue for this stylist in the analysis window." /></div></TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-center')}><div className="flex items-center justify-center gap-1">Margin <MetricInfoTooltip description="Weighted average margin across all services this stylist performed, accounting for their actual service mix." /></div></TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-center')}><div className="flex items-center justify-center gap-1">Hourly Contribution <MetricInfoTooltip description="Effective margin earned per hour worked. Calculated as: (total margin dollars) ÷ (estimated hours worked). Higher is better." /></div></TableHead>
                        <TableHead className={cn(tokens.table.columnHeader, 'text-center')}><div className="flex items-center justify-center gap-1">Status <MetricInfoTooltip description="Healthy means margin meets target. Tight means positive but below target. Underpriced means costs exceed revenue for this stylist's mix." /></div></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.stylistSnapshots.map((snap) => {
                        const statusCfg = STATUS_CONFIG[snap.status];
                        return (
                          <TableRow key={snap.userId}>
                            <TableCell className="text-sm">{snap.fullName}</TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">{snap.levelLabel}</TableCell>
                            <TableCell className="text-center text-sm">{snap.totalAppointments}</TableCell>
                            <TableCell className="text-center text-sm">
                              <BlurredAmount>{formatCurrencyLocal(snap.totalRevenue)}</BlurredAmount>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {snap.hasEnoughData ? (
                                <BlurredAmount>
                                  <span className={getMarginColor(snap.weightedMarginPct, 0.15)}>
                                    {formatPct(snap.weightedMarginPct)}
                                  </span>
                                </BlurredAmount>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {snap.hasEnoughData ? (
                                <BlurredAmount>
                                  <span className={getMarginColor(snap.effectiveHourlyContribution, 0)}>
                                    {formatCurrencyUnified(snap.effectiveHourlyContribution, { decimals: 2 })}/hr
                                  </span>
                                </BlurredAmount>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {snap.hasEnoughData ? (
                                <Badge variant="outline" className={cn('text-[10px]', statusCfg.className)}>
                                  {statusCfg.label}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60">Low data</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
