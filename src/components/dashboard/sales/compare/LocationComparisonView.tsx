import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, MapPin, PieChart as PieChartIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { LocationBreakdown } from '@/hooks/useComparisonData';

interface LocationComparisonViewProps {
  locations: LocationBreakdown[] | undefined;
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function LocationComparisonView({ locations, isLoading }: LocationComparisonViewProps) {
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No location data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = locations.reduce((sum, l) => sum + l.totalRevenue, 0);

  const chartData = locations.map((loc, idx) => ({
    name: loc.name,
    value: loc.totalRevenue,
    color: COLORS[idx % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.slice(0, 6).map((location, idx) => (
          <Card key={location.locationId} className={idx === 0 ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium truncate">{location.name}</span>
                {idx === 0 && (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">
                    Leader
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-display mb-2">
                {formatCurrencyWhole(location.totalRevenue)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Share of total</span>
                  <span>{location.share.toFixed(1)}%</span>
                </div>
                <Progress value={location.share} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-center">
                <div>
                  <p className="text-lg font-display">{formatCurrencyWhole(Math.round(location.serviceRevenue))}</p>
                  <p className="text-xs text-muted-foreground">Services</p>
                </div>
                <div>
                  <p className="text-lg font-display">{formatCurrencyWhole(Math.round(location.productRevenue))}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <PieChartIcon className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="font-display text-base tracking-wide">REVENUE SHARE</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2 flex-1">
              {chartData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm">{entry.name}</span>
                  </div>
                  <span className="text-sm font-display">
                    {formatCurrencyWhole(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
