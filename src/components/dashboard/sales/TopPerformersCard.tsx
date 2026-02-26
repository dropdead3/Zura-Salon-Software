import { useState, useEffect, useRef, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { motion, AnimatePresence } from 'framer-motion';

interface Performer {
  user_id: string;
  name: string;
  photo_url?: string;
  totalRevenue: number;
  serviceRevenue?: number;
  productRevenue?: number;
}

type SortMode = 'totalRevenue' | 'retail';

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
        row: 'border-l-2 border-l-chart-4/60',
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
  { value: 'totalRevenue', label: 'Total Revenue' },
  { value: 'retail', label: 'Retail Sales' },
];

const INITIAL_COUNT = 3;

export function TopPerformersCard({ performers, isLoading, showInfoTooltip = false, filterContext }: TopPerformersCardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('totalRevenue');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { formatCurrencyWhole } = useFormatCurrency();

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const sorted = useMemo(() => [...performers].sort((a, b) => {
    if (sortMode === 'retail') {
      return (b.productRevenue ?? 0) - (a.productRevenue ?? 0);
    }
    return b.totalRevenue - a.totalRevenue;
  }), [performers, sortMode]);

  const topRevenue = sorted[0]
    ? (sortMode === 'retail' ? (sorted[0].productRevenue ?? 0) : sorted[0].totalRevenue)
    : 0;

  const currentLabel = SORT_OPTIONS.find(o => o.value === sortMode)?.label ?? 'Total Revenue';
  const displayList = showAll ? sorted : sorted.slice(0, INITIAL_COUNT);
  const hasMore = sorted.length > INITIAL_COUNT;

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <CardTitle className="font-display text-sm tracking-wide">TOP PERFORMERS</CardTitle>
        <MetricInfoTooltip description="Ranks your team by total revenue or retail sales in the selected period." />
      </div>
      {filterContext && (
        <AnalyticsFilterBadge 
          locationId={filterContext.locationId} 
          dateRange={filterContext.dateRange} 
        />
      )}
    </div>
  );

  if (isLoading) {
    return (
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
    );
  }

  if (!performers.length) {
    return (
      <Card className="h-full flex flex-col overflow-hidden border-border/40">
        <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
        <CardContent className="px-4 pb-2 pt-0 flex-1 flex items-center justify-center">
          <div className="text-center py-2 text-muted-foreground text-xs">
            No sales data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container h-full flex flex-col overflow-hidden border-border/40">
      <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
      <CardContent className="px-4 pb-3 pt-0 flex-1 flex flex-col">
        {/* Sort toggle */}
        <div className="relative mb-2" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Sorted by: <span className="text-foreground font-medium">{currentLabel}</span></span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", showDropdown && "rotate-180")} />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortMode(opt.value); setShowDropdown(false); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors",
                    sortMode === opt.value && "text-primary font-medium"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Performer list */}
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
                const displayValue = sortMode === 'retail'
                  ? (performer.productRevenue ?? 0)
                  : performer.totalRevenue;
                const progressPercent = topRevenue > 0 ? (displayValue / topRevenue) * 100 : 0;

                const serviceRev = performer.serviceRevenue ?? (performer.totalRevenue - (performer.productRevenue ?? 0));
                const retailRev = performer.productRevenue ?? 0;
                const showSplit = sortMode === 'totalRevenue' && serviceRev > 0 && retailRev > 0;

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
                    <div className="flex items-start gap-3">
                      {/* Rank badge */}
                      <span className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center font-display text-xs shrink-0 mt-0.5",
                        styles.badge
                      )}>
                        {rank}
                      </span>

                      {/* Avatar - hidden when card is narrow, shown at ≥400px */}
                      <Avatar className="h-9 w-9 shrink-0 hidden @[400px]:flex mt-0.5">
                        <AvatarImage src={performer.photo_url} alt={performer.name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>

                      {/* Content zone */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name + Revenue */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{performer.name}</p>
                          <BlurredAmount className="font-display text-sm shrink-0 whitespace-nowrap min-w-[80px] text-right">
                            {formatCurrencyWhole(displayValue)}
                          </BlurredAmount>
                        </div>

                        {/* Row 2: Progress bar */}
                        <div className="h-1 w-full bg-primary/15 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.6, delay: 0.15 + idx * 0.05, ease: 'easeOut' }}
                          />
                        </div>

                        {/* Row 3: Service · Retail split */}
                        {showSplit && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <BlurredAmount>{formatCurrencyWhole(serviceRev)}</BlurredAmount>
                            <span>service</span>
                            <span className="text-border">·</span>
                            <BlurredAmount>{formatCurrencyWhole(retailRev)}</BlurredAmount>
                            <span>retail</span>
                          </div>
                        )}
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
  );
}
