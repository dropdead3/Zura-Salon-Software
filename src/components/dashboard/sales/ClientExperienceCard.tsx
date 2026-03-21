import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, TrendingUp, TrendingDown, Minus, ChevronDown, Info, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useClientExperience, type ClientExperienceData, type ExperienceStatus } from '@/hooks/useClientExperience';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type ExperienceMetric = 'avgTip' | 'tipRate' | 'feedbackRate' | 'rebookRate' | 'composite';

interface ClientExperienceCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
}

const METRIC_CONFIG: Record<Exclude<ExperienceMetric, 'composite'>, {
  label: string;
  tooltip: string;
  isPercentage: boolean;
  isCurrency: boolean;
  dataKey: keyof Pick<ClientExperienceData['staffBreakdown'][number], 'avgTip' | 'tipRate' | 'feedbackRate' | 'rebookRate'>;
}> = {
  avgTip: {
    label: 'Avg Tip',
    tooltip: 'Average tip amount per completed appointment across all staff.',
    isPercentage: false,
    isCurrency: true,
    dataKey: 'avgTip',
  },
  tipRate: {
    label: 'Tip Rate',
    tooltip: 'Percentage of completed appointments that received any tip.',
    isPercentage: true,
    isCurrency: false,
    dataKey: 'tipRate',
  },
  feedbackRate: {
    label: 'Feedback Rate',
    tooltip: 'Percentage of appointments where a client feedback response was collected.',
    isPercentage: true,
    isCurrency: false,
    dataKey: 'feedbackRate',
  },
  rebookRate: {
    label: 'Rebook Rate',
    tooltip: 'Percentage of completed appointments where the client rebooked at checkout.',
    isPercentage: true,
    isCurrency: false,
    dataKey: 'rebookRate',
  },
};

const STATUS_CONFIG: Record<ExperienceStatus, { label: string; className: string }> = {
  'strong': { label: 'Strong', className: 'bg-success/30 text-success-foreground border-success/40' },
  'watch': { label: 'Watch', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }, // amber: categorical warning
  'needs-attention': { label: 'Needs Attention', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function isHashedId(name: string): boolean {
  if (!name) return true;
  if (name.includes(' ')) return false;
  if (name.includes('_') || name.includes('-')) return true;
  if (name.length > 12) return true;
  return false;
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <div className={cn(
      'flex items-center gap-0.5 mt-0.5',
      tokens.kpi.change,
      value > 0 ? 'text-success-foreground' : value < 0 ? 'text-destructive' : 'text-muted-foreground',
    )}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ExperienceStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
      config.className,
    )}>
      {config.label}
    </span>
  );
}

