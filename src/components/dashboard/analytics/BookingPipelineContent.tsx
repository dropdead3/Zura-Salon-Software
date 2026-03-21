import { useState, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { useBookingPipelineByLocation, type LocationPipelineStatus, type LocationPipeline } from '@/hooks/useBookingPipelineByLocation';
import { useLocationPipelineTimeline } from '@/hooks/useLocationPipelineTimeline';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { XAxis, YAxis, ReferenceLine, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';

const MAX_VISIBLE = 5;

const STATUS_CONFIG: Record<LocationPipelineStatus, { dot: string; chip: string; bar: string; order: number }> = {
  critical: { dot: 'bg-red-400', chip: 'bg-red-950/60 text-red-300 border-red-500/40 shadow-[0_0_8px_rgba(220,38,38,0.15)]', bar: 'bg-destructive', order: 0 },
  slowing: { dot: 'bg-amber-400', chip: 'bg-amber-950/50 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]', bar: 'bg-amber-500', order: 1 },
  healthy: { dot: 'bg-emerald-400', chip: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]', bar: 'bg-emerald-500', order: 2 },
  no_data: { dot: 'bg-muted-foreground/40', chip: 'bg-muted-foreground/15 text-muted-foreground', bar: 'bg-muted-foreground/40', order: 3 },
};

type SortBy = 'severity' | 'ratio-asc' | 'ratio-desc' | 'name';

const STATUS_FILL: Record<LocationPipelineStatus, string> = {
  critical: 'hsl(var(--destructive))',
  slowing: 'hsl(45, 93%, 47%)',
  healthy: 'hsl(152, 69%, 41%)',
  no_data: 'hsl(var(--muted-foreground) / 0.4)',
};

function TimelineTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-display text-xs tracking-wide">{format(parseISO(d.date), 'EEE, MMM d')}</p>
      <p className="text-muted-foreground text-xs tabular-nums">{d.trailingCount ?? d.forwardCount ?? 0} appointments</p>
    </div>
  );
}

function PipelineTimelineChart({ locationId, status }: { locationId: string; status: LocationPipelineStatus }) {
  const { dailyCounts, isLoading, todayIso } = useLocationPipelineTimeline(locationId, true);

  const chartData = useMemo(() =>
    dailyCounts.map(d => ({
      date: d.date,
      trailingCount: d.period === 'trailing' ? d.count : null,
      forwardCount: d.period === 'forward' ? d.count : null,
    })),
    [dailyCounts]
  );

  const trailingDays = dailyCounts.filter(d => d.period === 'trailing');
  const forwardDays = dailyCounts.filter(d => d.period === 'forward');
  const trailingAvg = trailingDays.length ? (trailingDays.reduce((s, d) => s + d.count, 0) / trailingDays.length) : 0;
  const forwardAvg = forwardDays.length ? (forwardDays.reduce((s, d) => s + d.count, 0) / forwardDays.length) : 0;
  const emptyDays = forwardDays.filter(d => d.count === 0).length;

  const forwardColor = STATUS_FILL[status] || STATUS_FILL.no_data;

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full mt-3" />;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => format(parseISO(v), 'MMM d')}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <RechartsTooltip content={<TimelineTooltip />} />
            <ReferenceLine
              x={todayIso}
              stroke="hsl(var(--foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{ value: 'Today', position: 'top', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="trailingCount"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              fillOpacity={0.15}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forwardCount"
              stroke={forwardColor}
              fill={forwardColor}
              strokeWidth={2}
              fillOpacity={0.2}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Trailing Avg</p>
          <p className="text-sm font-display tabular-nums">{trailingAvg.toFixed(1)}/day</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Forward Avg</p>
          <p className="text-sm font-display tabular-nums">{forwardAvg.toFixed(1)}/day</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Empty Days</p>
          <p className="text-sm font-display tabular-nums">{emptyDays}</p>
        </div>
      </div>
    </div>
  );
}

