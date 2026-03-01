import { MapPin, Calendar } from 'lucide-react';
import { useActiveLocations } from '@/hooks/useLocations';
import { cn } from '@/lib/utils';
import { DATE_RANGE_LABELS } from '@/lib/dateRangeLabels';

export type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'thisWeek' | 'thisMonth' | 'todayToEom' | 'todayToPayday' | 'lastMonth' | 'ytd' | 'custom';

export interface FilterContext {
  locationId: string;
  dateRange: DateRangeType;
}

interface AnalyticsFilterBadgeProps {
  locationId: string;
  dateRange: DateRangeType;
  className?: string;
}

export function AnalyticsFilterBadge({ 
  locationId, 
  dateRange,
  className 
}: AnalyticsFilterBadgeProps) {
  const { data: locations } = useActiveLocations();
  
  // Resolve location name
  const locationName = (!locationId || locationId === 'all') 
    ? 'All Locations'
    : locations?.find(l => l.id === locationId)?.name || 'Unknown';
  
  const dateLabel = DATE_RANGE_LABELS[dateRange] || dateRange;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md",
      className
    )}>
      <MapPin className="w-3 h-3" />
      <span className="truncate max-w-[100px]">{locationName}</span>
      <span className="text-muted-foreground/50">·</span>
      <Calendar className="w-3 h-3" />
      <span>{dateLabel}</span>
    </div>
  );
}
