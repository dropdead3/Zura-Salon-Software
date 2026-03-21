import React, { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  DollarSign, Scissors, TrendingUp, TrendingDown, Minus, Clock, Receipt,
  ArrowUpDown, BarChart3, Loader2, Target, Users, RefreshCw, ChevronDown,
  AlertTriangle, Layers, Heart, ShoppingBag, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { ServicePopularityChart } from '@/components/dashboard/sales/ServicePopularityChart';

import { useServiceEfficiency, type ServiceEfficiencyRow, type StylistBreakdown } from '@/hooks/useServiceEfficiency';
import { RevPerHourByCategoryChart } from '@/components/dashboard/sales/RevPerHourByCategoryChart';
import { useServiceDemandTrend } from '@/hooks/useServiceDemandTrend';
import { useServiceClientAnalysis } from '@/hooks/useServiceClientAnalysis';
import { ServiceBundlingIntelligence } from '@/components/dashboard/sales/ServiceBundlingIntelligence';
import { ServiceMenuIntelligence } from '@/components/dashboard/sales/ServiceMenuIntelligence';
import { NewClientConversionCard } from '@/components/dashboard/analytics/NewClientConversionCard';
import { ServiceCostsProfitsCard } from '@/components/dashboard/sales/ServiceCostsProfitsCard';
import { useServiceRetailAttachment } from '@/hooks/useServiceRetailAttachment';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { getCategoryColor, isGradientMarker, getGradientFromMarker } from '@/utils/categoryColors';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge } from '@/components/dashboard/AnalyticsFilterBadge';
import { useAnalyticsCardOrder } from '@/hooks/useAnalyticsCardOrder';
import { AnalyticsCardReorderDrawer, type CardDefinition } from '@/components/dashboard/analytics/AnalyticsCardReorderDrawer';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

interface ServicesContentProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext: any;
  dateRange: string;
  locationName: string;
}

function resolveHexColor(colorHex: string): string {
  if (!isGradientMarker(colorHex)) return colorHex;
  const grad = getGradientFromMarker(colorHex);
  if (!grad) return '#888888';
  const match = grad.background.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#888888';
}

// Expandable drill-down wrapper
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
          <div className="pt-3 pb-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// KPI Tile component — now clickable
function KpiTile({ icon: Icon, label, value, subtitle, isLoading, isExpanded, onClick }: {
  icon: any; label: string; value: string; subtitle?: string; isLoading: boolean;
  isExpanded?: boolean; onClick?: () => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card
      className={cn('transition-colors', onClick && 'cursor-pointer hover:bg-muted/30')}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-muted flex items-center justify-center rounded-lg">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          {onClick && (
            <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform', isExpanded && 'rotate-180')} />
          )}
        </div>
        <div className="text-2xl font-display font-medium tracking-tight">
          <BlurredAmount>{value}</BlurredAmount>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  if (trend === 'rising') return <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800 text-xs gap-1"><TrendingUp className="w-3 h-3" />Rising</Badge>;
  if (trend === 'declining') return <Badge variant="outline" className="text-red-500 border-red-200 dark:text-red-400 dark:border-red-800 text-xs gap-1"><TrendingDown className="w-3 h-3" />Declining</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs gap-1"><Minus className="w-3 h-3" />Stable</Badge>;
}

function RebookBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={cn('text-xs font-medium tabular-nums w-10 text-right',
        rate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'
      )}>{Math.round(rate)}%</span>
    </div>
  );
}

type SortField = 'serviceName' | 'revPerHour' | 'avgRevenue' | 'bookings' | 'avgDuration';

// Section definitions for reorder drawer
const SERVICES_SECTION_DEFS: CardDefinition[] = [
  { id: 'kpi_tiles', label: 'KPI Tiles', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'category_mix', label: 'Service Category Mix', icon: <BarChart3 className="w-4 h-4" /> },
  
  { id: 'client_type', label: 'Client Type Analysis', icon: <Users className="w-4 h-4" /> },
  { id: 'service_popularity', label: 'Service Popularity', icon: <Scissors className="w-4 h-4" /> },
  { id: 'efficiency_matrix', label: 'Service Efficiency Matrix', icon: <Target className="w-4 h-4" /> },
  { id: 'rev_per_hour_category', label: 'Rev/Hour by Category', icon: <Clock className="w-4 h-4" /> },
  { id: 'rebook_rates', label: 'Service Rebooking Rates', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'price_realization', label: 'Price Realization', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'demand_trends', label: 'Service Demand Trends', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'service_pairings', label: 'Service Bundling Intelligence', icon: <Layers className="w-4 h-4" /> },
  { id: 'service_menu_intelligence', label: 'Service Menu Intelligence', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'service_costs_profits', label: 'Service Costs & Sales Profits', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'retail_pairing', label: 'Retail Pairing Strength', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'new_client_conversion', label: 'New Client Conversion', icon: <Users className="w-4 h-4" /> },
];
const SERVICES_DEFAULT_ORDER = SERVICES_SECTION_DEFS.map(s => s.id);

