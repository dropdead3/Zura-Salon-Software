import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyticsHubUrl } from '@/config/dashboardNav';
import { StaffWorkload } from '@/hooks/useStaffUtilization';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';


interface StylistWorkloadCardProps {
  workload: StaffWorkload[];
  isLoading: boolean;
}

// Calculate workload balance (100 = perfectly even, 0 = very imbalanced)
const calculateWorkloadBalance = (workloadData: StaffWorkload[]): number => {
  const activeStaff = workloadData.filter(w => w.appointmentCount > 0);
  if (activeStaff.length < 2) return 100;

  const counts = activeStaff.map(w => w.appointmentCount);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

  if (avg === 0) return 100;

  // Calculate coefficient of variation (lower = more balanced)
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avg;

  // Convert to 0-100 score (lower CV = higher score)
  return Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 1)) * 100)));
};

const getBalanceColor = (score: number): string => {
  if (score >= 70) return 'text-chart-2';
  if (score >= 40) return 'text-chart-4';
  return 'text-destructive';
};

const getBalanceBorderColor = (score: number): string => {
  if (score >= 70) return 'border-chart-2';
  if (score >= 40) return 'border-chart-4';
  return 'border-destructive';
};

const getBalanceLabel = (score: number): string => {
  if (score >= 70) return 'Well distributed';
  if (score >= 40) return 'Slightly imbalanced';
  return 'Needs attention';
};

const getBalanceIcon = (score: number) => {
  if (score >= 70) return <TrendingUp className="h-4 w-4 text-chart-2" />;
  if (score >= 40) return <Minus className="h-4 w-4 text-chart-4" />;
  return <TrendingDown className="h-4 w-4 text-destructive" />;
};

export function StylistWorkloadCard({ workload, isLoading }: StylistWorkloadCardProps) {
  const navigate = useNavigate();
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-lg" />
            <div className="md:col-span-2">
              <ChartSkeleton lines={5} className="h-[160px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeWorkload = workload.filter(w => w.appointmentCount > 0);
  
  if (activeWorkload.length === 0) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Users className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>STYLIST WORKLOAD DISTRIBUTION</CardTitle>
                <CardDescription>Appointment volume and balance across service providers</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size={tokens.button.card}
              onClick={() => navigate(analyticsHubUrl('operations', 'staff-utilization'))}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              View Full Report
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No appointment data available for this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balanceScore = calculateWorkloadBalance(workload);
  const topStylists = activeWorkload.slice(0, 5);
  const totalAppointments = activeWorkload.reduce((sum, w) => sum + w.appointmentCount, 0);
  const totalRevenue = activeWorkload.reduce((sum, w) => sum + w.totalRevenue, 0);
  const teamAvgTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
  const avgPerStylist = activeWorkload.length > 0 ? Math.round(totalAppointments / activeWorkload.length) : 0;
  const highestWorkload = activeWorkload[0] || { displayName: 'N/A', name: 'N/A', appointmentCount: 0, averageTicket: 0 };
  const lowestWorkload = activeWorkload[activeWorkload.length - 1] || { displayName: 'N/A', name: 'N/A', appointmentCount: 0, averageTicket: 0 };
  const maxCount = highestWorkload.appointmentCount;

  // Sort by efficiency for top performers
  const topByEfficiency = [...activeWorkload]
    .filter(w => w.appointmentCount >= 3) // Minimum threshold for meaningful average
    .sort((a, b) => b.averageTicket - a.averageTicket)
    .slice(0, 5);
  const highestAvgTicket = topByEfficiency[0]?.averageTicket || 0;

  // Prepare chart data
  const chartData = topStylists.map(s => ({
    name: s.displayName || s.name.split(' ')[0],
    fullName: s.displayName || s.name,
    appointments: s.appointmentCount,
    percentage: maxCount > 0 ? (s.appointmentCount / maxCount) * 100 : 0,
  }));

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">STYLIST WORKLOAD DISTRIBUTION</CardTitle>
                <MetricInfoTooltip description="Measures how evenly appointments are distributed across service providers. A high balance score (≥70%) indicates healthy distribution; lower scores suggest scheduling imbalances." />
              </div>
              <CardDescription>Appointment volume and balance across service providers</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size={tokens.button.card}
            onClick={() => navigate(analyticsHubUrl('operations', 'staff-utilization'))}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            View Full Report
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Workload Balance Gauge */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative inline-flex items-center justify-center">
              <div
                className={cn(
                  'w-24 h-24 rounded-full border-8 flex items-center justify-center bg-background',
                  getBalanceBorderColor(balanceScore)
                )}
              >
                <span className={cn('font-display text-2xl tabular-nums', getBalanceColor(balanceScore))}>
                  {balanceScore}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {getBalanceIcon(balanceScore)}
              <p className="text-sm font-medium">{getBalanceLabel(balanceScore)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Workload Balance</p>
          </div>

          {/* Mini Bar Chart - Top 5 */}
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground mb-2">Top 5 by Appointments</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} appointments`, 'Count']}
                  labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="appointments" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.6)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Metrics Section */}
        {topByEfficiency.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className={cn(tokens.heading.subsection, "mb-4 flex items-center gap-2")}>
              <DollarSign className="h-4 w-4 text-primary" />
              Productivity per Appointment
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Efficiency Ranking */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Top Performers (Avg Ticket)</p>
                <div className="space-y-2">
                  {topByEfficiency.map((stylist, idx) => (
                    <div key={stylist.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium w-5 text-muted-foreground">{idx + 1}</span>
                        <span className="text-sm truncate max-w-[100px]">
                          {stylist.displayName || stylist.name.split(' ')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">
                          <BlurredAmount>{formatCurrencyWhole(stylist.averageTicket)}</BlurredAmount>
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs tabular-nums',
                            stylist.efficiencyScore >= 110 ? 'text-chart-2 border-chart-2' :
                            stylist.efficiencyScore >= 90 ? 'text-primary border-primary' : 
                            'text-muted-foreground'
                          )}
                        >
                          {stylist.efficiencyScore}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Team Metrics */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Team Avg Ticket</span>
                  <span className="font-display text-lg tabular-nums">
                    <BlurredAmount>{formatCurrencyWhole(teamAvgTicket)}</BlurredAmount>
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Highest Performer</span>
                  <span className="font-display text-lg text-chart-2 tabular-nums">
                    <BlurredAmount>{formatCurrencyWhole(highestAvgTicket)}</BlurredAmount>
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-display text-lg tabular-nums">
                    <BlurredAmount>{formatCurrencyWhole(totalRevenue)}</BlurredAmount>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="font-display text-lg tabular-nums">{totalAppointments}</p>
            <p className="text-xs text-muted-foreground">Total Appts</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg tabular-nums">
              <BlurredAmount>{formatCurrencyWhole(teamAvgTicket)}</BlurredAmount>
            </p>
            <p className="text-xs text-muted-foreground">Avg Ticket</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg text-chart-2 tabular-nums">
              <BlurredAmount>{formatCurrencyWhole(highestAvgTicket)}</BlurredAmount>
            </p>
            <p className="text-xs text-muted-foreground">Top Productivity</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg tabular-nums">
              <BlurredAmount>{formatCurrencyWhole(totalRevenue)}</BlurredAmount>
            </p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
