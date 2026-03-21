import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown, ChevronRight, ChevronDown, Minus, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useClientEngagement, type ClientEngagementData } from '@/hooks/useClientEngagement';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type EngagementView = 'visits' | 'retention' | 'rebooking';

interface ClientEngagementCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
  activeView?: EngagementView;
  onViewChange?: (view: EngagementView) => void;
}

const VIEW_CONFIG: Record<EngagementView, {
  tooltipDescription: string;
  chartTitle: string;
  heroLabel: string;
  dataKey: string;
  isPercentage: boolean;
}> = {
  visits: {
    tooltipDescription: 'Total completed client visits across the team for the selected period. Excludes cancelled and no-show appointments.',
    chartTitle: 'Visits by Stylist',
    heroLabel: 'Total Visits',
    dataKey: 'value',
    isPercentage: false,
  },
  retention: {
    tooltipDescription: 'Percentage of appointments from returning clients. Higher retention indicates stronger client relationships and predictable revenue.',
    chartTitle: '% Returning by Stylist',
    heroLabel: 'Returning',
    dataKey: 'value',
    isPercentage: true,
  },
  rebooking: {
    tooltipDescription: 'Percentage of completed appointments where the client rebooked before leaving. Higher rebooking rates drive predictable revenue.',
    chartTitle: '% Rebooked by Stylist',
    heroLabel: 'Rebooked',
    dataKey: 'value',
    isPercentage: true,
  },
};

function getHeroValue(data: ClientEngagementData, view: EngagementView): string {
  switch (view) {
    case 'visits': return data.visits.total.toLocaleString();
    case 'retention': return `${Math.round(data.retention.overallRate)}%`;
    case 'rebooking': return `${Math.round(data.rebooking.overallRate)}%`;
  }
}

function getPercentChange(data: ClientEngagementData, view: EngagementView): number | null {
  switch (view) {
    case 'visits': return data.visits.percentChange;
    case 'retention': return data.retention.percentChange;
    case 'rebooking': return data.rebooking.percentChange;
  }
}

interface ChartItem {
  name: string;
  fullName: string;
  value: number;
  staffId: string;
}

/** Detect hashed/unmapped Phorest IDs — no spaces, contains underscores or >12 chars with no vowel clusters */
function isHashedId(name: string): boolean {
  if (!name) return true;
  if (name.includes(' ')) return false; // Real names have spaces
  if (name.includes('_') || name.includes('-')) return true;
  if (name.length > 12) return true;
  return false;
}

function getChartData(data: ClientEngagementData, view: EngagementView): ChartItem[] {
  const applyLabel = (name: string, idx: number) =>
    isHashedId(name) ? `Stylist ${idx + 1}` : (name.length > 14 ? name.slice(0, 13) + '…' : name);

  switch (view) {
    case 'visits':
      return data.visits.staffBreakdown.map((s, i) => ({
        name: applyLabel(s.staffName, i), fullName: isHashedId(s.staffName) ? `Stylist ${i + 1}` : s.staffName,
        value: s.totalVisits, staffId: s.staffId,
      }));
    case 'retention':
      return data.retention.staffBreakdown.map((s, i) => ({
        name: applyLabel(s.staffName, i), fullName: isHashedId(s.staffName) ? `Stylist ${i + 1}` : s.staffName,
        value: Math.round(s.returningRate), staffId: s.staffId,
      }));
    case 'rebooking':
      return data.rebooking.staffBreakdown.map((s, i) => ({
        name: applyLabel(s.staffName, i), fullName: isHashedId(s.staffName) ? `Stylist ${i + 1}` : s.staffName,
        value: Math.round(s.rebookingRate), staffId: s.staffId,
      }));
  }
}

