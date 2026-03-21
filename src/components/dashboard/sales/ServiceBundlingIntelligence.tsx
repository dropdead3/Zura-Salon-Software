import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useServicePairings } from '@/hooks/useServicePairings';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge } from '@/components/dashboard/AnalyticsFilterBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { getServiceCategory } from '@/utils/serviceCategorization';

interface ServiceBundlingIntelligenceProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext: any;
  dateRange: string;
  locationName: string;
}

function DrillDown({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="pt-2 pb-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ServiceBundlingIntelligence({
  dateFrom, dateTo, locationId, filterContext, dateRange, locationName,
}: ServiceBundlingIntelligenceProps) {
  const { pairings, standaloneRates, revenueLift, categoryPairings, isLoading } = useServicePairings(dateFrom, dateTo, locationId);
  const { formatCurrency } = useFormatCurrency();
  const [expandedStandalone, setExpandedStandalone] = useState<string | null>(null);
  const [expandedLift, setExpandedLift] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PinnableCard elementKey="service_pairings" elementName="Service Bundling Intelligence" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </PinnableCard>
    );
  }

  const noData = standaloneRates.length === 0 && revenueLift.length === 0 && categoryPairings.length === 0;

  // Build unique categories for heatmap
  const heatmapCats = Array.from(new Set(categoryPairings.flatMap(p => [p.categoryA, p.categoryB]))).sort();
  const pairMap = new Map<string, { count: number; pct: number }>();
  for (const p of categoryPairings) {
    pairMap.set(`${p.categoryA}|||${p.categoryB}`, { count: p.count, pct: p.pctOfMultiVisits });
    pairMap.set(`${p.categoryB}|||${p.categoryA}`, { count: p.count, pct: p.pctOfMultiVisits });
  }
  const maxCount = categoryPairings.length > 0 ? Math.max(...categoryPairings.map(p => p.count)) : 1;

  // Helper: get top pairings involving a category
  const getCategoryPairings = (category: string) =>
    categoryPairings
      .filter(p => p.categoryA === category || p.categoryB === category)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(p => ({
        partner: p.categoryA === category ? p.categoryB : p.categoryA,
        count: p.count,
        pct: p.pctOfMultiVisits,
      }));

  // Helper: get service-level pairings for a category
  const getServicePairingsForCategory = (category: string) =>
    pairings
      .filter(p => getServiceCategory(p.serviceA) === category || getServiceCategory(p.serviceB) === category)
      .slice(0, 5);

  return (
    <PinnableCard elementKey="service_pairings" elementName="Service Bundling Intelligence" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SERVICE BUNDLING INTELLIGENCE</CardTitle>
                  <MetricInfoTooltip description="Analyzes how services are booked together — standalone vs. grouped ratios, revenue lift from bundling, and natural category affinities across multi-service visits." />
                </div>
                <CardDescription>Standalone rates, revenue lift, and category pairing patterns</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section 1: Standalone vs Grouped */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Standalone vs. Grouped</h4>
            {standaloneRates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Not enough data for this period</p>
            ) : (
              <div className="space-y-2">
                {standaloneRates.map(r => {
                  const isExp = expandedStandalone === r.category;
                  const catPairings = getCategoryPairings(r.category);
                  return (
                    <div key={r.category}>
                      <div
                        className="space-y-1 cursor-pointer hover:bg-muted/20 rounded-md p-1.5 -mx-1.5 transition-colors"
                        onClick={() => setExpandedStandalone(isExp ? null : r.category)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium flex items-center gap-1">
                            {r.category}
                            <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', isExp && 'rotate-180')} />
                          </span>
                          <Badge variant="secondary" className="text-xs">{r.totalBookings} visits</Badge>
                        </div>
                        <div className="flex h-5 rounded-md overflow-hidden bg-muted/30">
                          <div
                            className="bg-amber-500/80 flex items-center justify-center text-[10px] font-medium text-amber-950 transition-all"
                            style={{ width: `${Math.max(r.standaloneRate, 4)}%` }}
                          >
                            {r.standaloneRate >= 15 ? `${Math.round(r.standaloneRate)}% solo` : ''}
                          </div>
                          <div
                            className="bg-emerald-500/80 flex items-center justify-center text-[10px] font-medium text-emerald-950 transition-all"
                            style={{ width: `${Math.max(r.groupedRate, 4)}%` }}
                          >
                            {r.groupedRate >= 15 ? `${Math.round(r.groupedRate)}% grouped` : ''}
                          </div>
                        </div>
                      </div>
                      <DrillDown open={isExp}>
                        <div className="px-2 pb-1 space-y-3">
                          {r.standaloneRate > 50 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                              {r.category} is booked alone {Math.round(r.standaloneRate)}% of the time — consider bundling
                              {catPairings.length > 0 ? ` with ${catPairings.map(p => p.partner).join(' or }` : '')}.
                            </p>
                          )}
                          {catPairings.length > 0 && (
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Top category pairings</p>
                              <div className="space-y-0.5">
                                {catPairings.map(p => (
                                  <div key={p.partner} className="flex items-center justify-between text-[11px]">
                                    <span>{r.category} + {p.partner}</span>
                                    <span className="tabular-nums text-muted-foreground">{p.count} visits ({Math.round(p.pct)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DrillDown>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground mt-3 px-1">
                  Categories with high standalone rates represent your biggest upsell opportunities — consider creating bundles.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 2: Revenue Lift */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Revenue Lift from Grouping</h4>
            {revenueLift.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Not enough data — need categories with both solo and grouped visits</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Avg Ticket (Solo)</TableHead>
                      <TableHead className="text-right">Avg Ticket (Grouped)</TableHead>
                      <TableHead className="text-right">Lift ($)</TableHead>
                      <TableHead className="text-right">Lift (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueLift.map(r => {
                      const isExp = expandedLift === r.category;
                      const servicePairs = getServicePairingsForCategory(r.category);
                      const standaloneInfo = standaloneRates.find(s => s.category === r.category);
                      return (
                         <React.Fragment key={r.category}>
                          <TableRow
                            className={cn('cursor-pointer hover:bg-muted/50', r.liftPct >= 50 && 'bg-emerald-500/5')}
                            onClick={() => setExpandedLift(isExp ? null : r.category)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {r.category}
                                {r.liftPct >= 50 && <Badge variant="outline" className="text-[10px] border-success/30 text-success-foreground">Strong</Badge>}
                                <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', isExp && 'rotate-180')} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrency(r.avgTicketSolo)}</BlurredAmount></TableCell>
                            <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrency(r.avgTicketGrouped)}</BlurredAmount></TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-success-foreground">
                              <BlurredAmount>+{formatCurrency(r.liftDollars)}</BlurredAmount>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium text-success-foreground">
                              +{Math.round(r.liftPct)}%
                            </TableCell>
                          </TableRow>
                          {isExp && (
                            <TableRow key={`${r.category}-detail`}>
                              <TableCell colSpan={5} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 bg-muted/20 space-y-3">
                                    {standaloneInfo && (
                                      <p className="text-[11px] text-muted-foreground">
                                        Based on <span className="font-medium">{standaloneInfo.standaloneCount}</span> solo visits and <span className="font-medium">{standaloneInfo.groupedCount}</span> grouped visits
                                      </p>
                                    )}
                                    {servicePairs.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-medium text-muted-foreground mb-1">Top service pairings driving this lift</p>
                                        <div className="space-y-0.5">
                                          {servicePairs.map(p => (
                                            <div key={`${p.serviceA}|${p.serviceB}`} className="flex items-center justify-between text-[11px]">
                                              <span className="truncate max-w-[250px]">{p.serviceA} + {p.serviceB}</span>
                                              <span className="tabular-nums text-muted-foreground">{p.count} visits ({Math.round(p.pctOfVisits)}%)</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {servicePairs.length === 0 && (
                                      <p className="text-[11px] text-muted-foreground">No specific service pairings found for this category in the top pairs.</p>
                                    )}
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 3: Category Pairing Heatmap */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Category Pairing Heatmap</h4>
            {heatmapCats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No multi-service visits found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-medium text-muted-foreground" />
                      {heatmapCats.map(cat => (
                        <th key={cat} className="p-2 text-center font-medium text-muted-foreground max-w-[80px] truncate">
                          {cat}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapCats.map(rowCat => (
                      <tr key={rowCat}>
                        <td className="p-2 font-medium text-muted-foreground whitespace-nowrap">{rowCat}</td>
                        {heatmapCats.map(colCat => {
                          if (rowCat === colCat) {
                            return (
                              <td key={colCat} className="p-2 text-center">
                                <div className="w-full h-10 bg-muted/30 rounded flex items-center justify-center text-muted-foreground text-[10px]">
                                  —
                                </div>
                              </td>
                            );
                          }
                          const pair = pairMap.get(`${rowCat}|||${colCat}`);
                          if (!pair) {
                            return (
                              <td key={colCat} className="p-2 text-center">
                                <div className="w-full h-10 bg-muted/10 rounded flex items-center justify-center text-muted-foreground/40 text-[10px]">
                                  0
                                </div>
                              </td>
                            );
                          }
                          const intensity = Math.min(pair.count / maxCount, 1);
                          const textColor = intensity > 0.5 ? 'text-primary-foreground' : 'text-foreground';
                          return (
                            <td key={colCat} className="p-2 text-center">
                              <div
                                className={cn('w-full h-10 rounded flex flex-col items-center justify-center transition-colors', textColor)}
                                style={{
                                  backgroundColor: `hsl(var(--primary) / ${0.08 + intensity * 0.45})`,
                                }}
                              >
                                <span className="font-medium text-[11px]">{pair.count}</span>
                                <span className={cn('text-[9px] font-normal', intensity > 0.5 ? 'opacity-80' : 'text-muted-foreground'}>{Math.round(pair.pct)}%</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-3 px-1">
                  Cell values show pairing count and % of multi-service visits. Darker = more common pairing.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
