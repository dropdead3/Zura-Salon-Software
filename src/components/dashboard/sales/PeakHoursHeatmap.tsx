import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, TrendingUp } from 'lucide-react';
import { usePeakHoursAnalysis } from '@/hooks/useSalesAnalytics';
import { cn } from '@/lib/utils';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { AnalyticsFilterBadge, FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { formatCurrencyWhole } from '@/lib/formatCurrency';

interface PeakHoursHeatmapProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

export function PeakHoursHeatmap({ dateFrom, dateTo, locationId, filterContext }: PeakHoursHeatmapProps) {
  const { data, isLoading } = usePeakHoursAnalysis(dateFrom, dateTo, locationId);
  const { hideNumbers } = useHideNumbers();

  // Build heatmap matrix
  const heatmapData: Record<string, { count: number; revenue: number }> = {};
  let maxCount = 0;
  
  data?.forEach(d => {
    const key = `${d.dayOfWeek}-${d.hour}`;
    heatmapData[key] = { count: d.transactionCount, revenue: d.revenue };
    if (d.transactionCount > maxCount) maxCount = d.transactionCount;
  });

  const getIntensity = (count: number) => {
    if (maxCount === 0) return 0;
    return count / maxCount;
  };

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted/30';
    if (intensity < 0.25) return 'bg-primary/20';
    if (intensity < 0.5) return 'bg-primary/40';
    if (intensity < 0.75) return 'bg-primary/60';
    return 'bg-primary/90';
  };

  // Find peak time
  let peakTime = { day: 0, hour: 0, count: 0 };
  data?.forEach(d => {
    if (d.transactionCount > peakTime.count) {
      peakTime = { day: d.dayOfWeek, hour: d.hour, count: d.transactionCount };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-[350px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">PEAK HOURS</CardTitle>
              <MetricInfoTooltip description="Heatmap of appointment volume by hour and day of week. Darker cells indicate higher booking density. Data is aggregated from completed appointments in the selected period." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange} 
              />
            )}
            {peakTime.count > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {DAYS[peakTime.day]} {peakTime.hour > 12 ? peakTime.hour - 12 : peakTime.hour}{peakTime.hour >= 12 ? 'pm' : 'am'}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>Transaction volume by day and hour</CardDescription>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No transaction timing data available
          </div>
        ) : (
          <>
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                {/* Header row with hours */}
                <div className="flex mb-1">
                  <div className="w-10" />
                  {HOURS.map(hour => (
                    <div key={hour} className="flex-1 text-center text-[10px] text-muted-foreground">
                      {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}
                    </div>
                  ))}
                </div>
                
                {/* Day rows */}
                {DAYS.map((day, dayIdx) => (
                  <div key={day} className="flex mb-1">
                    <div className="w-10 text-xs text-muted-foreground flex items-center">
                      {day}
                    </div>
                    {HOURS.map(hour => {
                      const key = `${dayIdx}-${hour}`;
                      const cellData = heatmapData[key] || { count: 0, revenue: 0 };
                      const intensity = getIntensity(cellData.count);
                      
                      // Build tooltip - hide revenue if hideNumbers is on
                      const tooltipText = hideNumbers 
                        ? `${day} ${hour}:00 - ${cellData.count} transactions`
                        : `${day} ${hour}:00 - ${cellData.count} transactions, ${formatCurrencyWhole(cellData.revenue)}`;
                      
                      return (
                        <div 
                          key={hour} 
                          className="flex-1 px-0.5"
                          title={tooltipText}
                        >
                          <div 
                            className={cn(
                              "h-6 rounded-sm transition-colors cursor-default",
                              getColor(intensity)
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-4 bg-muted/30 rounded-sm" />
                <div className="w-4 h-4 bg-primary/20 rounded-sm" />
                <div className="w-4 h-4 bg-primary/40 rounded-sm" />
                <div className="w-4 h-4 bg-primary/60 rounded-sm" />
                <div className="w-4 h-4 bg-primary/90 rounded-sm" />
              </div>
              <span>More</span>
            </div>

            {/* Peak summary */}
            {peakTime.count > 0 && (
              <div className="mt-4 p-3 bg-card-inner rounded-lg text-center">
                <p className="text-sm">
                  <span className="text-muted-foreground">Busiest time: </span>
                  <span className="font-medium">
                    {DAYS[peakTime.day]}s at {peakTime.hour > 12 ? peakTime.hour - 12 : peakTime.hour}:00 {peakTime.hour >= 12 ? 'PM' : 'AM'}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
