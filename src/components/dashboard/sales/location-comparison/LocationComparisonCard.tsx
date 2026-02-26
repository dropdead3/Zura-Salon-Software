import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { LocationDrilldownPanel } from './LocationDrilldownPanel';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { useActiveLocations, isClosedOnDate } from '@/hooks/useLocations';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';

export interface LocationCardData {
  location_id: string;
  name: string;
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  totalTransactions: number;
  totalServices: number;
  totalProducts: number;
  rank: number;
  sharePercent: number;
  isLeader: boolean;
  isLowest: boolean;
}

interface LocationComparisonCardProps {
  location: LocationCardData;
  gapPercent: string;
  dateFrom: string;
  dateTo: string;
  color: string;
}

export function LocationComparisonCard({
  location,
  gapPercent,
  dateFrom,
  dateTo,
  color,
}: LocationComparisonCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [expanded, setExpanded] = useState(false);
  const { data: allLocations } = useActiveLocations();
  const isSingleDay = dateFrom === dateTo;

  const avgTicket = location.totalTransactions > 0
    ? Math.round(location.totalRevenue / location.totalTransactions)
    : 0;

  const { data: attachmentData } = useRetailAttachmentRate({
    dateFrom,
    dateTo,
    locationId: location.location_id,
  });

  // Closed status for single-day views
  const closedInfo = isSingleDay ? (() => {
    const locObj = allLocations?.find(l => l.id === location.location_id);
    if (!locObj) return null;
    const viewDate = new Date(dateFrom + 'T12:00:00');
    return isClosedOnDate(locObj.hours_json, locObj.holiday_closures, viewDate);
  })() : null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border relative overflow-hidden transition-colors cursor-pointer',
        location.isLeader
          ? 'bg-primary/5 border-primary/20'
          : 'bg-card-inner border-border/50',
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: color }}
      />
      <div className="pl-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium truncate">{location.name}</span>
            {closedInfo?.isClosed && <ClosedBadge reason={closedInfo.reason} />}
          </div>
          <div className="flex items-center gap-1.5">
            {location.isLeader ? (
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Leader
              </Badge>
            ) : location.isLowest ? (
              <Badge variant="outline" className="text-xs text-muted-foreground border-border/50">
                Opportunity
              </Badge>
            ) : null}
            <ChevronDown className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              expanded && 'rotate-180'
            )} />
          </div>
        </div>

        {/* Revenue */}
        <p className="text-2xl font-display mb-2">
          <BlurredAmount>{formatCurrencyWhole(location.totalRevenue)}</BlurredAmount>
        </p>

        {/* Share bar — colored to match location */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Share of total</span>
            <span>{Math.round(location.sharePercent)}%</span>
          </div>
          <Progress
            value={location.sharePercent}
            className="h-1.5"
            indicatorStyle={{ backgroundColor: color }}
          />
        </div>

        {/* Retail Attachment Rate */}
        {attachmentData && (
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Attach Rate</span>
              <span>{attachmentData.attachmentRate}%</span>
            </div>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Progress
                      value={attachmentData.attachmentRate}
                      className="h-1.5"
                      indicatorStyle={{ backgroundColor: color }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {attachmentData.attachedTransactions} of {attachmentData.serviceTransactions} service transactions included retail
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Metric grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40 text-center">
          <div>
            <p className="text-lg font-display">{location.totalServices}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </div>
          <div>
            <p className="text-lg font-display">{location.totalProducts}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </div>
          <div>
            <p className="text-lg font-display">
              <BlurredAmount>${avgTicket}</BlurredAmount>
            </p>
            <p className="text-xs text-muted-foreground">Avg Ticket</p>
          </div>
        </div>

        {/* Drill-down panel */}
        <LocationDrilldownPanel
          locationId={location.location_id}
          dateFrom={dateFrom}
          dateTo={dateTo}
          serviceRevenue={location.serviceRevenue}
          productRevenue={location.productRevenue}
          isOpen={expanded}
        />
      </div>
    </div>
  );
}
