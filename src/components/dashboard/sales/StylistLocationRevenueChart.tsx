import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, MapPin, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { useStylistLocationRevenue, useStylistLocationTrend } from '@/hooks/useStylistLocationRevenue';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { formatCurrencyWhole as formatCurrencyWholeUtil } from '@/lib/formatCurrency';

interface StylistLocationRevenueChartProps {
  userId: string;
  months?: number;
}

// Chart colors using CSS variables
const LOCATION_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 217 91% 60%))',
  'hsl(var(--chart-3, 160 84% 39%))',
  'hsl(var(--chart-4, 43 96% 56%))',
  'hsl(var(--chart-5, 280 87% 65%))',
];

export function StylistLocationRevenueChart({ userId, months = 3 }: StylistLocationRevenueChartProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const today = new Date();
  const dateFrom = format(startOfMonth(subMonths(today, months - 1)), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(today), 'yyyy-MM-dd');

  const { data: locationData, isLoading: revenueLoading } = useStylistLocationRevenue(userId, dateFrom, dateTo);
  const { data: trendData, isLoading: trendLoading } = useStylistLocationTrend(userId, 8);

  const isLoading = revenueLoading || trendLoading;

  // Calculate totals and percentages
  const stats = useMemo(() => {
    if (!locationData || locationData.length === 0) {
      return { totalRevenue: 0, maxRevenue: 0, locations: [] };
    }

    const totalRevenue = locationData.reduce((sum, l) => sum + l.totalRevenue, 0);
    const maxRevenue = Math.max(...locationData.map(l => l.totalRevenue));

    const locations = locationData.map((loc, idx) => ({
      ...loc,
      percentage: totalRevenue > 0 ? (loc.totalRevenue / totalRevenue) * 100 : 0,
      color: LOCATION_COLORS[idx % LOCATION_COLORS.length],
    }));

    return { totalRevenue, maxRevenue, locations };
  }, [locationData]);

  // Calculate leader comparison
  const comparison = useMemo(() => {
    if (stats.locations.length < 2) return null;

    const leader = stats.locations[0];
    const trailing = stats.locations[stats.locations.length - 1];
    const gap = leader.totalRevenue - trailing.totalRevenue;
    const gapPercent = trailing.totalRevenue > 0 
      ? ((gap / trailing.totalRevenue) * 100).toFixed(0)
      : '∞';

    return { leader, trailing, gap, gapPercent };
  }, [stats.locations]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if only one location
  if (!locationData || locationData.length < 2) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="font-display text-lg">Revenue by Location</CardTitle>
          </div>
          <Badge variant="outline" className="font-normal">
            Last {months} months
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Compare your performance across different branches
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location cards side by side */}
        <div className="grid grid-cols-2 gap-4">
          {stats.locations.slice(0, 2).map((location, idx) => {
            const isLeader = idx === 0;
            return (
              <div 
                key={location.locationId || location.branchName} 
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  isLeader ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{location.branchName}</span>
                  </div>
                  {isLeader ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Top
                    </Badge>
                  ) : comparison && (
                    <Badge variant="outline" className="text-xs">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      -{comparison.gapPercent}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-display mb-2">
                  {formatCurrencyWhole(location.totalRevenue)}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Share of total</span>
                    <span>{location.percentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={location.percentage} className="h-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
                  <div>
                    <p className="text-lg font-display">{location.totalServices}</p>
                    <p className="text-xs text-muted-foreground">Services</p>
                  </div>
                  <div>
                    <p className="text-lg font-display">{location.totalProducts}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div>
                    <p className="text-lg font-display">${Math.round(location.averageTicket)}</p>
                    <p className="text-xs text-muted-foreground">Avg</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart comparison */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Revenue Distribution</h4>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stats.locations} 
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="branchName" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Bar 
                  dataKey="totalRevenue" 
                  radius={[0, 4, 4, 0]}
                >
                  {stats.locations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly trend by location */}
        {trendData && trendData.locations.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Weekly Trend by Location</h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.weeklyData}>
                  <XAxis 
                    dataKey="weekLabel" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrencyWholeUtil(v / 1000) + 'k'}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrencyWhole(value), name]}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    iconSize={8}
                  />
                  {trendData.locations.map((loc, idx) => (
                    <Line
                      key={loc}
                      type="monotone"
                      dataKey={loc}
                      stroke={LOCATION_COLORS[idx % LOCATION_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Service vs Product breakdown by location */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Revenue Breakdown by Location</h4>
          <div className="space-y-3">
            {stats.locations.map((location) => (
              <div key={location.locationId || location.branchName} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{location.branchName}</span>
                  <span className="text-muted-foreground">
                    {formatCurrencyWhole(location.serviceRevenue)} services / {formatCurrencyWhole(location.productRevenue)} products
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div 
                    className="bg-primary transition-all"
                    style={{ 
                      width: `${location.totalRevenue > 0 ? (location.serviceRevenue / location.totalRevenue) * 100 : 0}%` 
                    }}
                  />
                  <div 
                    className="bg-primary/40 transition-all"
                    style={{ 
                      width: `${location.totalRevenue > 0 ? (location.productRevenue / location.totalRevenue) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>Services</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-primary/40" />
              <span>Products</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
