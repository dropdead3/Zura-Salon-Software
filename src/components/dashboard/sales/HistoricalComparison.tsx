import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useSalesComparison } from '@/hooks/useSalesComparison';
import { format, subMonths, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';

interface HistoricalComparisonProps {
  currentDateFrom: string;
  currentDateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
}

type ComparisonPeriod = 'lastMonth' | 'lastYear';

export function HistoricalComparison({ 
  currentDateFrom, 
  currentDateTo,
  locationId,
  filterContext
}: HistoricalComparisonProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [period, setPeriod] = useState<ComparisonPeriod>('lastMonth');
  const [showComparison, setShowComparison] = useState(true);

  // Calculate comparison period dates
  const getComparisonDates = () => {
    const from = new Date(currentDateFrom);
    const to = new Date(currentDateTo);
    
    if (period === 'lastMonth') {
      const prevMonth = subMonths(from, 1);
      return {
        dateFrom: format(startOfMonth(prevMonth), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(prevMonth), 'yyyy-MM-dd'),
      };
    } else {
      return {
        dateFrom: format(subYears(from, 1), 'yyyy-MM-dd'),
        dateTo: format(subYears(to, 1), 'yyyy-MM-dd'),
      };
    }
  };

  const { data: comparison, isLoading } = useSalesComparison(
    currentDateFrom, 
    currentDateTo, 
    locationId
  );

  if (!showComparison) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Switch 
          id="show-comparison" 
          checked={showComparison} 
          onCheckedChange={setShowComparison}
        />
        <Label htmlFor="show-comparison" className="text-muted-foreground cursor-pointer">
          Show period comparison
        </Label>
      </div>
    );
  }

  const metrics = [
    { 
      label: 'Revenue', 
      current: comparison?.current.totalRevenue || 0,
      previous: comparison?.previous.totalRevenue || 0,
      change: comparison?.percentChange.totalRevenue || 0,
      format: (v: number) => formatCurrencyWhole(v),
    },
    { 
      label: 'Services', 
      current: comparison?.current.serviceRevenue || 0,
      previous: comparison?.previous.serviceRevenue || 0,
      change: comparison?.percentChange.serviceRevenue || 0,
      format: (v: number) => formatCurrencyWhole(v),
    },
    { 
      label: 'Retail', 
      current: comparison?.current.productRevenue || 0,
      previous: comparison?.previous.productRevenue || 0,
      change: comparison?.percentChange.productRevenue || 0,
      format: (v: number) => formatCurrencyWhole(v),
    },
    { 
      label: 'Avg Ticket', 
      current: comparison?.current.averageTicket || 0,
      previous: comparison?.previous.averageTicket || 0,
      change: comparison?.percentChange.averageTicket || 0,
      format: (v: number) => formatCurrencyWhole(Math.round(v)),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">PERIOD COMPARISON</CardTitle>
              <MetricInfoTooltip description="Side-by-side comparison of key metrics (revenue, services, products, transactions) between the current period and a prior period (last month or last year). Percentage changes highlight growth or decline." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange} 
              />
            )}
            <div className="flex rounded-lg border overflow-hidden">
              <Button
                variant={period === 'lastMonth' ? 'default' : 'ghost'}
                size={tokens.button.inline}
                className="h-7 text-xs rounded-none"
                onClick={() => setPeriod('lastMonth')}
              >
                vs Last Month
              </Button>
              <Button
                variant={period === 'lastYear' ? 'default' : 'ghost'}
                size={tokens.button.inline}
                className="h-7 text-xs rounded-none"
                onClick={() => setPeriod('lastYear')}
              >
                vs Last Year
              </Button>
            </div>
            <Switch 
              id="show-comparison" 
              checked={showComparison} 
              onCheckedChange={setShowComparison}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const isPositive = metric.change > 0;
              const isNeutral = metric.change === 0;
              
              return (
                <div key={metric.label} className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-lg font-display">{metric.format(metric.current)}</p>
                  <div className={cn(
                    'flex items-center justify-center gap-1 text-xs mt-1',
                    isNeutral ? 'text-muted-foreground' : isPositive ? 'text-chart-2' : 'text-destructive'
                  )}>
                    {isNeutral ? (
                      <Minus className="w-3 h-3" />
                    ) : isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    was {metric.format(metric.previous)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
