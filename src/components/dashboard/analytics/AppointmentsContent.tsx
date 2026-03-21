import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  CalendarPlus,
  CalendarRange,
  CalendarCheck,
  MapPin,
  Info,
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useNewBookings } from '@/hooks/useNewBookings';
import { DailyVolume, HourlyDistribution, StatusBreakdown } from '@/hooks/useOperationalAnalytics';
import { parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { CapacityUtilizationSection } from './CapacityUtilizationSection';

const STATUS_COLORS: Record<string, string> = {
  completed: 'hsl(var(--chart-2))',
  confirmed: 'hsl(142 76% 36%)',
  checked_in: 'hsl(217 91% 60%)',
  booked: 'hsl(var(--muted-foreground))',
  cancelled: 'hsl(var(--muted))',
  no_show: 'hsl(var(--destructive))',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

import type { CapacityData } from '@/hooks/useHistoricalCapacityUtilization';

interface AppointmentsContentProps {
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    noShowCount: number;
    cancelledCount: number;
    noShowRate: number;
    cancellationRate: number;
    rebookedCount: number;
    rebookRate: number;
  };
  dailyVolume: DailyVolume[];
  statusBreakdown: StatusBreakdown[];
  hourlyDistribution: HourlyDistribution[];
  isLoading: boolean;
  capacityData?: CapacityData | null;
  capacityLoading?: boolean;
  dateRange?: 'tomorrow' | '7days' | '30days' | '90days';
  analyticsDateRange?: string;
  locationName?: string;
}

export function AppointmentsContent({ 
  summary, 
  dailyVolume, 
  statusBreakdown, 
  hourlyDistribution,
  isLoading,
  capacityData,
  capacityLoading,
  dateRange = '30days',
  analyticsDateRange,
  locationName
}: AppointmentsContentProps) {
  const { formatDate } = useFormatDate();
  // Build heatmap data
  const heatmapData = HOURS.map(hour => {
    const row: Record<string, number | string> = { hour: `${hour % 12 || 12}${hour >= 12 ? 'p' : 'a'}` };
    DAYS.forEach((day, idx) => {
      const match = hourlyDistribution.find(d => d.hour === hour && d.dayOfWeek === idx);
      row[day] = match?.count || 0;
    });
    return row;
  });

  const maxHeatValue = Math.max(...hourlyDistribution.map(d => d.count), 1);

  const { data: newBookings, isLoading: newBookingsLoading } = useNewBookings();

  return (
    <>
      {/* Summary Stats */}
      <PinnableCard 
        elementKey="appointments_summary" 
        elementName="Appointments Summary" 
        category="Analytics Hub - Operations"
        className="mb-6"
        dateRange={analyticsDateRange}
        locationName={locationName}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl">{summary.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">Total Appointments</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-display text-2xl">{summary.completedAppointments}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CalendarPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                {newBookingsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="font-display text-2xl">{newBookings?.bookedInRange || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Booked Today</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <CalendarRange className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                {newBookingsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="font-display text-2xl">{newBookings?.bookedInRange || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Booked in Last 7 Days</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className={cn(
                  "font-display text-2xl",
                  summary.noShowRate > 5 && "text-red-600"
                )}>
                  {summary.noShowRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">No-Show Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-display text-2xl">{summary.cancellationRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Cancellation Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CalendarCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={cn(
                  "font-display text-2xl",
                  summary.rebookRate >= 75 && "text-emerald-600"
                )}>
                  {summary.rebookRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Rebook Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <MapPin className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                {newBookingsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="font-display text-2xl">
                    {newBookings?.locationBreakdown?.length
                      ? Math.round((newBookings.last30Days || 0) / newBookings.locationBreakdown.length)
                      : 0}
                  </p>
                )}
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Avg Bookings / Location</p>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">Average number of bookings per location over the last 30 days.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </PinnableCard>

      {/* Capacity Utilization Section */}
      <PinnableCard 
        elementKey="capacity_utilization" 
        elementName="Capacity Utilization" 
        category="Analytics Hub - Operations"
        className="mb-8"
        dateRange={analyticsDateRange}
        locationName={locationName}
      >
        <CapacityUtilizationSection 
          capacityData={capacityData ?? null}
          isLoading={capacityLoading ?? false}
          dateRange={dateRange}
        />
      </PinnableCard>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Appointment Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Appointment Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : dailyVolume.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No appointment data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => formatDate(parseISO(date), 'MMM d')}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    labelFormatter={(date) => formatDate(parseISO(date as string), 'EEEE, MMM d')}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        count: 'Total',
                        completed: 'Completed',
                        cancelled: 'Cancelled',
                        noShow: 'No Shows'
                      };
                      return [value, labels[name] || name];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : statusBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={0}
                    stroke="hsl(var(--border) / 0.4)"
                    strokeWidth={1}
                    dataKey="count"
                    nameKey="status"
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell 
                        key={entry.status} 
                        fill={STATUS_COLORS[entry.status] || 'hsl(var(--muted))'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, _: string, props: any) => [
                      `${value} (${props.payload.percentage.toFixed(1)}%)`,
                      props.payload.status.replace('_', ' ')
                    ]}
                  />
                  <Legend 
                    formatter={(value) => value.replace('_', ' ')}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Peak Hours Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : hourlyDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No scheduling data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-xs font-medium text-muted-foreground text-left">Time</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-2 text-xs font-medium text-muted-foreground text-center">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-xs text-muted-foreground">{row.hour}</td>
                      {DAYS.map(day => {
                        const value = row[day] as number;
                        const intensity = value / maxHeatValue;
                        return (
                          <td key={day} className="p-1">
                            <div
                              className="w-full h-8 rounded flex items-center justify-center text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: value > 0 
                                  ? `hsl(var(--primary) / ${0.1 + intensity * 0.8})`
                                  : 'hsl(var(--muted) / 0.3)',
                                color: intensity > 0.5 ? 'white' : 'inherit'
                              }}
                            >
                              {value > 0 ? value : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
