import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Calendar } from 'lucide-react';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveLocations } from '@/hooks/useLocations';
import { LocationMultiSelect } from '@/components/ui/location-multi-select';
import { parseLocationIds, encodeLocationIds } from '@/lib/locationFilter';
import type { DateRangeType } from '@/components/dashboard/PinnedAnalyticsCard';
import { DATE_RANGE_LABELS, getDateRangeSubtitle } from '@/lib/dateRangeLabels';

/** Ordered keys for the filter bar dropdown */
const DATE_RANGE_KEYS: DateRangeType[] = [
  'lastMonth', '30d', '7d', 'yesterday', 'today',
  'todayToEom', 'todayToPayday', 'thisWeek', 'thisMonth',
];

interface Location {
  id: string;
  name: string;
}

interface AnalyticsFilterBarProps {
  locationId: string;
  onLocationChange: (value: string) => void;
  dateRange: DateRangeType;
  onDateRangeChange: (value: DateRangeType) => void;
  accessibleLocations?: Location[];
  canViewAggregate?: boolean;
  compact?: boolean;
  onCompactChange?: (compact: boolean) => void;
  /** Density mode from parent for width clamping */
  density?: 'full' | 'short' | 'icon-some';
  leadingContent?: ReactNode;
}

export function AnalyticsFilterBar({
  locationId,
  onLocationChange,
  dateRange,
  onDateRangeChange,
  accessibleLocations,
  canViewAggregate = true,
  compact,
  onCompactChange,
  density = 'full',
  leadingContent,
}: AnalyticsFilterBarProps) {
  const { data: allLocations } = useActiveLocations();
  const locations = accessibleLocations ?? allLocations;
  const locationCount = locations?.length ?? 0;

  // 3+ locations → multi-select popover
  const useMultiSelect = locationCount >= 3;

  const showLocationSelector = canViewAggregate || locationCount > 1;

  return (
    <div className="flex flex-nowrap items-center justify-end gap-2">
      {/* Simple / Detailed toggle */}
      {onCompactChange && (
        <Tabs
          value={compact ? 'simple' : 'detailed'}
          onValueChange={(v) => onCompactChange(v === 'simple')}
        >
          <FilterTabsList>
            <FilterTabsTrigger value="simple">Simple</FilterTabsTrigger>
            <FilterTabsTrigger value="detailed">Detailed</FilterTabsTrigger>
          </FilterTabsList>
        </Tabs>
      )}

      {/* Multi-select for 3+ locations */}
      {showLocationSelector && useMultiSelect && locations && (
        <LocationMultiSelect
          locations={locations}
          selectedIds={locationId === 'all' ? [] : parseLocationIds(locationId)}
          onSelectionChange={(ids) => onLocationChange(encodeLocationIds(ids))}
        />
      )}

      {/* Single-select for 1-2 locations */}
      {showLocationSelector && !useMultiSelect && (
        <Select value={locationId} onValueChange={onLocationChange}>
          <SelectTrigger className={cn(
            "h-9 w-auto min-w-[140px] text-sm border-border whitespace-nowrap overflow-hidden",
            density === 'full' ? 'max-w-[220px]' : 'max-w-[180px]',
          )}>
            <MapPin className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Select Location" />
          </SelectTrigger>
          <SelectContent>
            {canViewAggregate && (
              <SelectItem value="all">All Locations</SelectItem>
            )}
            {locations?.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Single location badge */}
      {!showLocationSelector && locationCount === 1 && locations && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm h-9">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{locations[0].name}</span>
        </div>
      )}

      {/* Date Range Select */}
      <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangeType)}>
        <SelectTrigger className={cn(
          "h-9 w-auto min-w-[130px] text-sm border-border whitespace-nowrap overflow-hidden",
          density === 'full' ? 'max-w-[180px]' : 'max-w-[160px]',
        )}>
          <Calendar className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_KEYS.map((key) => {
            const subtitle = getDateRangeSubtitle(key);
            return (
              <SelectItem key={key} value={key}>
                <div className="flex flex-col">
                  <span>{DATE_RANGE_LABELS[key] ?? key}</span>
                  {subtitle && (
                    <span className="text-[11px] text-muted-foreground leading-tight">{subtitle}</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Customize button (e.g. customize menu) */}
      {leadingContent}
    </div>
  );
}
