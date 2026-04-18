import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import * as TabsPrimitive from '@radix-ui/react-tabs';

interface Performer {
  user_id: string;
  name: string;
  photo_url?: string;
  totalRevenue: number;
  serviceRevenue?: number;
  productRevenue?: number;
}

type SortMode = 'service' | 'retail';

interface TopPerformersCardProps {
  performers: Performer[];
  isLoading?: boolean;
  showInfoTooltip?: boolean;
  filterContext?: FilterContext;
}

const getRankStyles = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        badge: 'bg-chart-4/15 text-chart-4 border border-chart-4/30',
        row: 'border-l-2 border-l-chart-4/60 ring-1 ring-chart-4/10 shadow-sm',
      };
    case 2:
      return {
        badge: 'bg-muted text-muted-foreground border border-border',
        row: 'border-l-2 border-l-muted-foreground/40',
      };
    case 3:
      return {
        badge: 'bg-chart-3/15 text-chart-3 border border-chart-3/30',
        row: 'border-l-2 border-l-chart-3/40',
      };
    default:
      return {
        badge: 'bg-muted/50 text-muted-foreground',
        row: 'border-l-2 border-l-transparent',
      };
  }
};

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'retail', label: 'Retail' },
];

const INITIAL_COUNT = 3;

export function TopPerformersCard({ performers, isLoading, showInfoTooltip = false, filterContext }: TopPerformersCardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('service');
  const [showAll, setShowAll] = useState(false);
  const { formatCurrency } = useFormatCurrency();

  const sorted = useMemo(() => {
    const ranked = [...performers].sort((a, b) => {
      if (sortMode === 'retail') {
        return (b.productRevenue ?? 0) - (a.productRevenue ?? 0);
      }
      const aService = a.totalRevenue - (a.productRevenue ?? 0);
      const bService = b.totalRevenue - (b.productRevenue ?? 0);
      return bService - aService;
    });
    return ranked.filter(p => {
      const value = sortMode === 'retail'
        ? (p.productRevenue ?? 0)
        : p.totalRevenue - (p.productRevenue ?? 0);
      return value > 0;
    });
  }, [performers, sortMode]);

  const totalTeamRevenue = useMemo(() =>
    sorted.reduce((acc, p) => {
      if (sortMode === 'retail') return acc + (p.productRevenue ?? 0);
      return acc + (p.totalRevenue - (p.productRevenue ?? 0));
    }, 0),
    [sorted, sortMode]
  );

  const currentLabel = SORT_OPTIONS.find(o => o.value === sortMode)?.label ?? 'Service';
  const displayList = showAll ? sorted : sorted.slice(0, INITIAL_COUNT);
  const hasMore = sorted.length > INITIAL_COUNT;
  const modeNoun = sortMode === 'retail' ? 'retail sales' : 'service revenue';

  const headerContent = (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <CardTitle className="font-display text-sm tracking-wide">TOP PERFORMERS</CardTitle>
      </div>
      <div className="flex items-center gap-2">
        <FilterTabsList>
          <FilterTabsTrigger value="service">Service</FilterTabsTrigger>
          <FilterTabsTrigger value="retail">Retail</FilterTabsTrigger>
        </FilterTabsList>
        {filterContext && (
          <AnalyticsFilterBadge 
            locationId={filterContext.locationId} 
            dateRange={filterContext.dateRange} 
          />
        )}
        <MetricInfoTooltip description="Ranks your team by service revenue or retail sales in the selected period. Amounts are rounded to the nearest dollar for a cleaner read." />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <TabsPrimitive.Root value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
      <Card className="h-full flex flex-col overflow-hidden border-border/40">
        <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
        <CardContent className="px-4 pb-2 pt-0 flex-1">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 dark:bg-card animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </TabsPrimitive.Root>
    );
  }

  if (!performers.length) {
    return (
      <TabsPrimitive.Root value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
      <Card className="h-full flex flex-col overflow-hidden border-border/40">
        <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
        <CardContent className="px-4 pb-2 pt-0 flex-1 flex items-center justify-center">
          <div className="text-center py-2 text-muted-foreground text-xs">
            No sales data available
          </div>
        </CardContent>
      </Card>
      </TabsPrimitive.Root>
    );
  }

  return (
    <TabsPrimitive.Root value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
    <Card className="@container h-full flex flex-col overflow-hidden border-border/40">
      <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
      <CardContent className="px-4 pb-3 pt-2 flex-1 flex flex-col">
        {sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-center py-2 text-muted-foreground text-xs">
              No staff had {modeNoun} in this period.
            </p>
          </div>
        ) : (
        <ScrollArea className={cn("flex-1", showAll && sorted.length > 6 && "max-h-[320px]")}>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayList.map((performer, idx) => {
                const rank = idx + 1;
                const styles = getRankStyles(rank);
                const initials = performer.name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase() || '?';
                const serviceRev = performer.totalRevenue - (performer.productRevenue ?? 0);
                const retailRev = performer.productRevenue ?? 0;
                const displayValue = sortMode === 'retail' ? retailRev : serviceRev;
                const revenueSharePct = totalTeamRevenue > 0 ? (displayValue / totalTeamRevenue) * 100 : 0;

                return (
                  <motion.div
                    key={performer.user_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className={cn(
                      "p-2.5 rounded-lg bg-card-inner",
                      styles.row
                    )}
                  >
                    <div className="flex items-start @[340px]:items-center gap-3">
                      {/* Rank badge */}
                      <span className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center font-display text-xs shrink-0 mt-0.5 @[340px]:mt-0",
                        styles.badge
                      )}>
                        {rank}
                      </span>

                      {/* Avatar - hidden when card is narrow, shown at ≥400px */}
                      <Avatar className="h-9 w-9 shrink-0 hidden @[400px]:flex mt-0.5 @[400px]:mt-0">
                        <AvatarImage src={performer.photo_url} alt={performer.name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>

                      {/* Content zone */}
                      <div className="flex-1 min-w-0 flex flex-col @[340px]:flex-row @[340px]:items-center @[340px]:justify-between @[340px]:gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{performer.name}</p>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-medium text-foreground/70">{revenueSharePct.toFixed(1)}%</span>
                            <span className="hidden @[320px]:inline"> of total {sortMode === 'retail' ? 'retail' : 'service'}</span>
                          </div>
                        </div>
                        <BlurredAmount
                          className={cn(
                            "font-display text-sm mt-1 @[340px]:mt-0 shrink-0 whitespace-nowrap",
                            rank === 1 && "text-foreground"
                          )}
                        >
                          {formatCurrency(Math.round(displayValue), { maximumFractionDigits: 0 })}
                        </BlurredAmount>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* View all toggle */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 border-t border-border/40"
          >
            {showAll ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>View all {sorted.length} stylists <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
    </TabsPrimitive.Root>
  );
}
