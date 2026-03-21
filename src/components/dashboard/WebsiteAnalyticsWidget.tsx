import { useNavigate } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Globe, Eye, Clock, MousePointerClick, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CommandCenterVisibilityToggle } from '@/components/dashboard/CommandCenterVisibilityToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebsiteAnalytics } from '@/hooks/useWebsiteAnalytics';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface TrendBadgeProps {
  value: number;
  inverted?: boolean; // For metrics where down is good (like bounce rate)
}

function TrendBadge({ value, inverted = false }: TrendBadgeProps) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = Math.abs(value) < 0.5;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${isPositive ? 'text-success-foreground' : 'text-destructive'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
    </span>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function WebsiteAnalyticsWidget() {
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const { formatNumber, formatPercent } = useFormatNumber();
  const navigate = useNavigate();
  const { summary, isLoading, refreshAnalytics, isRefreshing } = useWebsiteAnalytics();

  const handleViewDetails = () => {
    navigate(dashPath('/admin/marketing'));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.weeklyData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="font-display text-base tracking-wide">WEBSITE TRAFFIC</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Globe className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No analytics data available yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Publish your site to start tracking visitors.
            </p>
            <Button 
              variant="outline" 
              size={tokens.button.card} 
              className="mt-4"
              onClick={() => refreshAnalytics()}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-2" />
              )}
              Fetch Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = summary.weeklyData.map(week => ({
    week: formatDate(parseISO(week.weekStart), 'MMM d'),
    visitors: week.visitors,
    pageviews: week.pageviews,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="font-display text-base tracking-wide">WEBSITE TRAFFIC</CardTitle>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-primary/10"
                  onClick={handleViewDetails}
                >
                  <Info className="w-4 h-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                View full analytics
              </TooltipContent>
            </UITooltip>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refreshAnalytics()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metric */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-3xl font-medium tracking-tight">
              {formatNumber(summary.thisWeek.visitors)}
            </p>
            <p className="text-xs text-muted-foreground">visitors this week</p>
          </div>
          <div className="text-right">
            <TrendBadge value={summary.trends.visitors} />
            <p className="text-xs text-muted-foreground mt-0.5">vs last week</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="week" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <p className="text-xs font-medium">{payload[0]?.payload?.week}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(Number(payload[0]?.value ?? 0))} visitors
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorVisitors)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium">{formatNumber(summary.thisWeek.pageviews)}</p>
            <p className="text-xs text-muted-foreground">Pageviews</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium">{formatDuration(summary.thisWeek.avgSessionDuration)}</p>
            <p className="text-xs text-muted-foreground">Avg. Duration</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <MousePointerClick className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium">{formatPercent(summary.thisWeek.bounceRate)}</p>
            <p className="text-xs text-muted-foreground">Bounce Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
