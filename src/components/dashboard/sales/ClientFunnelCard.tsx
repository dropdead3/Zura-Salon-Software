import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, TrendingUp } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useClientFunnel } from '@/hooks/useSalesAnalytics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { tokens } from '@/lib/design-tokens';

interface ClientFunnelCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext?: FilterContext;
}

export function ClientFunnelCard({ dateFrom, dateTo, locationId, filterContext }: ClientFunnelCardProps) {
  const { data, isLoading } = useClientFunnel(dateFrom, dateTo, locationId);
  const { formatCurrencyWhole } = useFormatCurrency();

  const chartData = data ? [
    { name: 'New Clients', value: data.newClientRevenue, color: 'hsl(var(--chart-3))' },
    { name: 'Returning', value: data.returningClientRevenue, color: 'hsl(var(--primary))' },
  ] : [];

  const totalRevenue = (data?.newClientRevenue || 0) + (data?.returningClientRevenue || 0);
  const newClientPercent = totalRevenue > 0 ? ((data?.newClientRevenue || 0) / totalRevenue * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
       <Card className={tokens.card.wrapper}>
        <CardContent className="p-6 flex items-center justify-center h-[350px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">CLIENT ACQUISITION</CardTitle>
              <MetricInfoTooltip description="Shows the split between new and returning client revenue. New clients are those with their first appointment in the selected date range." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange} 
              />
            )}
            <Badge variant="outline">{newClientPercent}% new</Badge>
          </div>
        </div>
        <CardDescription>New vs returning client revenue split</CardDescription>
      </CardHeader>
      <CardContent>
        {!data || totalRevenue === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No client data available
          </div>
        ) : (
          <>
            <div className="h-[180px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={0}
                    stroke="hsl(var(--border) / 0.4)"
                    strokeWidth={1}
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-chart-3/10 rounded-lg border border-chart-3/20">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-chart-3" />
                  <span className="text-sm font-medium">New Clients</span>
                </div>
                <p className="text-xl font-display">{data.newClientCount}</p>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatCurrencyWhole(data.newClientRevenue)}</span>
                  <span>Avg: {formatCurrencyWhole(Math.round(data.newClientAvgTicket))}</span>
                </div>
              </div>
              
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Returning</span>
                </div>
                <p className="text-xl font-display">{data.returningClientCount}</p>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatCurrencyWhole(data.returningClientRevenue)}</span>
                  <span>Avg: {formatCurrencyWhole(Math.round(data.returningClientAvgTicket))}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
