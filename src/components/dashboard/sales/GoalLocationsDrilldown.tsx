import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGoalTrackerData } from '@/hooks/useGoalTrackerData';
import { useGoalPeriodRevenue } from '@/hooks/useGoalPeriodRevenue';
import { Progress } from '@/components/ui/progress';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActiveLocations, isClosedOnDate } from '@/hooks/useLocations';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';

const MAX_VISIBLE = 5;

interface GoalLocationsDrilldownProps {
  isOpen: boolean;
  period: 'weekly' | 'monthly';
}

function LocationMiniRow({ locationId, locationName, target, period, closedReason }: {
  locationId: string;
  locationName: string;
  target: number;
  period: 'weekly' | 'monthly';
  closedReason?: string;
}) {
  const { data: revenue = 0 } = useGoalPeriodRevenue(period, locationId);
  const { computePaceStatus, getPeriodRange } = useGoalTrackerData(period);

  const { start, end } = getPeriodRange(period);
  const now = new Date();
  const daysTotal = differenceInDays(end, start) + 1;
  const daysElapsed = Math.max(differenceInDays(now, start) + 1, 1);
  const expectedPct = (daysElapsed / daysTotal) * 100;
  const actualPct = target > 0 ? (revenue / target) * 100 : 0;
  const percentage = Math.min(actualPct, 100);
  const paceStatus = computePaceStatus(actualPct, expectedPct);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{locationName}</span>
            {closedReason && <ClosedBadge reason={closedReason} />}
          </div>
          <div className="flex items-center gap-2">
            <BlurredAmount className="text-xs tabular-nums">
              {percentage.toFixed(0)}%
            </BlurredAmount>
            <span className={cn(
              'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              paceStatus === 'ahead' && 'bg-chart-2/10 text-chart-2',
              paceStatus === 'on-track' && 'bg-muted text-muted-foreground',
              paceStatus === 'behind' && 'bg-destructive/10 text-destructive',
            )}>
              {paceStatus === 'ahead' && <TrendingUp className="w-2.5 h-2.5" />}
              {paceStatus === 'on-track' && <Target className="w-2.5 h-2.5" />}
              {paceStatus === 'behind' && <TrendingDown className="w-2.5 h-2.5" />}
              {paceStatus === 'ahead' ? 'Ahead' : paceStatus === 'on-track' ? 'On Track' : 'Behind'}
            </span>
          </div>
        </div>
        <Progress
          value={percentage}
          className="h-1.5"
          indicatorClassName={cn(
            paceStatus === 'ahead' && 'bg-chart-2',
            paceStatus === 'behind' && 'bg-destructive',
          )}
        />
      </div>
    </div>
  );
}

export function GoalLocationsDrilldown({ isOpen, period }: GoalLocationsDrilldownProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const { locationScaffold } = useGoalTrackerData(period);
  const { data: allLocations } = useActiveLocations();
  const today = useMemo(() => new Date(), []);

  const sortedLocations = useMemo(() => {
    if (!locationScaffold) return [];
    return [...locationScaffold];
  }, [locationScaffold]);

  const hasMore = sortedLocations.length > MAX_VISIBLE;
  const visibleLocations = showAll ? sortedLocations : sortedLocations.slice(0, MAX_VISIBLE);

  return (
    <AnimatePresence>
      {isOpen && sortedLocations.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-3 pb-1 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display mb-2">
              By Location
            </p>
            <ScrollArea className={cn(showAll && sortedLocations.length > 8 && 'max-h-[280px]')}>
              {visibleLocations.map(loc => {
                const locObj = allLocations?.find(l => l.id === loc.locationId);
                const closed = locObj ? isClosedOnDate(locObj.hours_json, locObj.holiday_closures, today) : null;
                return (
                  <LocationMiniRow
                    key={loc.locationId}
                    locationId={loc.locationId}
                    locationName={loc.locationName}
                    target={loc.target}
                    period={period}
                    closedReason={closed?.isClosed ? closed.reason : undefined}
                  />
                );
              })}
            </ScrollArea>
            {hasMore && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground pt-1 w-full"
              >
                {showAll ? 'Show less' : `Show all ${sortedLocations.length} locations`}
                <ChevronDown className={cn('w-3 h-3 transition-transform', showAll && 'rotate-180')} />
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/admin/analytics?tab=sales&subtab=goals')}
              className="flex items-center gap-1 text-xs text-primary hover:underline pt-2 w-full"
            >
              View full breakdown
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