export function ServicesContent({ dateFrom, dateTo, locationId, filterContext, dateRange, locationName }: ServicesContentProps) {
  const { data, isLoading } = useServiceEfficiency(dateFrom, dateTo, locationId);
  const { data: demandTrends, isLoading: trendsLoading } = useServiceDemandTrend(locationId);
  const { data: clientAnalysis, isLoading: clientLoading } = useServiceClientAnalysis(dateFrom, dateTo, locationId);
  const { data: retailAttachment, isLoading: retailAttachmentLoading } = useServiceRetailAttachment({ dateFrom, dateTo, locationId });
  
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { formatNumber, formatPercent } = useFormatNumber();
  const { colorMap } = useServiceCategoryColorsMap();

  const [efficiencySort, setEfficiencySort] = useState<{ field: SortField; desc: boolean }>({ field: 'revPerHour', desc: true });
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedEfficiency, setExpandedEfficiency] = useState<string | null>(null);
  const [expandedDemand, setExpandedDemand] = useState<string | null>(null);
  const [expandedRebook, setExpandedRebook] = useState<string | null>(null);
  const [expandedRealization, setExpandedRealization] = useState<string | null>(null);
  const [clientView, setClientView] = useState<'magnets' | 'retention'>('magnets');

  const { orderedIds, saveOrder, resetOrder } = useAnalyticsCardOrder('services', SERVICES_DEFAULT_ORDER);

  const toggleKpi = (key: string) => setExpandedKpi(prev => prev === key ? null : key);

  // Category mix data for donut
  const categoryMix = useMemo(() => {
    if (!data?.services) return [];
    const cats = new Map<string, { revenue: number; count: number; totalDurationMin: number; services: ServiceEfficiencyRow[] }>();
    for (const s of data.services) {
      const cat = s.category;
      const existing = cats.get(cat) || { revenue: 0, count: 0, totalDurationMin: 0, services: [] };
      existing.revenue += s.totalRevenue;
      existing.count += s.bookings;
      existing.totalDurationMin += s.bookings * s.avgDuration;
      existing.services.push(s);
      cats.set(cat, existing);
    }
    const totalBookings = [...cats.values()].reduce((sum, c) => sum + c.count, 0);
    return [...cats.entries()]
      .map(([category, { revenue, count, totalDurationMin, services }]) => {
        const totalHours = totalDurationMin / 60;
        return {
          category,
          revenue,
          count,
          pct: data.totalServiceRevenue > 0 ? (revenue / data.totalServiceRevenue) * 100 : 0,
          pctBooked: totalBookings > 0 ? (count / totalBookings) * 100 : 0,
          revPerHour: totalHours > 0 ? revenue / totalHours : 0,
          avgTicket: count > 0 ? revenue / count : 0,
          color: resolveHexColor(colorMap[category.toLowerCase()]?.bg || '#888888'),
          services: services.sort((a, b) => b.totalRevenue - a.totalRevenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [data, colorMap]);

  // Sorted efficiency services
  const sortedServices = useMemo(() => {
    if (!data?.services) return [];
    return [...data.services].sort((a, b) => {
      const aVal = a[efficiencySort.field];
      const bVal = b[efficiencySort.field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return efficiencySort.desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return efficiencySort.desc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [data, efficiencySort]);

  // Price realization data
  const priceRealizationData = useMemo(() => {
    if (!data?.services) return [];
    return data.services
      .filter(s => s.menuPrice && s.menuPrice > 0 && s.bookings >= 3)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map(s => ({
        name: s.serviceName.length > 20 ? s.serviceName.slice(0, 18) + '…' : s.serviceName,
        fullName: s.serviceName,
        menuPrice: s.menuPrice!,
        avgCollected: s.avgRevenue,
        rate: s.realizationRate!,
      }));
  }, [data]);

  // Client analysis sorted views
  const clientSorted = useMemo(() => {
    if (!clientAnalysis) return [];
    const filtered = clientAnalysis.filter(s => s.totalCount >= 3);
    if (clientView === 'magnets') {
      return [...filtered].sort((a, b) => b.newClientCount - a.newClientCount).slice(0, 10);
    }
    return [...filtered].sort((a, b) => (100 - a.newClientPct) - (100 - b.newClientPct)).slice(0, 10);
  }, [clientAnalysis, clientView]);

  // Rebook data (min 5 bookings)
  const rebookData = useMemo(() => {
    if (!clientAnalysis) return [];
    return clientAnalysis
      .filter(s => s.totalCount >= 5)
      .sort((a, b) => b.rebookRate - a.rebookRate);
  }, [clientAnalysis]);

  // Enhancement 5: Lost rebooking revenue
  const rebookLostRevenue = useMemo(() => {
    if (!rebookData.length || !data?.services) return { total: 0, perService: new Map<string, number>() };
    const serviceTicket = new Map(data.services.map(s => [s.serviceName, s.avgRevenue]));
    const perService = new Map<string, number>();
    let total = 0;
    for (const s of rebookData) {
      if (s.rebookRate < 70) {
        const avgTicket = serviceTicket.get(s.serviceName) || 0;
        const lost = (0.70 - s.rebookRate / 100) * s.totalCount * avgTicket;
        perService.set(s.serviceName, lost);
        total += lost;
      }
    }
    return { total, perService };
  }, [rebookData, data]);

  // Top/bottom services for KPI drill-downs
  const top5ByTicket = useMemo(() => data?.services ? [...data.services].filter(s => s.bookings >= 3).sort((a, b) => b.avgRevenue - a.avgRevenue).slice(0, 5) : [], [data]);
  const bottom5ByTicket = useMemo(() => data?.services ? [...data.services].filter(s => s.bookings >= 3).sort((a, b) => a.avgRevenue - b.avgRevenue).slice(0, 5) : [], [data]);
  const top5ByRPH = useMemo(() => data?.services ? [...data.services].filter(s => s.revPerHour > 0 && s.bookings >= 3).sort((a, b) => b.revPerHour - a.revPerHour).slice(0, 5) : [], [data]);
  const bottom5ByRPH = useMemo(() => data?.services ? [...data.services].filter(s => s.revPerHour > 0 && s.bookings >= 3).sort((a, b) => a.revPerHour - b.revPerHour).slice(0, 5) : [], [data]);

  const toggleSort = (field: SortField) => {
    setEfficiencySort(prev =>
      prev.field === field ? { field, desc: !prev.desc } : { field, desc: true }
    );
  };

  // Category rebook/client stats from clientAnalysis
  const getCategoryClientStats = (categoryServices: ServiceEfficiencyRow[]) => {
    if (!clientAnalysis) return { newPct: 0, rebookRate: 0 };
    const names = new Set(categoryServices.map(s => s.serviceName));
    const matching = clientAnalysis.filter(c => names.has(c.serviceName));
    const totalCount = matching.reduce((s, m) => s + m.totalCount, 0);
    const newCount = matching.reduce((s, m) => s + m.newClientCount, 0);
    const rebookedCount = matching.reduce((s, m) => s + m.rebookedCount, 0);
    return {
      newPct: totalCount > 0 ? (newCount / totalCount) * 100 : 0,
      rebookRate: totalCount > 0 ? (rebookedCount / totalCount) * 100 : 0,
    };
  };

  // Build section map — each key maps to its JSX block
  const sections: Record<string, ReactNode> = {};

  sections.kpi_tiles = (
    <div className="space-y-2" key="kpi_tiles">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile icon={DollarSign} label="Service Revenue" value={formatCurrencyWhole(data?.totalServiceRevenue || 0)} subtitle="Total for period" isLoading={isLoading} isExpanded={expandedKpi === 'revenue'} onClick={() => toggleKpi('revenue')} />
        <KpiTile icon={Scissors} label="Active Services" value={formatNumber(data?.activeServiceCount || 0)} subtitle="Distinct services booked" isLoading={isLoading} isExpanded={expandedKpi === 'active'} onClick={() => toggleKpi('active')} />
        <KpiTile icon={Receipt} label="Avg Service Ticket" value={formatCurrency(data?.avgServiceTicket || 0)} subtitle="Revenue per appointment" isLoading={isLoading} isExpanded={expandedKpi === 'ticket'} onClick={() => toggleKpi('ticket')} />
        <KpiTile icon={Clock} label="Rev / Chair Hour" value={formatCurrency(data?.overallRevPerHour || 0)} subtitle={`${formatNumber(Math.round(data?.totalBookedHours || 0))} hours booked`} isLoading={isLoading} isExpanded={expandedKpi === 'rph'} onClick={() => toggleKpi('rph')} />
      </div>
      <DrillDown open={expandedKpi === 'revenue'}>
        <Card className="border-primary/20"><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Revenue by Category</p>
          <div className="space-y-2">
            {categoryMix.slice(0, 8).map(cat => (
              <div key={cat.category} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1 truncate">{cat.category}</span>
                <div className="flex-1 max-w-[200px]"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary/60" style={{ width: `${cat.pct}%` }} /></div></div>
                <span className="text-sm font-medium tabular-nums w-20 text-right"><BlurredAmount>{formatCurrencyWhole(cat.revenue)}</BlurredAmount></span>
                <span className="text-xs text-muted-foreground tabular-nums w-10">{Math.round(cat.pct)}%</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </DrillDown>
      <DrillDown open={expandedKpi === 'active'}>
        <Card className="border-primary/20"><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Services booked this period: <span className="font-medium">{data?.activeServiceCount || 0}</span></p>
          <p className="text-xs text-muted-foreground">The count of distinct services that had at least one booking. Review your full service menu to identify dormant services that may be candidates for retirement or promotion.</p>
        </CardContent></Card>
      </DrillDown>
      <DrillDown open={expandedKpi === 'ticket'}>
        <Card className="border-primary/20"><CardContent className="p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Top 5 by Avg Ticket</p>
              <div className="space-y-1.5">{top5ByTicket.map(s => (<div key={s.serviceName} className="flex justify-between text-sm"><span className="truncate max-w-[160px]">{s.serviceName}</span><span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400"><BlurredAmount>{formatCurrency(s.avgRevenue)}</BlurredAmount></span></div>))}</div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Bottom 5 by Avg Ticket</p>
              <div className="space-y-1.5">{bottom5ByTicket.map(s => (<div key={s.serviceName} className="flex justify-between text-sm"><span className="truncate max-w-[160px]">{s.serviceName}</span><span className="font-medium tabular-nums text-red-500"><BlurredAmount>{formatCurrency(s.avgRevenue)}</BlurredAmount></span></div>))}</div>
            </div>
          </div>
        </CardContent></Card>
      </DrillDown>
      <DrillDown open={expandedKpi === 'rph'}>
        <Card className="border-primary/20"><CardContent className="p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Top 5 by Rev/Hour</p>
              <div className="space-y-1.5">{top5ByRPH.map(s => (<div key={s.serviceName} className="flex justify-between text-sm"><span className="truncate max-w-[160px]">{s.serviceName}</span><span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400"><BlurredAmount>{formatCurrency(s.revPerHour)}</BlurredAmount>/hr</span></div>))}</div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Bottom 5 by Rev/Hour</p>
              <div className="space-y-1.5">{bottom5ByRPH.map(s => (<div key={s.serviceName} className="flex justify-between text-sm"><span className="truncate max-w-[160px]">{s.serviceName}</span><span className="font-medium tabular-nums text-red-500"><BlurredAmount>{formatCurrency(s.revPerHour)}</BlurredAmount>/hr</span></div>))}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Salon average: <span className="font-medium">{formatCurrency(data?.avgRevPerHour || 0)}</span>/hr</p>
        </CardContent></Card>
      </DrillDown>
    </div>
  );

  sections.category_mix = (
    <PinnableCard key="category_mix" elementKey="service_category_mix" elementName="Service Category Mix" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg"><BarChart3 className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SERVICE CATEGORY MIX</CardTitle>
                  <MetricInfoTooltip description="Revenue distribution across service categories. Shows each category's total revenue, booking count, average ticket, and revenue per hour. Click a category to see individual services." />
                </div>
                <CardDescription>Revenue distribution — click a category to drill down</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><DashboardLoader size="lg" /></div>
          ) : categoryMix.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No service data for this period</p>
          ) : (
            <div className="grid lg:grid-cols-[minmax(180px,1fr)_3fr] gap-6 items-start">
              <div className="aspect-square w-full max-w-[280px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryMix} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={0} stroke="hsl(var(--border) / 0.4)" strokeWidth={1}>
                      {categoryMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Rev/Hr</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">% Rev</TableHead>
                      <TableHead className="text-right">% Booked</TableHead>
                      <TableHead className="text-right">Avg Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryMix.map((cat) => {
                      const isExpanded = expandedCategory === cat.category;
                      const clientStats = getCategoryClientStats(cat.services);
                      return (
                         <React.Fragment key={cat.category}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="font-medium text-sm">{cat.category}</span>
                                <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm"><BlurredAmount>{formatCurrencyWhole(cat.revenue)}</BlurredAmount></TableCell>
                            <TableCell className="text-right tabular-nums text-sm"><BlurredAmount>{formatCurrency(cat.revPerHour)}</BlurredAmount><span className="text-muted-foreground">/hr</span></TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{formatNumber(cat.count)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{Math.round(cat.pct)}%</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{Math.round(cat.pctBooked)}%</TableCell>
                            <TableCell className="text-right tabular-nums text-sm"><BlurredAmount>{formatCurrency(cat.avgTicket)}</BlurredAmount></TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${cat.category}-detail`}>
                              <TableCell colSpan={7} className="p-0">
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <div className="p-4 bg-muted/20 space-y-3">
                                    <div className="flex gap-4 text-xs">
                                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> New clients: <span className="font-medium">{Math.round(clientStats.newPct)}%</span></span>
                                      <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Rebook rate: <span className="font-medium">{Math.round(clientStats.rebookRate)}%</span></span>
                                    </div>
                                    <div className="space-y-1">
                                      {cat.services.slice(0, 8).map(svc => {
                                        const avgRPH = data?.avgRevPerHour || 0;
                                        const svcAbove = svc.revPerHour > avgRPH * 1.1;
                                        const svcBelow = svc.revPerHour < avgRPH * 0.9;
                                        return (
                                        <div key={svc.serviceName} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                          <span className="truncate max-w-[180px]">{svc.serviceName}</span>
                                          <div className="flex items-center gap-4">
                                            <span className="tabular-nums">{svc.bookings} bookings</span>
                                            <span className="tabular-nums font-medium"><BlurredAmount>{formatCurrency(svc.avgRevenue)}</BlurredAmount></span>
                                            <span className={cn('tabular-nums font-medium', svcAbove && 'text-emerald-600 dark:text-emerald-400', svcBelow && 'text-red-500 dark:text-red-400')}>
                                              <BlurredAmount>{svc.revPerHour > 0 ? `${formatCurrency(svc.revPerHour)}/hr` : '—'}</BlurredAmount>
                                            </span>
                                            <span className="tabular-nums text-muted-foreground">{cat.revenue > 0 ? Math.round((svc.totalRevenue / cat.revenue) * 100) : 0}%</span>
                                          </div>
                                        </div>
                                        );
                                      })}
                                    </div>
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
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.client_type = (
    <PinnableCard key="client_type" elementKey="service_client_analysis" elementName="Client Type by Service" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg"><Users className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">{clientView === 'magnets' ? 'NEW CLIENT MAGNETS' : 'RETENTION DRIVERS'}</CardTitle>
                  <MetricInfoTooltip description="Shows the mix of new vs. returning clients for each service. 'Magnets' ranks by new client volume; 'Retention' ranks by returning client percentage. Services need 3+ bookings to appear." />
                </div>
                <CardDescription>{clientView === 'magnets' ? 'Which services attract the most new clients?' : 'Which services have the highest returning client percentage?'}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
              <div className="flex gap-1">
                <button className={cn('px-3 py-1.5 text-xs rounded-md transition-colors', clientView === 'magnets' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')} onClick={() => setClientView('magnets')}>New Clients</button>
                <button className={cn('px-3 py-1.5 text-xs rounded-md transition-colors', clientView === 'retention' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')} onClick={() => setClientView('retention')}>Retention</button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clientLoading ? (
            <div className="h-48 flex items-center justify-center"><DashboardLoader size="md" /></div>
          ) : clientSorted.length === 0 ? (
            <EmptyState icon={CalendarRange} title="Not enough data" description="Fewer than 3 services found. Try widening your date range (e.g. Last 30 Days) for more meaningful insights." />
          ) : (
            <div className="space-y-2">
              {clientSorted.map(s => (
                <div key={s.serviceName} className="flex items-center gap-3">
                  <span className="text-sm truncate w-[180px] shrink-0">{s.serviceName}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500/70 flex items-center justify-center" style={{ width: `${s.newClientPct}%` }}>
                      {s.newClientPct > 15 && <span className="text-[10px] text-white font-medium">{s.newClientCount}</span>}
                    </div>
                    <div className="h-full bg-emerald-500/70 flex items-center justify-center" style={{ width: `${100 - s.newClientPct}%` }}>
                      {(100 - s.newClientPct) > 15 && <span className="text-[10px] text-white font-medium">{s.returningCount}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-12">{s.totalCount}</span>
                </div>
              ))}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 px-1">
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500/70" /> New</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" /> Returning</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.service_popularity = (
    <PinnableCard key="service_popularity" elementKey="service_popularity_chart" elementName="Service Popularity" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <ServicePopularityChart dateFrom={dateFrom} dateTo={dateTo} filterContext={filterContext} />
    </PinnableCard>
  );

  sections.efficiency_matrix = (
    <PinnableCard key="efficiency_matrix" elementKey="service_efficiency_matrix" elementName="Service Efficiency Matrix" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg"><Target className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SERVICE EFFICIENCY MATRIX</CardTitle>
                  <MetricInfoTooltip description="Ranks services by revenue per hour. Click any row to see stylist breakdown, new client percentage, rebook rate, tips, and day-of-week booking patterns." />
                </div>
                <CardDescription>Click any row for stylist breakdown, rebook rate & client mix</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : sortedServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No service data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('serviceName')}><span className="flex items-center gap-1">Service <ArrowUpDown className="w-3 h-3" /></span></TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('avgDuration')}><span className="flex items-center justify-end gap-1">Avg Min <ArrowUpDown className="w-3 h-3" /></span></TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('avgRevenue')}><span className="flex items-center justify-end gap-1">Avg Rev <ArrowUpDown className="w-3 h-3" /></span></TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('revPerHour')}><span className="flex items-center justify-end gap-1">Rev/Hr <ArrowUpDown className="w-3 h-3" /></span></TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('bookings')}><span className="flex items-center justify-end gap-1">Bookings <ArrowUpDown className="w-3 h-3" /></span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedServices.slice(0, 20).map((s) => {
                    const avgRPH = data?.avgRevPerHour || 0;
                    const isAbove = s.revPerHour > avgRPH * 1.1;
                    const isBelow = s.revPerHour < avgRPH * 0.9;
                    const isExp = expandedEfficiency === s.serviceName;
                    return (
                      <React.Fragment key={s.serviceName}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedEfficiency(isExp ? null : s.serviceName)}>
                          <TableCell className="font-medium text-sm max-w-[200px] truncate">
                            <div className="flex items-center gap-1.5">
                              {s.serviceName}
                              {s.concentrationRisk && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                              <ChevronDown className={cn('w-3 h-3 text-muted-foreground ml-1 transition-transform shrink-0', isExp && 'rotate-180')} />
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{s.category}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{s.avgDuration > 0 ? s.avgDuration : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm"><BlurredAmount>{formatCurrency(s.avgRevenue)}</BlurredAmount></TableCell>
                          <TableCell className={cn('text-right tabular-nums text-sm font-medium', isAbove && 'text-emerald-600 dark:text-emerald-400', isBelow && 'text-red-500 dark:text-red-400')}>
                            <BlurredAmount>{s.revPerHour > 0 ? formatCurrency(s.revPerHour) : '—'}</BlurredAmount>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{formatNumber(s.bookings)}</TableCell>
                        </TableRow>
                        {isExp && (
                          <TableRow key={`${s.serviceName}-detail`}>
                            <TableCell colSpan={6} className="p-0">
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="p-4 bg-muted/20 space-y-4">
                                  <div className="flex flex-wrap gap-4 text-xs">
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> New clients: <span className="font-medium">{Math.round(s.newClientPct)}%</span></span>
                                    <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Rebook rate: <span className="font-medium">{Math.round(s.rebookRate)}%</span></span>
                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Avg tip: <span className="font-medium">{s.avgTipPct.toFixed(1)}%</span></span>
                                    {s.concentrationRisk && (
                                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3 h-3" /> Concentration risk — top stylist holds {Math.round(s.stylistBreakdown[0]?.revShare || 0)}% of revenue</span>
                                    )}
                                  </div>
                                  {s.stylistBreakdown.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Stylist Breakdown</p>
                                      <div className="space-y-1">
                                        {s.stylistBreakdown.slice(0, 5).map(st => (
                                          <div key={st.staffId} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                            <span className="truncate max-w-[140px]">{st.staffName}</span>
                                            <div className="flex items-center gap-4">
                                              <span className="tabular-nums">{st.bookings} bookings</span>
                                              <span className="tabular-nums font-medium"><BlurredAmount>{formatCurrency(st.revPerHour)}</BlurredAmount>/hr</span>
                                              <div className="w-16"><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', st.revShare > 70 ? 'bg-amber-500' : 'bg-primary/60')} style={{ width: `${st.revShare}%` }} /></div></div>
                                              <span className="tabular-nums text-muted-foreground w-10 text-right">{Math.round(st.revShare)}%</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Enhancement 3: Day-of-week mini-bars */}
                                  {s.dayDistribution && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Booking Pattern</p>
                                      <div className="flex items-end gap-1 h-8">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                          const maxDay = Math.max(...s.dayDistribution, 1);
                                          const pct = (s.dayDistribution[i] / maxDay) * 100;
                                          return (
                                            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                                              <div className="w-full bg-muted rounded-sm overflow-hidden" style={{ height: '24px' }}>
                                                <div className="w-full bg-primary/50 rounded-sm" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                                              </div>
                                              <span className="text-[9px] text-muted-foreground">{day}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {s.peakHour && s.peakHour !== '—' && (
                                        <p className="text-[10px] text-muted-foreground mt-1">Peak: <span className="font-medium">{s.peakHour}</span></p>
                                      )}
                                    </div>
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
              {data && (
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-4 px-4">
                  <span>Salon avg: <span className="font-medium">{formatCurrency(data.avgRevPerHour)}</span>/hr</span>
                  <span className="text-emerald-600 dark:text-emerald-400">■ Above avg</span>
                  <span className="text-red-500 dark:text-red-400">■ Below avg</span>
                  <span className="text-amber-500">▲ Concentration risk</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.rev_per_hour_category = (
    <RevPerHourByCategoryChart
      key="rev_per_hour_category"
      dateFrom={dateFrom}
      dateTo={dateTo}
      locationId={locationId}
      filterContext={filterContext}
    />
  );

  sections.rebook_rates = (
    <PinnableCard key="rebook_rates" elementKey="service_rebook_rates" elementName="Service Rebooking Rates" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg"><RefreshCw className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SERVICE REBOOKING RATES</CardTitle>
                  <MetricInfoTooltip description="Percentage of appointments where the client rebooked at checkout. Green (>70%) = strong retention. Amber (40-70%) = needs attention. Red (<40%) = investigate." />
                </div>
                <CardDescription>
                  Quality signal — low rebook rate means clients aren't coming back for this service
                  {rebookLostRevenue.total > 0 && (
                    <Badge variant="outline" className="ml-2 text-[10px] border-red-500/30 text-red-500">
                      Est. lost revenue: <BlurredAmount>{formatCurrencyWhole(rebookLostRevenue.total)}</BlurredAmount>
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {clientLoading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : rebookData.length === 0 ? (
            <EmptyState icon={CalendarRange} title="Not enough data" description="Fewer than 5 qualifying services found. Try widening your date range (e.g. Last 30 Days) for more meaningful insights." />
          ) : (
            <div className="space-y-1">
              {rebookData.slice(0, 15).map(s => {
                const isExp = expandedRebook === s.serviceName;
                return (
                  <div key={s.serviceName}>
                    <div className="flex items-center gap-3 py-2 px-2 rounded-md cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedRebook(isExp ? null : s.serviceName)}>
                      <span className="text-sm truncate w-[200px] shrink-0 flex items-center gap-1.5">
                        {s.serviceName}
                        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform shrink-0', isExp && 'rotate-180')} />
                      </span>
                      <div className="flex-1"><RebookBar rate={s.rebookRate} /></div>
                      <span className="text-xs text-muted-foreground tabular-nums w-16">{s.totalCount} appointments</span>
                    </div>
                    <DrillDown open={isExp}>
                      <div className="px-4 pb-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Rebook Rate by Stylist</p>
                        <div className="space-y-1">
                          {s.stylistRebook.slice(0, 5).map(st => (
                            <div key={st.staffId} className="flex items-center gap-3 text-xs">
                              <span className="truncate w-[120px]">{st.staffName}</span>
                              <div className="flex-1"><RebookBar rate={st.rate} /></div>
                              <span className="text-muted-foreground tabular-nums w-12">{st.total} appointments</span>
                            </div>
                          ))}
                        </div>
                        {/* Enhancement 5: Lost rebook revenue per service */}
                        {rebookLostRevenue.perService.has(s.serviceName) && (
                          <p className="text-[11px] text-red-500/80 mt-2 px-1">
                            If rebooking reached 70%, this service would generate an estimated <span className="font-medium">+<BlurredAmount>{formatCurrencyWhole(rebookLostRevenue.perService.get(s.serviceName)!)}</BlurredAmount></span> in additional revenue
                          </p>
                        )}
                      </div>
                    </DrillDown>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.price_realization = (
    <PinnableCard key="price_realization" elementKey="price_realization" elementName="Price Realization" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">PRICE REALIZATION</CardTitle>
                  <MetricInfoTooltip description="Compares the menu price to the average price actually collected per service. Rates below 85% indicate heavy discounting; above 105% may indicate upsells or add-ons. Click a service to see per-stylist realization." />
                </div>
                <CardDescription>Menu price vs. actual collected — where is discounting eroding margin?</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : priceRealizationData.length === 0 ? (
            <EmptyState icon={CalendarRange} title="Not enough data" description="Services need a menu price and at least 3 bookings. Try widening your date range (e.g. Last 30 Days) for more meaningful insights." />
          ) : (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceRealizationData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'menuPrice' ? 'Menu Price' : 'Avg Collected']} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="menuPrice" fill="hsl(var(--muted-foreground) / 0.3)" name="Menu Price" radius={[0, 3, 3, 0]} barSize={14} />
                    <Bar dataKey="avgCollected" name="Avg Collected" radius={[0, 3, 3, 0]} barSize={14}>
                      {priceRealizationData.map((entry, i) => (
                        <Cell key={i} fill={entry.rate < 85 ? 'hsl(0 84% 60%)' : entry.rate > 105 ? 'hsl(142 76% 36%)' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Color Key & Summary */}
              <div className="pt-3">
                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-3" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Color Key</span>
                  {[
                    { label: 'Menu Price', color: 'hsl(var(--muted-foreground) / 0.3)' },
                    { label: 'Above Menu (>105%)', color: 'hsl(142 76% 36%)' },
                    { label: 'On Target (85–105%)', color: 'hsl(var(--primary))' },
                    { label: 'Below Menu (<85%)', color: 'hsl(0 84% 60%)' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const above = priceRealizationData.filter(e => e.rate > 105).length;
                    const below = priceRealizationData.filter(e => e.rate < 85).length;
                    const onTarget = priceRealizationData.length - above - below;
                    const parts: string[] = [];
                    if (above > 0) parts.push(`${above} collecting above menu`);
                    if (onTarget > 0) parts.push(`${onTarget} on target`);
                    if (below > 0) parts.push(`${below} below menu price`);
                    return parts.join('  ·  ');
                  })()}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {priceRealizationData.map((s) => {
                  const isRealExp = expandedRealization === s.fullName;
                  const serviceData = data?.services.find(svc => svc.serviceName === s.fullName);
                  return (
                    <div key={s.fullName}>
                      <div
                        className={cn('flex items-center justify-between text-xs px-3 py-1.5 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors', isRealExp && 'bg-muted/50')}
                        onClick={() => setExpandedRealization(isRealExp ? null : s.fullName)}
                      >
                        <span className="truncate max-w-[160px] flex items-center gap-1">
                          {s.fullName}
                          <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform shrink-0', isRealExp && 'rotate-180')} />
                        </span>
                        <span className={cn('font-medium tabular-nums', s.rate < 85 && 'text-red-500', s.rate > 105 && 'text-emerald-600 dark:text-emerald-400')}>{Math.round(s.rate)}%</span>
                      </div>
                      <DrillDown open={isRealExp}>
                        {serviceData && serviceData.stylistBreakdown.length > 0 && (
                          <div className="px-3 pb-2 space-y-1">
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">Realization by Stylist</p>
                            {serviceData.stylistBreakdown.slice(0, 5).map(st => {
                              const stylistAvgPrice = st.bookings > 0 ? st.totalRevenue / st.bookings : 0;
                              const stylistRate = s.menuPrice > 0 ? (stylistAvgPrice / s.menuPrice) * 100 : 0;
                              return (
                                <div key={st.staffId} className="flex items-center justify-between text-[11px] py-0.5">
                                  <span className="truncate max-w-[100px]">{st.staffName}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="tabular-nums text-muted-foreground">{st.bookings} bookings</span>
                                    <span className="tabular-nums"><BlurredAmount>{formatCurrency(stylistAvgPrice)}</BlurredAmount></span>
                                    <span className={cn('tabular-nums font-medium w-12 text-right',
                                      stylistRate < 85 && 'text-red-500',
                                      stylistRate > 105 && 'text-emerald-600 dark:text-emerald-400',
                                      stylistRate >= 85 && stylistRate <= 105 && 'text-foreground'
                                    )}>{Math.round(stylistRate)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </DrillDown>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.demand_trends = (
    <PinnableCard key="demand_trends" elementKey="service_demand_trends" elementName="Service Demand Trends" category="Analytics Hub - Sales" dateRange={dateRange} locationName={locationName}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg"><TrendingUp className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">SERVICE DEMAND TRENDS</CardTitle>
                  <MetricInfoTooltip description="Shows 12-week booking trends for top services. Rising, stable, or declining classification is based on the slope of weekly booking counts. Click a service to see the full trend chart." />
                </div>
                <CardDescription>12-week booking trends — click to expand</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : demandTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Not enough historical data for trend analysis</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {demandTrends.map((service) => {
                const isExp = expandedDemand === service.serviceName;
                const totalAllBookings = demandTrends.reduce((s, t) => s + t.totalBookings, 0);
                const shareOfBookings = totalAllBookings > 0 ? (service.totalBookings / totalAllBookings) * 100 : 0;
                return (
                  <div key={service.serviceName} className={cn('border border-border/50 rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors', isExp && 'col-span-full')} onClick={() => setExpandedDemand(isExp ? null : service.serviceName)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium truncate leading-tight">{service.serviceName}</span>
                      <TrendIndicator trend={service.trend} />
                    </div>
                    {!isExp ? (
                      <>
                        <div className="h-12">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={service.weeks}>
                              <Line type="monotone" dataKey="count" stroke={service.trend === 'rising' ? 'hsl(142 76% 36%)' : service.trend === 'declining' ? 'hsl(0 84% 60%)' : 'hsl(var(--muted-foreground))'} strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatNumber(service.totalBookings)} bookings</p>
                      </>
                    ) : (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.2 }}>
                        <div className="h-40 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={service.weeks}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                              <XAxis dataKey="weekStart" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                              <Line type="monotone" dataKey="count" stroke={service.trend === 'rising' ? 'hsl(142 76% 36%)' : service.trend === 'declining' ? 'hsl(0 84% 60%)' : 'hsl(var(--primary))'} strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="text-muted-foreground">Total: <span className="font-medium">{formatNumber(service.totalBookings)}</span></span>
                          <span className="text-muted-foreground">Share: <span className="font-medium">{shareOfBookings.toFixed(1)}%</span> of top services</span>
                          {service.weeks.length >= 2 && (() => {
                            const lastWeek = service.weeks[service.weeks.length - 1]?.count || 0;
                            const prevWeek = service.weeks[service.weeks.length - 2]?.count || 0;
                            const wowChange = prevWeek > 0 ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0;
                            return (
                              <span className={cn(wowChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : wowChange < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                                WoW: <span className="font-medium">{wowChange > 0 ? '+' : ''}{wowChange.toFixed(0)}%</span>
                              </span>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.service_pairings = (
    <ServiceBundlingIntelligence
      key="service_pairings"
      dateFrom={dateFrom}
      dateTo={dateTo}
      locationId={locationId}
      filterContext={filterContext}
      dateRange={dateRange}
      locationName={locationName}
    />
  );

  sections.service_menu_intelligence = (
    <PinnableCard key="service_menu_intelligence" elementKey="services_menu_intelligence" elementName="Service Menu Intelligence" category="Analytics Hub - Services">
      <ServiceMenuIntelligence locationId={locationId} />
    </PinnableCard>
  );

  sections.service_costs_profits = (
    <ServiceCostsProfitsCard
      key="service_costs_profits"
      dateFrom={dateFrom}
      dateTo={dateTo}
      locationId={locationId}
      filterContext={filterContext}
      dateRange={dateRange}
      locationName={locationName}
    />
  );

  sections.retail_pairing = (
    <PinnableCard key="retail_pairing" elementKey="services_retail_pairing" elementName="Retail Pairing Strength" category="Analytics Hub - Services">
      <Card>
        <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">RETAIL PAIRING STRENGTH</CardTitle>
                  <MetricInfoTooltip description="Shows which services naturally lead to retail product sales. Attachment rate is the percentage of service transactions that also included a retail purchase. Higher rates suggest strong recommendation opportunities." />
                </div>
                <CardDescription className="text-xs mt-0.5">Which services naturally lead to product sales?</CardDescription>
              </div>
            </div>
            <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
          </div>
        </CardHeader>
        <CardContent>
          {retailAttachmentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !retailAttachment?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No service-retail data available for this period.</p>
          ) : (
            <div className="space-y-2">
              {retailAttachment.filter(r => r.totalTransactions >= 3).slice(0, 15).map((row, idx) => {
                const rateColor = row.attachmentRate >= 50
                  ? 'bg-emerald-500'
                  : row.attachmentRate >= 25
                    ? 'bg-amber-500'
                    : 'bg-red-500';
                const rateTextColor = row.attachmentRate >= 50
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : row.attachmentRate >= 25
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-500';
                return (
                  <div key={row.serviceName} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                    <span className="text-xs text-muted-foreground tabular-nums w-5 text-right">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{row.serviceName}</span>
                        {row.serviceCategory && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 shrink-0">{row.serviceCategory}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[180px]">
                          <div className={cn('h-full rounded-full', rateColor)} style={{ width: `${Math.min(row.attachmentRate, 100)}%` }} />
                        </div>
                        <span className={cn('text-xs font-medium tabular-nums w-10 text-right', rateTextColor)}>
                          {row.attachmentRate}%
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {row.attachedTransactions} of {row.totalTransactions} service visits included retail
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-medium tabular-nums"><BlurredAmount>{formatCurrencyWhole(row.retailRevenue)}</BlurredAmount></span>
                      <p className="text-[10px] text-muted-foreground">retail revenue</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );

  sections.new_client_conversion = (
    <PinnableCard key="new_client_conversion" elementKey="services_new_client_conversion" elementName="New Client Conversion" category="Analytics Hub - Services">
      <NewClientConversionCard dateFrom={dateFrom} dateTo={dateTo} locationId={locationId} />
    </PinnableCard>
  );

  return (
    <div className="space-y-6">
      {/* Reorder button */}
      <div className="flex justify-end">
        <AnalyticsCardReorderDrawer
          pageId="services"
          cards={SERVICES_SECTION_DEFS}
          orderedIds={orderedIds}
          onReorder={saveOrder}
          onReset={resetOrder}
        />
      </div>

      {/* Render sections in user's preferred order */}
      {orderedIds.map(id => sections[id] ? <div key={id}>{sections[id]}</div> : null)}
    </div>
  );
}
