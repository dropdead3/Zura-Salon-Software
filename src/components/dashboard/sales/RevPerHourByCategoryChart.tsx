import { useMemo, useState } from 'react';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { useServiceEfficiency, type ServiceEfficiencyRow } from '@/hooks/useServiceEfficiency';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { isGradientMarker, getGradientFromMarker } from '@/utils/categoryColors';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';

function resolveHex(colorHex: string): string {
  if (!isGradientMarker(colorHex)) return colorHex;
  const grad = getGradientFromMarker(colorHex);
  if (!grad) return '#888888';
  const match = grad.background.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#888888';
}

interface CategoryAgg {
  category: string;
  totalRevenue: number;
  totalHours: number;
  revPerHour: number;
  bookings: number;
  color: string;
  delta: number; // % above/below salon average
  topServices: {
    name: string;
    avgDuration: number;
    avgRevenue: number;
    revPerHour: number;
    bookings: number;
  }[];
  stylistBreakdown: {
    staffId: string;
    staffName: string;
    revPerHour: number;
    share: number;
    totalHours: number;
  }[];
  concentrationRisk: boolean;
}

interface Props {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext: FilterContext;
}

export function RevPerHourByCategoryChart({ dateFrom, dateTo, locationId, filterContext }: Props) {
  const { data, isLoading } = useServiceEfficiency(dateFrom, dateTo, locationId);
  const { colorMap } = useServiceCategoryColorsMap();
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { categories, salonAvg, maxRPH } = useMemo(() => {
    if (!data?.services) return { categories: [], salonAvg: 0, maxRPH: 0 };
    const salonAvg = data.overallRevPerHour;

    // Group services by category
    const catMap = new Map<string, ServiceEfficiencyRow[]>();
    for (const s of data.services) {
      const list = catMap.get(s.category) || [];
      list.push(s);
      catMap.set(s.category, list);
    }

    const cats: CategoryAgg[] = [];
    for (const [category, services] of catMap) {
      const totalRevenue = services.reduce((s, r) => s + r.totalRevenue, 0);
      const totalDurationMin = services.reduce((s, r) => s + r.bookings * r.avgDuration, 0);
      const totalHours = totalDurationMin / 60;
      const revPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
      const bookings = services.reduce((s, r) => s + r.bookings, 0);
      const color = resolveHex(colorMap[category.toLowerCase()]?.bg || '#888888');
      const delta = salonAvg > 0 ? ((revPerHour - salonAvg) / salonAvg) * 100 : 0;

      // Top 5 services by rev/hour
      const topServices = [...services]
        .filter(s => s.revPerHour > 0)
        .sort((a, b) => b.revPerHour - a.revPerHour)
        .slice(0, 5)
        .map(s => ({
          name: s.serviceName,
          avgDuration: s.avgDuration,
          avgRevenue: s.avgRevenue,
          revPerHour: s.revPerHour,
          bookings: s.bookings,
        }));

      // Aggregate stylist breakdown across services in this category
      const stylistAgg = new Map<string, { rev: number; durMin: number }>();
      for (const s of services) {
        for (const sb of s.stylistBreakdown) {
          const existing = stylistAgg.get(sb.staffId) || { rev: 0, durMin: 0 };
          existing.rev += sb.totalRevenue;
          existing.durMin += sb.totalDurationMin;
          stylistAgg.set(sb.staffId, existing);
        }
      }
      const stylistBreakdown = [...stylistAgg.entries()]
        .map(([staffId, { rev, durMin }]) => ({
          staffId,
          staffName: staffId,
          revPerHour: durMin > 0 ? (rev / durMin) * 60 : 0,
          share: totalHours > 0 ? ((durMin / 60) / totalHours) * 100 : 0,
          totalHours: durMin / 60,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

      const concentrationRisk = stylistBreakdown.length > 1 && stylistBreakdown[0].share > 70;

      cats.push({ category, totalRevenue, totalHours, revPerHour, bookings, color, delta, topServices, stylistBreakdown, concentrationRisk });
    }

    cats.sort((a, b) => b.revPerHour - a.revPerHour);
    const maxRPH = cats.length > 0 ? cats[0].revPerHour : 0;

    return { categories: cats, salonAvg, maxRPH };
  }, [data, colorMap]);

  const toggle = (cat: string) => setExpanded(prev => prev === cat ? null : cat);

  return (
    <PinnableCard elementKey="rev_per_hour_category" elementName="Rev/Hour by Category">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-base tracking-wide">REVENUE PER HOUR BY CATEGORY</CardTitle>
                <CardDescription>Which service lines generate the most revenue per hour of chair time?</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange as any} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <ChartSkeleton lines={6} className="h-[280px]" />
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No service data for this period</p>
          ) : (
            <div className="space-y-1">
              {/* Salon avg legend */}
              <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <div className="w-4 h-0 border-t-2 border-dashed border-primary/50" />
                <span>Salon avg: <BlurredAmount>{formatCurrency(salonAvg)}</BlurredAmount>/hr</span>
              </div>

              {categories.map((cat, i) => {
                const barPct = maxRPH > 0 ? (cat.revPerHour / maxRPH) * 100 : 0;
                const avgLinePct = maxRPH > 0 ? Math.min((salonAvg / maxRPH) * 100, 100) : 0;
                const isExpanded = expanded === cat.category;

                return (
                  <div key={cat.category}>
                    <button
                      onClick={() => toggle(cat.category)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center gap-3 py-2">
                        {/* Category label */}
                        <div className="w-[110px] shrink-0 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium truncate">{cat.category}</span>
                        </div>

                        {/* Bar */}
                        <div className="flex-1 relative h-8">
                          {/* Reference line */}
                          <div
                            className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-primary/30 z-10"
                            style={{ left: `${avgLinePct}%` }}
                          />
                          {/* Animated bar */}
                          <motion.div
                            className="absolute inset-y-1 left-0 rounded-md"
                            style={{ backgroundColor: cat.color + 'cc' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                          />
                          {/* Value badge on bar */}
                          <motion.div
                            className="absolute inset-y-0 flex items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            style={{ left: `${Math.min(barPct + 1, 85)}%` }}
                          >
                            <span className="text-xs font-medium tabular-nums whitespace-nowrap">
                              <BlurredAmount>{formatCurrency(cat.revPerHour)}</BlurredAmount>/hr
                            </span>
                          </motion.div>
                        </div>

                        {/* Delta badge */}
                        <div className="w-16 shrink-0 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs tabular-nums',
                              cat.delta > 5 && 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800',
                              cat.delta < -5 && 'text-red-500 border-red-200 dark:text-red-400 dark:border-red-800',
                              Math.abs(cat.delta) <= 5 && 'text-muted-foreground'
                            )}
                          >
                            {cat.delta > 0 ? '+' : '')}{Math.round(cat.delta)}%
                          </Badge>
                        </div>

                        {/* Expand chevron */}
                        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', isExpanded && 'rotate-180')} />
                      </div>
                    </button>

                    {/* Drill-down */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pl-[126px] pr-2 pb-4 space-y-4">
                            {/* Summary stats */}
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>{formatNumber(cat.bookings)} bookings</span>
                              <span><BlurredAmount>{formatCurrency(cat.totalRevenue)}</BlurredAmount> total</span>
                              <span>{formatNumber(Math.round(cat.totalHours))} hours</span>
                            </div>

                            {/* Top services table */}
                            {cat.topServices.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Top Services by Rev/Hour</p>
                                <div className="space-y-1.5">
                                  {cat.topServices.map(s => (
                                    <div key={s.name} className="flex items-center gap-2 text-sm">
                                      <span className="flex-1 truncate max-w-[200px]">{s.name}</span>
                                      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{formatMinutesToDuration(s.avgDuration)}</span>
                                      <span className="text-xs tabular-nums w-16 text-right"><BlurredAmount>{formatCurrency(s.avgRevenue)}</BlurredAmount></span>
                                      <span className="text-xs font-medium tabular-nums w-20 text-right text-primary"><BlurredAmount>{formatCurrency(s.revPerHour)}</BlurredAmount>/hr</span>
                                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{s.bookings}×</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Stylist breakdown */}
                            {cat.stylistBreakdown.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground">Stylist Breakdown</p>
                                  {cat.concentrationRisk && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800 gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Concentration Risk
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  {cat.stylistBreakdown.slice(0, 5).map(st => (
                                    <div key={st.staffId} className="flex items-center gap-2 text-sm">
                                      <span className="flex-1 truncate max-w-[160px] text-muted-foreground">{st.staffName}</span>
                                      <span className="text-xs tabular-nums w-16 text-right"><BlurredAmount>{formatCurrency(st.revPerHour)}</BlurredAmount>/hr</span>
                                      <div className="w-20">
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div className="h-full rounded-full bg-primary/50" style={{ width: `${Math.min(st.share, 100)}%` }} />
                                        </div>
                                      </div>
                                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{Math.round(st.share)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
