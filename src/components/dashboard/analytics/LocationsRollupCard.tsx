import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MapPin, AlertCircle } from 'lucide-react';
import { useSalesByLocation } from '@/hooks/useSalesData';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { useActiveLocations, isClosedOnDate } from '@/hooks/useLocations';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

export interface LocationsRollupCardProps {
  filterContext: FilterContext;
  dateFrom: string;
  dateTo: string;
}

export function LocationsRollupCard({ filterContext, dateFrom, dateTo }: LocationsRollupCardProps) {
  const { accessibleLocations } = useUserLocationAccess();
  const { data: locationData, isLoading, isError, refetch } = useSalesByLocation(dateFrom, dateTo);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: allLocations } = useActiveLocations();
  const isSingleDay = dateFrom === dateTo;

  const showCard = accessibleLocations.length > 1;
  const locations = (locationData ?? []).filter((l) => (l.totalRevenue ?? 0) > 0);
  const totalRevenue = locations.reduce((sum, l) => sum + (l.totalRevenue ?? 0), 0);

  if (!showCard) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <p className="text-sm">Location rollup available when you have multiple locations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load location data.</span>
          </div>
          <Button variant="outline" size={tokens.button.card} className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-pinnable-anchor
              className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0"
            >
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm tracking-wide text-muted-foreground uppercase truncate">
                Location Performance
              </h3>
              <MetricInfoTooltip description="Revenue breakdown across all your locations for the selected period. Only locations with activity are shown. Use this to compare location productivity at a glance." />
            </div>
          </div>
          <AnalyticsFilterBadge
            locationId={filterContext.locationId}
            dateRange={filterContext.dateRange}
          />
        </div>
        <div className="space-y-2">
          {locations.slice(0, 6).map((loc) => (
            <div
              key={loc.location_id}
              className={cn(
                'flex justify-between items-center py-2 px-3 rounded-lg border border-border/50',
                'bg-muted/30'
              )}
            >
              <span className="text-sm truncate">{loc.name}</span>
              {isSingleDay && (loc.totalRevenue ?? 0) === 0 && (() => {
                const locObj = allLocations?.find(l => l.id === loc.location_id);
                if (!locObj) return null;
                const viewDate = new Date(dateFrom + 'T12:00:00');
                const closed = isClosedOnDate(locObj.hours_json, locObj.holiday_closures, viewDate);
                if (!closed.isClosed) return null;
                return <ClosedBadge reason={closed.reason} />;
              })()}
              <span className="tabular-nums text-sm shrink-0 ml-2">
                <BlurredAmount>
                  {formatCurrencyWhole(loc.totalRevenue ?? 0)}
                </BlurredAmount>
              </span>
            </div>
          ))}
        </div>
        {locations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground font-display uppercase">Total</span>
            <span className="tabular-nums font-medium">
              <BlurredAmount>{formatCurrencyWhole(totalRevenue)}</BlurredAmount>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