export function ClientExperienceCard({
  const { dashPath } = useOrgDashboardPath(); dateFrom, dateTo, locationId, filterContext }: ClientExperienceCardProps) {
  const { data, isLoading } = useClientExperience(dateFrom, dateTo, locationId);
  const { formatCurrency } = useFormatCurrency();
  const [activeMetric, setActiveMetric] = useState<ExperienceMetric>('composite');
  const [showAll, setShowAll] = useState(false);
  const DEFAULT_BAR_COUNT = 5;

  // Loading
  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}><Heart className={tokens.card.icon} /></div>
            <div>
              <CardTitle className={tokens.card.title}>CLIENT EXPERIENCE</CardTitle>
              <CardDescription>Tip, feedback & rebooking quality</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Hero skeleton */}
          <div className={cn(tokens.kpi.tile, 'mb-3')}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28 mt-2" />
          </div>
          {/* Connector skeleton */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border/40" />
            <Skeleton className="h-2 w-16" />
            <div className="flex-1 h-px bg-border/40" />
          </div>
          {/* 2x2 grid skeleton */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={tokens.kpi.tile}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20 mt-1" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.staffBreakdown.length === 0) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}><Heart className={tokens.card.icon} /></div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>CLIENT EXPERIENCE</CardTitle>
                <MetricInfoTooltip description="Measures client experience quality through tip behavior, feedback collection, and rebooking rates per stylist." />
              </div>
            </div>
            {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Heart} title="No data available" description="No completed appointments found for the selected period." />
        </CardContent>
      </Card>
    );
  }

  // Format KPI values
  const formatValue = (metric: ExperienceMetric, val: number) => {
    if (metric === 'composite') return `${Math.round(val)}`;
    const c = METRIC_CONFIG[metric];
    if (c.isCurrency) return formatCurrency(val);
    if (c.isPercentage) return `${Math.round(val)}%`;
    return val.toLocaleString();
  };

  const kpis: { metric: ExperienceMetric; label: string; value: string; change: number | null }[] = [
    { metric: 'avgTip', label: 'Avg Tip', value: formatValue('avgTip', data.avgTip.current), change: data.avgTip.percentChange },
    { metric: 'tipRate', label: 'Tip Rate', value: formatValue('tipRate', data.tipRate.current), change: data.tipRate.percentChange },
    { metric: 'feedbackRate', label: 'Feedback Rate', value: formatValue('feedbackRate', data.feedbackRate.current), change: data.feedbackRate.percentChange },
    { metric: 'rebookRate', label: 'Rebook Rate', value: formatValue('rebookRate', data.rebookRate.current), change: data.rebookRate.percentChange },
    { metric: 'composite', label: 'Experience Score', value: `${data.compositeScore.current} / 100`, change: data.compositeScore.percentChange },
  ];

  // ── Ranked list for composite view ──
  const rankedStaff = [...data.staffBreakdown]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const needsAttentionCount = rankedStaff.filter(s => s.status === 'needs-attention').length;
  const visibleRanked = showAll ? rankedStaff : rankedStaff.slice(0, DEFAULT_BAR_COUNT);
  const hasMoreRanked = rankedStaff.length > DEFAULT_BAR_COUNT;

  // ── Bar chart data for non-composite metrics ──
  const isComposite = activeMetric === 'composite';
  const config = !isComposite ? METRIC_CONFIG[activeMetric] : null;

  const allChartData = !isComposite
    ? data.staffBreakdown
        .map((s, i) => ({
          name: isHashedId(s.staffName)
            ? `Stylist ${i + 1}`
            : s.staffName.length > 14 ? s.staffName.slice(0, 13) + '…' : s.staffName,
          value: s[config!.dataKey],
          staffId: s.staffId,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const chartData = showAll ? allChartData : allChartData.slice(0, DEFAULT_BAR_COUNT);
  const hasMoreBars = allChartData.length > DEFAULT_BAR_COUNT;
  const chartHeight = Math.max(200, chartData.length * 36 + 20);

  const resolveName = (s: typeof rankedStaff[number], idx: number) =>
    isHashedId(s.staffName) ? `Stylist ${idx + 1}` : s.staffName;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}><Heart className={tokens.card.icon} /></div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>CLIENT EXPERIENCE</CardTitle>
                <MetricInfoTooltip description="Measures client experience quality through tip behavior, feedback collection, and rebooking rates per stylist. The Experience Score combines all four metrics into a weighted composite (0–100)." />
              </div>
              <CardDescription>Tip, feedback & rebooking quality</CardDescription>
            </div>
          </div>
          {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
        </div>
      </CardHeader>
      <CardContent>
        {/* ── Hero KPI: Experience Score ── */}
        {(() => {
          const heroKpi = kpis.find(k => k.metric === 'composite')!;
          return (
            <button
              onClick={() => { setActiveMetric('composite'); setShowAll(false); }}
              className={cn(
                tokens.kpi.tile,
                'text-left transition-colors cursor-pointer w-full mb-0',
                activeMetric === 'composite'
                  ? 'ring-1 ring-primary/40 bg-primary/5'
                  : 'hover:bg-muted/30',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={tokens.kpi.label}>{heroKpi.label}</span>
                <MetricInfoTooltip description="Weighted composite of all four metrics below (Rebook 35%, Tip Rate 30%, Feedback 20%, Avg Tip 15%). Higher is better." />
              </div>
              <span className="font-display text-3xl tracking-wide text-foreground">{heroKpi.value}</span>
              <ChangeBadge value={heroKpi.change} />
            </button>
          );
        })()}

        {/* ── Connecting element ── */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-display">Based on</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* ── Component KPIs: 2×2 grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {kpis.filter(k => k.metric !== 'composite').map(kpi => (
            <button
              key={kpi.metric}
              onClick={() => { setActiveMetric(kpi.metric); setShowAll(false); }}
              className={cn(
                tokens.kpi.tile,
                'text-left transition-colors cursor-pointer',
                activeMetric === kpi.metric
                  ? 'ring-1 ring-primary/40 bg-muted/20'
                  : 'hover:bg-muted/30',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={tokens.kpi.label}>{kpi.label}</span>
                <MetricInfoTooltip description={
                  kpi.metric === 'avgTip' ? 'Average tip amount per completed appointment in the selected period.' :
                  kpi.metric === 'tipRate' ? 'Percentage of completed appointments that received any tip amount greater than zero.' :
                  kpi.metric === 'feedbackRate' ? 'Percentage of appointments where a client feedback response was collected, based on staff assignment.' :
                  'Percentage of completed appointments where the client rebooked at checkout.'
                } />
              </div>
              <span className={tokens.kpi.value}>{kpi.value}</span>
              <ChangeBadge value={kpi.change} />
            </button>
          ))}
        </div>

        {/* Section heading */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className={tokens.heading.subsection}>
            {isComposite ? 'Experience Ranking' : `${config!.label} by Stylist`}
          </h3>
        </div>

        {/* Unmapped staff banner */}
        {!data.hasNames && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Staff names unavailable —{' '}
              <Link to={dashPath('/admin/settings/staff-mapping')} className="text-primary hover:underline">
                connect staff profiles in Settings
              </Link>
            </p>
          </div>
        )}

        {/* ── Composite: Ranked list ── */}
        {isComposite && (
          <div className="space-y-0">
            {visibleRanked.map((s, idx) => (
              <div
                key={s.staffId}
                className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/20 transition-colors"
              >
                {/* Rank */}
                <span className="w-6 text-center font-display text-sm text-muted-foreground">
                  {s.rank}
                </span>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {resolveName(s, idx)}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  {/* Micro breakdown */}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Tip {Math.round(s.tipRate)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Rebook {Math.round(s.rebookRate)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Feedback {Math.round(s.feedbackRate)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Avg Tip {formatCurrency(s.avgTip)}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <span className="font-display text-sm font-medium text-foreground whitespace-nowrap">
                  {s.compositeScore} <span className="text-muted-foreground">/ 100</span>
                </span>
              </div>
            ))}

            {/* Show all toggle */}
            {hasMoreRanked && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline mx-auto"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAll && 'rotate-180')} />
                {showAll ? 'Show less' : `Show all ${rankedStaff.length} stylists`}
              </button>
            )}

            {/* Coaching callout */}
            {needsAttentionCount > 0 && (
              <div className="mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40">
                <Award className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {needsAttentionCount} {needsAttentionCount === 1 ? 'stylist' : 'stylists'} may benefit from coaching on client experience fundamentals.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Non-composite: Bar chart ── */}
        {!isComposite && (
          <>
            <svg width="0" height="0">
              <defs>
                <linearGradient id="experienceBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                </linearGradient>
              </defs>
            </svg>

            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  hide
                  domain={config!.isPercentage ? [0, 100] : undefined}
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
                  fill="url(#experienceBarGradient)"
                  stroke="hsl(var(--primary) / 0.3)"
                  strokeWidth={1}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: number) => {
                      if (config!.isCurrency) return formatCurrency(v);
                      if (config!.isPercentage) return `${Math.round(v)}%`;
                      return v.toLocaleString();
                    }}
                    style={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {hasMoreBars && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline mx-auto"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAll && 'rotate-180')} />
                {showAll ? 'Show less' : `Show all ${allChartData.length} stylists`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
