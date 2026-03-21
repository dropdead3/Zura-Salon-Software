import { memo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles, Calendar, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRevenueForecast } from '@/hooks/useRevenueForecast';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface RevenueForecastCardProps {
  locationId?: string;
  forecastDays?: number;
  className?: string;
}

const confidenceColors = {
  high: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: 'text-emerald-500',
  down: 'text-rose-500',
  stable: 'text-muted-foreground',
};

function RevenueForecastCardComponent({
  locationId,
  forecastDays = 7,
  className,
}: RevenueForecastCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { data, isLoading, error, refetch, isFetching } = useRevenueForecast({
    forecastDays,
    locationId,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-28 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">Unable to load forecast</p>
          <Button variant="outline" size={tokens.button.card} onClick={() => refetch()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = data?.summary.trend ? trendIcons[data.summary.trend] : Minus;
  const trendColor = data?.summary.trend ? trendColors[data.summary.trend] : '';

  // Get next 3 days for mini-forecast
  const upcomingDays = data?.forecasts.slice(0, 3) || [];

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">AI Revenue Forecast</CardTitle>
              <MetricInfoTooltip description="AI-generated revenue projection based on historical patterns, seasonal trends, and current booking pipeline. Confidence level reflects how much historical data is available." />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {/* Hero metric */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium font-display">
              {formatCurrency(data?.summary.totalPredicted ?? 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              next {forecastDays} days
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <TrendIcon className={cn('w-4 h-4', trendColor)} />
            <span className={cn('text-sm font-medium', trendColor)}>
              {data?.summary.trend === 'up' ? 'Trending up' : 
               data?.summary.trend === 'down' ? 'Trending down' : 'Stable'}
            </span>
          </div>
        </div>

        {/* Daily breakdown */}
        <div className="space-y-2 mb-4">
          {upcomingDays.map((day, index) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm">
                  {formatDate(parseISO(day.date), 'EEE, MMM d')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium font-display">
                  {formatCurrency(day.predictedRevenue)}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className={cn('text-xs', confidenceColors[day.confidence])}>
                        {day.confidence}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-48">
                        {day.factors.join(', ')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Insight */}
        {data?.summary.keyInsight && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">AI Insight:</span> {data.summary.keyInsight}
            </p>
          </div>
        )}

        {/* Data quality indicator */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Based on {data?.historicalDataPoints || 0} days of data</span>
          <span>Avg: {formatCurrency(data?.summary.avgDaily ?? 0)}/day</span>
        </div>
      </CardContent>
    </Card>
  );
}

export const RevenueForecastCard = memo(RevenueForecastCardComponent);
