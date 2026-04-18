import { useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, TrendingDown, ChevronDown, Loader2, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useGoalTrackerData } from '@/hooks/useGoalTrackerData';
import { GoalLocationRow } from './GoalLocationRow';
import { GoalPaceTrendPanel } from './GoalPaceTrendPanel';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function GoalTrackerCard() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [showTrend, setShowTrend] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});
  const [showAllLocations, setShowAllLocations] = useState(false);
  const MAX_VISIBLE_LOCATIONS = 3;

  const { formatCurrencyWhole, currency } = useFormatCurrency();
  const { orgMetrics, locationScaffold, isLoading } = useGoalTrackerData(period);

  const now = new Date();
  const periodStart = period === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const periodEnd = period === 'weekly' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);

  const allExpanded = locationScaffold.length > 0 && locationScaffold.every(l => expandedLocations[l.locationId]);
  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedLocations({});
    } else {
      const all: Record<string, boolean> = {};
      locationScaffold.forEach(l => { all[l.locationId] = true; });
      setExpandedLocations(all);
    }
  }, [allExpanded, locationScaffold]);
  const toggleLocation = useCallback((id: string) => {
    setExpandedLocations(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // SVG progress ring - responsive sizing
  const isMobile = useIsMobile();
  const size = isMobile ? 120 : 160;
  const strokeWidth = isMobile ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (orgMetrics.percentage / 100) * circumference;

  const paceColor = orgMetrics.paceStatus === 'ahead'
    ? 'text-chart-2'
    : orgMetrics.paceStatus === 'behind'
      ? 'text-destructive'
      : 'text-primary';

  return (
    <PinnableCard
      elementKey="goal_tracker"
      elementName="Goal Tracker"
      category="Analytics Hub - Sales"
      metricData={{
        'Revenue': orgMetrics.revenue,
        'Target': orgMetrics.target,
        'Pace': orgMetrics.paceStatus,
        'Projected': Math.round(orgMetrics.projectedRevenue),
      }}
    >
      <Card className={cn(tokens.card.wrapper, "h-full flex flex-col")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="font-display text-base tracking-wide">GOAL TRACKER</CardTitle>
              <MetricInfoTooltip description="Tracks whether you're on pace to hit your revenue targets for the current period." />
            </div>
            <Tabs value={period} onValueChange={(v) => v && setPeriod(v as 'weekly' | 'monthly')}>
              <FilterTabsList>
                <FilterTabsTrigger value="weekly">Weekly</FilterTabsTrigger>
                <FilterTabsTrigger value="monthly">Monthly</FilterTabsTrigger>
              </FilterTabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between gap-5">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Top group: org summary + pace trend */}
              <div className="space-y-5 flex-1 flex flex-col justify-center">
              {/* Organization summary */}
              <div className="flex items-center gap-6">
                {/* Progress ring */}
                <button
                  onClick={() => setShowTrend(v => !v)}
                  className="relative shrink-0 group/ring cursor-pointer"
                  aria-label="Toggle pace trend"
                >
                  <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke="hsl(var(--muted) / 0.4)"
                      strokeWidth={strokeWidth}
                    />
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={
                        orgMetrics.paceStatus === 'ahead'
                          ? 'hsl(var(--chart-2))'
                          : orgMetrics.paceStatus === 'behind'
                            ? 'hsl(var(--destructive))'
                            : 'hsl(var(--primary))'
                      }
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl md:text-3xl font-display font-medium">{orgMetrics.percentage.toFixed(0)}%</span>
                    <ChevronDown className={cn(
                      'w-3 h-3 text-muted-foreground transition-transform mt-0.5',
                      showTrend && 'rotate-180',
                    )} />
                  </div>
                </button>

                {/* Stats */}
                <div className="flex-1 space-y-3">
                  {/* Scope label */}
                  <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">All Locations</p>
                  {/* Pace badge + required daily rate */}
                  <div className="space-y-1">
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium',
                      orgMetrics.paceStatus === 'ahead' && 'bg-chart-2/10 text-chart-2',
                      orgMetrics.paceStatus === 'on-track' && 'bg-primary/10 text-primary',
                      orgMetrics.paceStatus === 'behind' && 'bg-destructive/10 text-destructive',
                    )}>
                      {orgMetrics.paceStatus === 'ahead' && <TrendingUp className="w-3 h-3" />}
                      {orgMetrics.paceStatus === 'on-track' && <Target className="w-3 h-3" />}
                      {orgMetrics.paceStatus === 'behind' && <TrendingDown className="w-3 h-3" />}
                      {orgMetrics.paceStatus === 'ahead' ? 'Ahead of Pace' : orgMetrics.paceStatus === 'on-track' ? 'On Track' : 'Behind Pace'}
                    </div>
                    {orgMetrics.daysRemaining > 0 && orgMetrics.target > orgMetrics.revenue && (
                      <p className="text-[10px] text-muted-foreground pl-0.5">
                        Need <BlurredAmount>{formatCurrencyWhole(Math.ceil((orgMetrics.target - orgMetrics.revenue) / orgMetrics.daysRemaining))}</BlurredAmount>/day to hit goal
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Earned</p>
                      <p className="text-sm md:text-base font-medium">
                        <AnimatedBlurredAmount value={orgMetrics.revenue} currency={currency} animationKey={`cc-goal-${period}-revenue`} />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Target</p>
                      <p className="text-sm md:text-base font-medium">
                        <BlurredAmount>{formatCurrencyWhole(orgMetrics.target)}</BlurredAmount>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Projected</p>
                      <p className={cn('text-sm md:text-base font-medium', orgMetrics.projectedRevenue >= orgMetrics.target ? 'text-chart-2' : 'text-destructive')}>
                        <AnimatedBlurredAmount value={orgMetrics.projectedRevenue} currency={currency} animationKey={`cc-goal-${period}-projected`} />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Days Left</p>
                      <p className="text-sm md:text-base font-medium">{orgMetrics.daysRemaining}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pace Trend Drill-Down */}
              <AnimatePresence>
                {showTrend && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-display">
                        Pace Trend
                      </p>
                      <GoalPaceTrendPanel period={period} target={orgMetrics.target} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              {/* Location scoreboard */}
              {locationScaffold.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                      Location Scoreboard
                    </p>
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronsUpDown className="w-3 h-3" />
                      {allExpanded ? 'Collapse all' : 'Expand all'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {(showAllLocations ? locationScaffold : locationScaffold.slice(0, MAX_VISIBLE_LOCATIONS)).map(loc => (
                      <GoalLocationRow
                        key={loc.locationId}
                        locationId={loc.locationId}
                        locationName={loc.locationName}
                        target={loc.target}
                        period={period}
                        periodStart={periodStart}
                        periodEnd={periodEnd}
                        hoursJson={loc.hoursJson}
                        holidayClosures={loc.holidayClosures}
                        isExpanded={!!expandedLocations[loc.locationId]}
                        onToggle={() => toggleLocation(loc.locationId)}
                      />
                    ))}
                  </div>
                  {locationScaffold.length > MAX_VISIBLE_LOCATIONS && (
                    <button
                      onClick={() => setShowAllLocations(v => !v)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground pt-2 w-full transition-colors"
                    >
                      <ChevronDown className={cn('w-3 h-3 transition-transform', showAllLocations && 'rotate-180')} />
                      {showAllLocations ? 'Show less' : `Show all ${locationScaffold.length} locations`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