interface BookingPipelineContentProps {
  locationId?: string;
  dateRange: string;
}

export function BookingPipelineContent({ locationId, dateRange }: BookingPipelineContentProps) {
  const { locations, summary, isLoading } = useBookingPipelineByLocation(locationId);
  const [sortBy, setSortBy] = useState<SortBy>('severity');
  const [activeFilters, setActiveFilters] = useState<Set<LocationPipelineStatus>>(
    new Set(['critical', 'slowing', 'healthy', 'no_data'])
  );
  const [showAll, setShowAll] = useState(false);

  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  const isSingleLocation = !!locationId || locations.length <= 1;

  const toggleFilter = (status: LocationPipelineStatus) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const sorted = useMemo(() => {
    const filtered = locations.filter(l => activeFilters.has(l.status));
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order;
        case 'ratio-asc':
          return a.ratio - b.ratio;
        case 'ratio-desc':
          return b.ratio - a.ratio;
        case 'name':
          return a.locationName.localeCompare(b.locationName);
        default:
          return 0;
      }
    });
  }, [locations, activeFilters, sortBy]);

  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-display text-lg">No locations found</p>
        <p className="text-sm mt-1">Add locations to see booking pipeline data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Scoreboard + Sort */}
      {!isSingleLocation && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {([['critical', summary.critical], ['slowing', summary.slowing], ['healthy', summary.healthy], ['no_data', summary.noData]] as const).map(([status, count]) => (
              count > 0 && (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-display transition-all',
                    STATUS_CONFIG[status].chip,
                    !activeFilters.has(status) && 'opacity-40'
                  )}
                >
                  {count} {status === 'no_data' ? 'No Data' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            ))}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="ratio-asc">Ratio: Low → High</SelectItem>
              <SelectItem value="ratio-desc">Ratio: High → Low</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}




      {/* Location Cards */}
      <div className="space-y-3">
        {visible.map(loc => {
          const config = STATUS_CONFIG[loc.status];
          const ratioPercent = Math.round(loc.ratio * 100);
          const isExpanded = expandedLocationId === loc.locationId;

          return (
            <div
              key={loc.locationId}
              className={cn(
                'bg-muted/30 rounded-lg border p-4 space-y-3 transition-colors cursor-pointer',
                isExpanded ? 'border-primary/30' : 'border-border/50 hover:border-border'
              )}
              onClick={() => setExpandedLocationId(isExpanded ? null : loc.locationId)}
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border backdrop-blur-sm w-[4.5rem] justify-center transition-all',
                    config.chip
                  )}>
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
                    {loc.label}
                  </span>
                  <span className="font-display text-sm tracking-wide">{loc.locationName}</span>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
              </div>

              {/* Detail line */}
              <p className="text-xs text-muted-foreground">
                {loc.forwardCount} next 14d vs {loc.baselineCount} trailing
              </p>

              {/* Progress bar */}
              {loc.status !== 'no_data' && (
                <>
                  <Progress
                    value={Math.min(ratioPercent, 100)}
                    className="h-2"
                    indicatorClassName={config.bar}
                  />
                  <span className="text-xs text-muted-foreground tabular-nums mt-1.5">
                    ratio: {ratioPercent}%
                  </span>
                </>
              )}

              {/* Timeline drill-down */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PipelineTimelineChart locationId={loc.locationId} status={loc.status} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Boost Bookings CTA for critical/slowing */}
              {(loc.status === 'critical' || loc.status === 'slowing') && (
                <div className="flex justify-end">
                  <Link
                    to={`/dashboard/admin/analytics?tab=marketing`}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Boost Bookings <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show all toggle */}
      {hasMore && !isSingleLocation && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', showAll && 'rotate-180')} />
          {showAll ? 'Show less' : `Show all ${sorted.length} locations`}
        </button>
      )}
    </div>
  );
}
