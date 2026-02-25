import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyWhole } from '@/lib/formatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useActiveLocations, isClosedOnDate } from '@/hooks/useLocations';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';

export interface LocationBreakdownItem {
  locationId: string;
  locationName: string;
  value: number;
}

interface LocationBreakdownSectionProps {
  data: LocationBreakdownItem[];
  format: 'currency' | 'number' | 'percent';
  isAllLocations: boolean;
  className?: string;
  /** Pass the viewed date for single-day views to show closed badges */
  viewDate?: Date;
}

export function LocationBreakdownSection({
  data,
  format,
  isAllLocations,
  className,
  viewDate,
}: LocationBreakdownSectionProps) {
  const { formatNumber } = useFormatNumber();
  const { data: allLocations } = useActiveLocations();

  // Only show when viewing "All Locations" and when multiple locations have data
  if (!isAllLocations || data.length <= 1) {
    return null;
  }

  const formatValue = (value: number): string => {
    switch (format) {
      case 'currency':
        return formatCurrencyWhole(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return formatNumber(value);
    }
  };

  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className={cn('mt-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-display text-muted-foreground tracking-wide">
          By Location
        </span>
      </div>
      <div className="space-y-2">
        {sortedData.map((loc) => (
          <div
            key={loc.locationId}
            className="flex items-center justify-between p-2 bg-card-inner rounded-md border border-border/30"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm truncate max-w-[150px]">{loc.locationName}</span>
              {viewDate && (() => {
                const locObj = allLocations?.find(l => l.id === loc.locationId);
                if (!locObj) return null;
                const closed = isClosedOnDate(locObj.hours_json, locObj.holiday_closures, viewDate);
                if (!closed.isClosed) return null;
                return <ClosedBadge reason={closed.reason} />;
              })()}
            </div>
            <span className="font-display tabular-nums text-sm">{formatValue(loc.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
