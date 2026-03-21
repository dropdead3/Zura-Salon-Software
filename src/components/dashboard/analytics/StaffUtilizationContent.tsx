import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  MapPin,
  BarChart3,
  ClipboardCheck
} from 'lucide-react';
import { useStaffUtilization } from '@/hooks/useStaffUtilization';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

import type { StaffDateRange } from '@/hooks/useStaffUtilization';

interface StaffUtilizationContentProps {
  locationId?: string;
  dateRange: StaffDateRange;
}

function getEfficiencyColor(score: number): string {
  if (score >= 100) return 'text-chart-2';
  if (score >= 80) return 'text-muted-foreground';
  return 'text-destructive';
}

function getEfficiencyBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 100) return 'default';
  if (score >= 80) return 'secondary';
  return 'destructive';
}

export function StaffUtilizationContent({ locationId, dateRange }: StaffUtilizationContentProps) {
  const { workload, qualifications, locationDistribution, isLoading } = useStaffUtilization(
    locationId,
    dateRange
  );
  const { formatCurrencyWhole, currency } = useFormatCurrency();

  // Summary stats
  const totalAppointments = workload.reduce((sum, s) => sum + s.appointmentCount, 0);
  const totalCompleted = workload.reduce((sum, s) => sum + s.completedCount, 0);
  const totalNoShows = workload.reduce((sum, s) => sum + s.noShowCount, 0);
  const avgPerStylist = workload.length > 0 ? Math.round(totalAppointments / workload.length) : 0;

  // Chart data sliced for the bar chart
  const chartData = workload.slice(0, 10);

  return (
    <>
      {/* ── Summary KPI Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base tracking-wide">STAFF UTILIZATION</CardTitle>
            <MetricInfoTooltip description="Appointment volume, completion rate, and no-show rate for service providers (stylists and assistants) in the selected period. Non-service roles are excluded." />
          </div>
          <CardDescription>
            {isLoading
              ? 'Loading service provider metrics...'
              : `Tracking ${workload.length} service provider${workload.length !== 1 ? 's' : ''} for the selected period`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="text-lg font-display tabular-nums">{totalAppointments}</span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">Total Appointments</p>
                  <MetricInfoTooltip description="Total scheduled appointments (excluding cancelled) for service providers in the selected period." />
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <span className="text-lg font-display tabular-nums">{totalCompleted}</span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <MetricInfoTooltip description="Appointments marked as completed. Completion rate indicates follow-through and schedule reliability." />
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-lg font-display tabular-nums">{totalNoShows}</span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">No Shows</p>
                  <MetricInfoTooltip description="Clients who did not arrive for their appointment. Track to identify patterns and reduce lost revenue." />
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <span className="text-lg font-display tabular-nums">{avgPerStylist}</span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">Avg Per Stylist</p>
                  <MetricInfoTooltip description="Average appointment count per service provider. Helps identify workload balance across the team." />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Appointment Count by Stylist */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">APPOINTMENT COUNT BY STYLIST</CardTitle>
                  <MetricInfoTooltip description="Stacked bar chart showing completed appointments and no-shows per service provider. Top 10 by volume are displayed." />
                </div>
                <CardDescription>Completed and no-show breakdown per team member</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton lines={8} className="h-[300px]" />
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No appointment data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="displayName" 
                    width={100}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string, index: number) =>
                      chartData[index]?.displayName || chartData[index]?.name?.split(' ')[0] || value
                    }
                  />
                  <Tooltip 
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        completedCount: 'Completed',
                        noShowCount: 'No Shows'
                      };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Bar
                    dataKey="completedCount"
                    stackId="a"
                    fill="hsl(var(--chart-2))"
                    name="completedCount"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="noShowCount"
                    stackId="a"
                    fill="hsl(var(--destructive))"
                    name="noShowCount"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">LOCATION DISTRIBUTION</CardTitle>
                  <MetricInfoTooltip description="Appointment volume split by location. Shows how workload is distributed across your locations." />
                </div>
                <CardDescription>Appointments by location</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton lines={6} className="h-[250px]" />
            ) : locationDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <MapPin className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No location data available</p>
                <p className="text-xs mt-1">Appointments will appear here once synced</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={locationDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={0}
                    stroke="hsl(var(--border) / 0.4)"
                    strokeWidth={1}
                    dataKey="appointmentCount"
                    nameKey="locationName"
                  >
                    {locationDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [value, 'Appointments']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Staff Workload Details ── */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">STAFF WORKLOAD DETAILS</CardTitle>
                <MetricInfoTooltip description="Individual service provider performance: appointment counts, average ticket value, and relative efficiency score. Efficiency of 100 equals team average; higher means more productive per appointment." />
              </div>
              <CardDescription>Individual service provider performance and workload balance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : workload.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No staff data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workload.map(staff => (
                <div key={staff.userId} className="flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={staff.photoUrl || undefined} />
                    <AvatarFallback>
                      {(staff.displayName || staff.name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">
                        {staff.displayName || staff.name}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground tabular-nums">
                          {staff.appointmentCount} appts
                        </span>
                        <span className="text-chart-2 tabular-nums">
                          {staff.completedCount} completed
                        </span>
                        {staff.noShowCount > 0 && (
                          <span className="text-destructive tabular-nums">
                            {staff.noShowCount} no-shows
                          </span>
                        )}
                        {staff.averageTicket > 0 && (
                          <span className="text-xs text-muted-foreground">
                            avg{' '}
                            <AnimatedBlurredAmount
                              value={staff.averageTicket}
                              currency={currency}
                              className="tabular-nums"
                            />
                          </span>
                        )}
                        <Badge
                          variant={getEfficiencyBadgeVariant(staff.efficiencyScore)}
                          className="text-[10px] px-1.5 py-0 tabular-nums"
                        >
                          {staff.efficiencyScore}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={staff.utilizationScore} className="h-2 flex-1" />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                        {Math.round(staff.utilizationScore)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Service Qualifications ── */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">SERVICE QUALIFICATIONS</CardTitle>
                <MetricInfoTooltip description="Service categories each staff member is qualified to perform. Helps identify coverage gaps and cross-training opportunities." />
              </div>
              <CardDescription>Qualified service categories by team member</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton lines={6} className="h-[200px]" />
          ) : qualifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No service qualification data available</p>
              <p className="text-xs mt-1">Configure staff service mappings to populate this section.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qualifications.map(staff => (
                <div key={staff.userId} className="border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                  <p className="font-medium mb-2">{staff.staffName}</p>
                  <div className="flex flex-wrap gap-1">
                    {staff.serviceCategories.map(category => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                  {staff.qualifiedServices.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +{staff.qualifiedServices.length - 5} more services
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