export function ClientEngagementCard({
  const { dashPath } = useOrgDashboardPath(); dateFrom, dateTo, locationId, filterContext, activeView, onViewChange }: ClientEngagementCardProps) {
  const { data, isLoading } = useClientEngagement(dateFrom, dateTo, locationId);
  const [internalView, setInternalView] = useState<EngagementView>('visits');
  const view = activeView ?? internalView;
  const setView = (v: EngagementView) => {
    setInternalView(v);
    onViewChange?.(v);
  };
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const DEFAULT_BAR_COUNT = 5;

  const config = VIEW_CONFIG[view];

  // Loading
  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><Users className={tokens.card.icon} /></div>
              <div>
                <CardTitle className={tokens.card.title}>CLIENT ENGAGEMENT</CardTitle>
                <CardDescription>Client behavior by stylist</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-[200px_1fr] gap-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty
  const hasData = data && (
    data.visits.staffBreakdown.length > 0 ||
    data.retention.staffBreakdown.length > 0 ||
    data.rebooking.staffBreakdown.length > 0
  );

  if (!hasData) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><Users className={tokens.card.icon} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>CLIENT ENGAGEMENT</CardTitle>
                  <MetricInfoTooltip description={config.tooltipDescription} />
                </div>
                <CardDescription>Client behavior by stylist</CardDescription>
              </div>
            </div>
            {filterContext && (
              <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Users} title="No data available" description="No completed appointments found for the selected period." />
        </CardContent>
      </Card>
    );
  }

  const allChartData = getChartData(data!, view);
  const chartData = showAll ? allChartData : allChartData.slice(0, DEFAULT_BAR_COUNT);
  const hasMoreBars = allChartData.length > DEFAULT_BAR_COUNT;
  const heroValue = getHeroValue(data!, view);
  const percentChange = getPercentChange(data!, view);
  const chartHeight = Math.max(200, chartData.length * 36 + 20);

  const handleBarClick = (staffId: string) => {
    setExpandedStaff(prev => (prev === staffId ? null : staffId));
    if (!hasInteracted) setHasInteracted(true);
  };

  // Reset expanded staff when view changes
  const handleViewChange = (v: string) => {
    if (v) {
      setView(v as EngagementView);
      setExpandedStaff(null);
    }
  };

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}><Users className={tokens.card.icon} /></div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>CLIENT ENGAGEMENT</CardTitle>
                <MetricInfoTooltip description={config.tooltipDescription} />
              </div>
              <CardDescription>Client behavior by stylist</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={handleViewChange}>
              <FilterTabsList>
                <FilterTabsTrigger value="visits">Visits</FilterTabsTrigger>
                <FilterTabsTrigger value="retention">Retention</FilterTabsTrigger>
                <FilterTabsTrigger value="rebooking">Rebooking</FilterTabsTrigger>
              </FilterTabsList>
            </Tabs>
            {filterContext && (
              <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-[180px_1fr] gap-6">
          {/* Hero KPI */}
          <div className="flex flex-col items-center md:items-start justify-center gap-1.5 bg-muted/20 rounded-xl p-5 border border-border/30">
            <span className={tokens.stat.xlarge}>{heroValue}</span>
            <span className={tokens.kpi.label}>{config.heroLabel}</span>
            {percentChange !== null && (
              <div className={cn(
                'flex items-center gap-1 mt-1 text-xs font-medium',
                percentChange > 0 ? 'text-success-foreground' : percentChange < 0 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {percentChange > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : percentChange < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                <span>{Math.abs(percentChange).toFixed(1)}%</span>
                <span className="text-muted-foreground font-normal">vs prior</span>
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className={tokens.heading.subsection}>{config.chartTitle}</h3>
            </div>

            {/* Unmapped staff banner */}
            {data && !data.hasNames && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Staff names unavailable —{' '}
                  <Link to={dashPath('/admin/settings/staff-mapping')} className="text-primary hover:underline">
                    connect staff profiles in Settings
                  </Link>
                </p>
              </div>
            )}

            <svg width="0" height="0">
              <defs>
                <linearGradient id="engagementBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="engagementBarGradientActive" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
            </svg>

            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  hide
                  domain={config.isPercentage ? [0, 100] : undefined}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  stroke="hsl(var(--primary) / 0.3)"
                  strokeWidth={1}
                  onClick={(_: any, index: number) => {
                    const item = chartData[index];
                    if (item) handleBarClick(item.staffId);
                  }}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.staffId}
                      fill={expandedStaff === entry.staffId ? 'url(#engagementBarGradientActive)' : 'url(#engagementBarGradient)'}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={config.isPercentage ? ((v: number) => `${v}%`) : undefined}
                    style={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Show all / Show less toggle */}
            {hasMoreBars && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline mx-auto"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAll && 'rotate-180')} />
                {showAll ? 'Show less' : `Show all ${allChartData.length} stylists`}
              </button>
            )}

            {/* Hint */}
            <AnimatePresence>
              {!hasInteracted && (
                <motion.p
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(tokens.body.muted, 'text-xs text-center mt-1 opacity-60')}
                >
                  Click a bar to explore
                </motion.p>
              )}
            </AnimatePresence>

            {/* Drill-down */}
            <AnimatePresence mode="wait">
              {expandedStaff && (
                <DrillDown
                  key={`${view}-${expandedStaff}`}
                  data={data!}
                  view={view}
                  staffId={expandedStaff}
                  displayName={allChartData.find(c => c.staffId === expandedStaff)?.fullName}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Drill-down sub-component ──────────────────────────────────

function DrillDown({ data, view, staffId, displayName }: {
  data: ClientEngagementData;
  view: EngagementView;
  staffId: string;
  displayName?: string;
}) {
  if (view === 'visits') {
    const detail = data.visits.staffBreakdown.find(s => s.staffId === staffId);
    if (!detail) return null;
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <div className="mt-3 p-4 rounded-xl border border-border/50 bg-muted/20 space-y-4">
          <DrillHeader name={displayName || detail.staffName} userId={detail.userId} />
          <div className="grid grid-cols-3 gap-4">
            <DrillStat label="New Clients" value={detail.newClientVisits} />
            <DrillStat label="Returning" value={detail.returningClientVisits} />
            <DrillStat label="Average Ticket" value={<AnimatedBlurredAmount value={detail.avgTicket} currency="USD" />} />
          </div>
          {detail.topServices.length > 0 && (
            <div>
              <p className={cn(tokens.body.muted, 'mb-2')}>Top Services</p>
              <div className="space-y-1">
                {detail.topServices.map(svc => (
                  <div key={svc.name} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate max-w-[200px]">{svc.name}</span>
                    <span className="text-muted-foreground">{svc.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (view === 'retention') {
    const detail = data.retention.staffBreakdown.find(s => s.staffId === staffId);
    if (!detail) return null;
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <div className="mt-3 p-4 rounded-xl border border-border/50 bg-muted/20 space-y-4">
          <DrillHeader name={displayName || detail.staffName} userId={detail.userId} />
          <div className="grid grid-cols-3 gap-4">
            <DrillStat label="Total Appointments" value={detail.totalVisits} />
            <DrillStat label="New Clients" value={detail.newClientVisits} />
            <DrillStat label="Returning" value={detail.returningClientVisits} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DrillStat label="Average Ticket" value={<AnimatedBlurredAmount value={detail.avgTicket} currency="USD" />} />
            <DrillStat label="Returning Rate" value={`${Math.round(detail.returningRate)}%`} />
          </div>
        </div>
      </motion.div>
    );
  }

  // rebooking
  const detail = data.rebooking.staffBreakdown.find(s => s.staffId === staffId);
  if (!detail) return null;
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="mt-3 p-4 rounded-xl border border-border/50 bg-muted/20 space-y-4">
        <DrillHeader name={displayName || detail.staffName} userId={detail.userId} />
        <div className="grid grid-cols-3 gap-4">
          <DrillStat label="Total Appointments" value={detail.totalAppointments} />
          <DrillStat label="Rebooked" value={detail.rebookedCount} />
          <DrillStat label="Rebooking Rate" value={`${Math.round(detail.rebookingRate)}%`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DrillStat label="Average Ticket (Rebooked)" value={<AnimatedBlurredAmount value={detail.avgTicketRebooked} currency="USD" />} />
          <DrillStat label="Average Ticket (Not Rebooked)" value={<AnimatedBlurredAmount value={detail.avgTicketNotRebooked} currency="USD" />} />
        </div>
      </div>
    </motion.div>
  );
}

function DrillHeader({ name, userId }: { name: string; userId: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className={cn(tokens.heading.subsection, 'text-foreground')}>{name}</h4>
      {userId && (
        <Link
          to={`/dashboard/admin/team/${userId}`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View Profile <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function DrillStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className={tokens.body.muted}>{label}</p>
      <p className={tokens.body.emphasis}>{value}</p>
    </div>
  );
}
