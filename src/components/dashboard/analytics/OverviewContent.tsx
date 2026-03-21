import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Users,
  CheckCircle,
  XCircle,
  ArrowRight,
  BarChart3,
  UserCheck,
  AlertTriangle,
  Gauge,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import type { DailyVolume, RetentionMetrics } from '@/hooks/useOperationalAnalytics';
import type { CapacityData } from '@/hooks/useHistoricalCapacityUtilization';
import type { StaffWorkload } from '@/hooks/useStaffUtilization';
import type { LocationStaffingBalanceResult } from '@/hooks/useLocationStaffingBalance';

interface OverviewContentProps {
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
  retention?: RetentionMetrics;
  dailyVolume: DailyVolume[];
  isLoading: boolean;
  onNavigateToTab: (tab: string) => void;
  capacityData?: CapacityData | null;
  capacityLoading?: boolean;
  workload: StaffWorkload[];
  workloadLoading?: boolean;
  staffingBalance?: LocationStaffingBalanceResult;
}

export function OverviewContent({ 
  summary, 
  retention, 
  dailyVolume,
  isLoading,
  onNavigateToTab,
  capacityData,
  capacityLoading,
  workload,
  workloadLoading,
  staffingBalance,
}: OverviewContentProps) {
  const { formatNumber } = useFormatNumber();

  const completionRate = summary.totalAppointments > 0 
    ? (summary.completedAppointments / summary.totalAppointments * 100).toFixed(1)
    : '0';

  const peakDay = dailyVolume.reduce(
    (max, d) => (d.count > max.count ? d : max),
    { date: '', count: 0 }
  );

  const anyLoading = isLoading || capacityLoading || workloadLoading || staffingBalance?.isLoading;

  return (
    <div className="space-y-6">
      {/* ── Section 1: Operations Pulse ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base tracking-wide">OPERATIONS PULSE</CardTitle>
            <MetricInfoTooltip description="High-level operational health: appointment volume, completion and no-show rates, and capacity utilization for the selected period." />
          </div>
          <CardDescription>Key operational indicators for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {anyLoading ? (
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
                <span className="text-lg font-display tabular-nums">{summary.totalAppointments}</span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">Total Appointments</p>
                  <MetricInfoTooltip description="All scheduled appointments (excluding cancelled) in the selected period." />
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <CheckCircle className="w-4 h-4 text-chart-2" />
                </div>
                <span className="text-lg font-display tabular-nums">{completionRate}%</span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                  <MetricInfoTooltip description="Percentage of appointments that were completed versus total scheduled. Higher is better." />
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
                <span className={cn(
                  "text-lg font-display tabular-nums",
                  summary.noShowRate > 5 && "text-destructive"
                )}>
                  {summary.noShowRate.toFixed(1)}%
                </span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">No-Show Rate</p>
                  <MetricInfoTooltip description="Percentage of appointments where the client did not arrive. Rates above 5% are flagged." />
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-center mb-1">
                  <Gauge className="w-4 h-4 text-chart-3" />
                </div>
                <span className="text-lg font-display tabular-nums">
                  {capacityData ? `${capacityData.overallUtilization.toFixed(0)}%` : 'NA'}
                </span>
                <div className="flex items-center gap-1 justify-center">
                  <p className="text-xs text-muted-foreground">Capacity Utilization</p>
                  <MetricInfoTooltip description="Percentage of available chair-hours that are booked. Compares booked time against total stylist capacity." />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Category Drill-Down Cards ── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Appointments Card */}
        <Card 
          className="cursor-pointer hover:bg-muted/20 transition-colors group"
          onClick={() => onNavigateToTab('appointments')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-display text-sm tracking-wide mb-3">APPOINTMENTS</h3>
            {anyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display tabular-nums">{summary.totalAppointments}</span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {peakDay.date
                    ? `Peak: ${new Date(peakDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} (${peakDay.count})`
                    : 'No peak day data'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Rebook rate: <span className="tabular-nums text-foreground">{summary.rebookRate.toFixed(1)}%</span>
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60 mt-3">Volume trends, status breakdown, peak hours</p>
          </CardContent>
        </Card>

        {/* Clients Card */}
        <Card 
          className="cursor-pointer hover:bg-muted/20 transition-colors group"
          onClick={() => onNavigateToTab('clients')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Users className="w-5 h-5 text-chart-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-display text-sm tracking-wide mb-3">CLIENTS</h3>
            {anyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display tabular-nums">
                    {retention ? formatNumber(retention.totalClients) : '0'}
                  </span>
                  <span className="text-xs text-muted-foreground">total clients</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="tabular-nums text-foreground">{retention?.newClients || 0}</span> new
                  {' / '}
                  Retention: <span className="tabular-nums text-foreground">{retention?.retentionRate.toFixed(0) || 0}%</span>
                </p>
                {(retention?.atRiskClients || 0) > 0 ? (
                  <p className="text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-chart-4" />
                    <span className="tabular-nums text-chart-4">{retention?.atRiskClients}</span>
                    <span className="text-muted-foreground">at-risk</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No at-risk clients</p>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60 mt-3">Retention metrics, at-risk clients, segments</p>
          </CardContent>
        </Card>

        {/* Staffing Card */}
        <Card 
          className="cursor-pointer hover:bg-muted/20 transition-colors group"
          onClick={() => onNavigateToTab('staffing')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <BarChart3 className="w-5 h-5 text-chart-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-display text-sm tracking-wide mb-3">STAFFING</h3>
            {anyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display tabular-nums">{workload.length}</span>
                  <span className="text-xs text-muted-foreground">service providers</span>
                </div>
                {staffingBalance && staffingBalance.locations.length > 0 ? (
                  <>
                    {staffingBalance.understaffedCount > 0 ? (
                      <p className="text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                        <span className="tabular-nums text-destructive">{staffingBalance.understaffedCount}</span>
                        <span className="text-muted-foreground">understaffed</span>
                      </p>
                    ) : null}
                    {staffingBalance.overstaffedCount > 0 ? (
                      <p className="text-xs flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-chart-5" />
                        <span className="tabular-nums text-chart-5">{staffingBalance.overstaffedCount}</span>
                        <span className="text-muted-foreground">overstaffed</span>
                      </p>
                    ) : null}
                    {staffingBalance.understaffedCount === 0 && staffingBalance.overstaffedCount === 0 ? (
                      <p className="text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-chart-2" />
                        <span className="text-chart-2">All locations balanced</span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No location data</p>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60 mt-3">Hiring capacity, staffing balance, trends</p>
          </CardContent>
        </Card>

        {/* Staff Utilization Card */}
        <Card 
          className="cursor-pointer hover:bg-muted/20 transition-colors group"
          onClick={() => onNavigateToTab('staff-utilization')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <UserCheck className="w-5 h-5 text-chart-2" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-display text-sm tracking-wide mb-3">STAFF UTILIZATION</h3>
            {anyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display tabular-nums">
                    {capacityData ? `${capacityData.overallUtilization.toFixed(0)}%` : 'NA'}
                  </span>
                  <span className="text-xs text-muted-foreground">capacity</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {capacityData
                    ? `${capacityData.totalBookedHours}h booked / ${capacityData.gapHours.toFixed(0)}h unused`
                    : 'No capacity data'}
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60 mt-3">Workload distribution, qualifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
