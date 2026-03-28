import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3, Trophy, Medal, PieChart as PieChartIcon } from 'lucide-react';
import { BlurredAmount, useHideNumbers } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Performer {
  user_id: string;
  name: string;
  photo_url?: string;
  totalRevenue: number;
}

interface SalesSnapshotCardProps {
  performers: Performer[];
  isLoading?: boolean;
  serviceRevenue: number;
  productRevenue: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-4 h-4 text-chart-4" />;
    case 2:
      return <Medal className="w-4 h-4 text-muted-foreground" />;
    case 3:
      return <Medal className="w-4 h-4 text-chart-3" />;
    default:
      return null;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-chart-4/10 border-chart-4/20';
    case 2:
      return 'bg-muted/50 border-muted-foreground/20';
    case 3:
      return 'bg-chart-3/10 border-chart-3/20';
    default:
      return 'bg-muted/30';
  }
};

export function SalesSnapshotCard({
  performers,
  isLoading,
  serviceRevenue,
  productRevenue,
}: SalesSnapshotCardProps) {
  const { hideNumbers } = useHideNumbers();
  const { formatCurrencyWhole } = useFormatCurrency();
  const topThree = performers.slice(0, 3);

  // Revenue mix chart data
  const chartData = useMemo(() => {
    const total = serviceRevenue + productRevenue;
    if (total === 0) return [];
    return [
      { name: 'Services', value: serviceRevenue, color: 'hsl(var(--primary))' },
      { name: 'Retail', value: productRevenue, color: 'hsl(var(--chart-2))' },
    ].filter(d => d.value > 0);
  }, [serviceRevenue, productRevenue]);

  const total = serviceRevenue + productRevenue;
  const servicePercent = total > 0 ? Math.round((serviceRevenue / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="font-display text-base tracking-wide">SALES SNAPSHOT</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Performers Section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-chart-4" />
            <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wide">
              Top Performers
            </h4>
            <MetricInfoTooltip description="Ranked by total service + product revenue for the selected period." />
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : !topThree.length ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No sales data available
            </div>
          ) : (
            <div className="space-y-2">
              {topThree.map((performer, idx) => {
                const rank = idx + 1;
                const initials = performer.name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase() || '?';

                return (
                  <div
                    key={performer.user_id}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${getRankBg(rank)}`}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={performer.photo_url} alt={performer.name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1">
                        {getRankIcon(rank)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{performer.name}</p>
                      <BlurredAmount className="text-xs text-muted-foreground">
                        {formatCurrencyWhole(performer.totalRevenue)}
                      </BlurredAmount>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      #{rank}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Revenue Mix Section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <PieChartIcon className="w-4 h-4 text-chart-2" />
            <h4 className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wide">
              Revenue Mix
            </h4>
          </div>

          {!chartData.length ? (
            <div className="flex items-center justify-center text-muted-foreground text-xs h-20">
              No data
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div style={{ width: 70, height: 70 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={24}
                      outerRadius={32}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    {!hideNumbers && (
                      <Tooltip
                        formatter={(value: number) => [formatCurrencyWhole(value), '']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Services</span>
                  <span className="font-medium">{servicePercent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-chart-2" />
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{100 - servicePercent}%</span>
                </div>
                <div className="pt-2 mt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Retail %</span>
                    <MetricInfoTooltip description="Product Revenue ÷ Total Revenue × 100. Shows retail sales as a percentage of all revenue." />
                    <span className="font-medium text-foreground">
                      {100 - servicePercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
