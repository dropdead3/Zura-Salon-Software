import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, ChevronDown } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Performer {
  user_id: string;
  name: string;
  photo_url?: string;
  totalRevenue: number;
  productRevenue?: number;
}

type SortMode = 'totalRevenue' | 'retail';

interface TopPerformersCardProps {
  performers: Performer[];
  isLoading?: boolean;
  showInfoTooltip?: boolean;
  filterContext?: FilterContext;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-4 h-4 text-chart-4" />;
    case 2:
      return <Medal className="w-4 h-4 text-muted-foreground" />;
    case 3:
      return <Medal className="w-4 h-4 text-chart-3" />;
    default:
      return null;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-chart-4/10 border-chart-4/20';
    case 2:
      return 'bg-card-inner border-muted-foreground/20';
    case 3:
      return 'bg-chart-3/10 border-chart-3/20';
    default:
      return 'bg-card-inner';
  }
};

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'totalRevenue', label: 'Total Revenue' },
  { value: 'retail', label: 'Retail Sales' },
];

export function TopPerformersCard({ performers, isLoading, showInfoTooltip = false, filterContext }: TopPerformersCardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('totalRevenue');
  const [showDropdown, setShowDropdown] = useState(false);
  const { formatCurrencyWhole } = useFormatCurrency();

  const sorted = [...performers].sort((a, b) => {
    if (sortMode === 'retail') {
      return (b.productRevenue ?? 0) - (a.productRevenue ?? 0);
    }
    return b.totalRevenue - a.totalRevenue;
  });

  const currentLabel = SORT_OPTIONS.find(o => o.value === sortMode)?.label ?? 'Total Revenue';

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

  const topThree = sorted.slice(0, 3);

  return (
    <Card className="h-full flex flex-col overflow-hidden border-border/40">
      <CardHeader className="px-4 pt-4 pb-1">{headerContent}</CardHeader>
      <CardContent className="px-4 pb-2 pt-0 flex-1">
        {/* Sort toggle */}
        <div className="relative mb-2">
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

        <div className="space-y-2">
          {topThree.map((performer, idx) => {
            const rank = idx + 1;
            const initials = performer.name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || '?';
            const displayValue = sortMode === 'retail' 
              ? (performer.productRevenue ?? 0) 
              : performer.totalRevenue;

            return (
              <div
                key={performer.user_id}
                className={`flex items-center gap-3 p-2 rounded-lg border ${getRankBg(rank)}`}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={performer.photo_url} alt={performer.name} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1">
                    {getRankIcon(rank)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{performer.name}</p>
                  <BlurredAmount className="text-xs text-muted-foreground">
                    {formatCurrencyWhole(displayValue)}
                  </BlurredAmount>
                </div>
                <Badge variant="outline" className="text-xs">
                  #{rank}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
