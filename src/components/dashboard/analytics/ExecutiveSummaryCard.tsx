import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { PipelineActionGuide } from '@/components/dashboard/PipelineActionGuide';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  AlertCircle,
  DollarSign,
  Users,
  UserCheck,
  Activity,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  TrendingUp,
  TrendingDown,
  CalendarIcon,
  Building2,
  Wallet,
  CalendarCheck2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSalesMetrics, useSalesByLocation, useSalesByStylist } from '@/hooks/useSalesData';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useClientStats } from '@/hooks/useClientsData';
import { useCapacityUtilization } from '@/hooks/useCapacityUtilization';
import { useExpectedRentRevenue } from '@/hooks/useExpectedRentRevenue';
import { useHasRenters } from '@/hooks/useHasRenters';
import { useBookingPipeline } from '@/hooks/useBookingPipeline';
import { usePaySchedule } from '@/hooks/usePaySchedule';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { subDays, differenceInDays, parseISO, format, startOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type SummaryRange = 'today' | '7d' | '30d' | 'mtd' | 'ytd';

const SUMMARY_RANGE_KEY = 'exec-summary-range';

const SUMMARY_RANGES: { key: SummaryRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
];

interface KpiData {
  icon: typeof DollarSign;
  label: string;
  value: React.ReactNode;
  drillDown: string;
  drillLabel: string;
  change: number | null;
  valueColor?: string;
  subtitle?: string;
  badge?: { label: string; color: string };
  actionBadge?: { label: string; onClick: () => void };
  tooltip: string;
}

function KpiTile({ kpi }: { kpi: KpiData }) {
  return (
    <Link
      to={kpi.drillDown}
      className="group h-full flex flex-col p-4 rounded-lg border border-border/50 bg-muted/30 transition-colors duration-200 hover:bg-muted/60 hover:border-border"
    >
      <div className="flex-1">
        <div className="flex items-center gap-1 mb-2">
          <kpi.icon className="w-4 h-4 text-primary shrink-0" />
          <span className="font-display text-[11px] tracking-wide text-muted-foreground uppercase">
            {kpi.label}
          </span>
          <MetricInfoTooltip description={kpi.tooltip} />
        </div>
        <div className="flex flex-col gap-1 mb-2">
          <p className={cn("font-display text-xl tabular-nums", kpi.valueColor)}>
            {kpi.value}
          </p>
          {kpi.change !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-display tabular-nums w-fit',
                kpi.change >= 0
                  ? 'bg-chart-2/10 text-chart-2'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {kpi.change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {kpi.change >= 0 ? '+' : ''}
              {kpi.change.toFixed(1)}%
            </span>
          )}
          {kpi.badge && (
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-display w-fit', kpi.badge.color)}>
              {kpi.badge.label}
            </span>
          )}
          {kpi.actionBadge && (
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full px-3 h-6 text-[10px] font-sans w-fit"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                kpi.actionBadge!.onClick();
              }}
            >
              {kpi.actionBadge.label}
            </Button>
          )}
          {kpi.subtitle && (
            <span className="text-[10px] text-muted-foreground/70 mt-0.5">
              {kpi.subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto self-end flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        <span>{kpi.drillLabel}</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

export function ExecutiveSummaryCard() {
  const { dashPath } = useOrgDashboardPath();
  const { formatCurrencyWhole } = useFormatCurrency();
  const { data: hasRenters = false } = useHasRenters();
  const [showActionGuide, setShowActionGuide] = useState(false);
  const { data: hasRenters = false } = useHasRenters();

  // Internal date range state with persistence
  const [range, setRange] = useState<SummaryRange>(() => {
    const stored = localStorage.getItem(SUMMARY_RANGE_KEY);
    return SUMMARY_RANGES.some(r => r.key === stored) ? (stored as SummaryRange) : 'today';
  });

  useEffect(() => {
    localStorage.setItem(SUMMARY_RANGE_KEY, range);
  }, [range]);

  // Location access
  const { accessibleLocations, canViewAggregate, defaultLocationId } = useUserLocationAccess();
  const [locationId, setLocationId] = useState('');
  const showLocationSelector = accessibleLocations.length > 1;

  useEffect(() => {
    if (!locationId && defaultLocationId) setLocationId(defaultLocationId);
  }, [defaultLocationId, locationId]);

  // Compute date range from selected range
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const to = format(now, 'yyyy-MM-dd');
    switch (range) {
      case 'today': return { dateFrom: to, dateTo: to };
      case '7d':    return { dateFrom: format(subDays(now, 6), 'yyyy-MM-dd'), dateTo: to };
      case '30d':   return { dateFrom: format(subDays(now, 29), 'yyyy-MM-dd'), dateTo: to };
      case 'mtd':   return { dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), dateTo: to };
      case 'ytd':   return { dateFrom: format(startOfYear(now), 'yyyy-MM-dd'), dateTo: to };
    }
  }, [range]);

  const locFilter = locationId === 'all' ? undefined : locationId;

  // Calculate prior period dates for revenue comparison
  const { priorFrom, priorTo } = useMemo(() => {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);
    const daySpan = differenceInDays(to, from);
    return {
      priorFrom: format(subDays(from, daySpan + 1), 'yyyy-MM-dd'),
      priorTo: format(subDays(from, 1), 'yyyy-MM-dd'),
    };
  }, [dateFrom, dateTo]);

  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useSalesMetrics({ dateFrom, dateTo, locationId: locFilter });

  // Prior period revenue for % change badge
  const { data: priorMetrics } = useSalesMetrics({
    dateFrom: priorFrom,
    dateTo: priorTo,
    locationId: locFilter,
  });

  const {
    data: teamData,
    isLoading: teamLoading,
    isError: teamError,
    refetch: refetchTeam,
  } = useTeamDirectory(locFilter);

  const {
    data: clientStats,
    isLoading: clientsLoading,
    isError: clientsError,
    refetch: refetchClients,
  } = useClientStats(locFilter);

  const {
    data: capacityData,
    isLoading: capacityLoading,
    isError: capacityError,
    refetch: refetchCapacity,
  } = useCapacityUtilization('30days', locFilter);

  const {
    data: locationData,
    isLoading: locationsLoading,
    refetch: refetchLocations,
  } = useSalesByLocation(dateFrom, dateTo);

  // Rent revenue (expected + collected) for the selected date range
  const {
    data: rentData,
    isLoading: rentLoading,
  } = useExpectedRentRevenue(dateFrom, dateTo);

  // Commission liability for the current pay period to date
  const { currentPeriod } = usePaySchedule();
  const { data: levels, isLoading: tiersLoading } = useStylistLevels();
  const calculateCommission = (serviceRevenue: number, productRevenue: number) => {
    if (!levels || levels.length === 0) return { totalCommission: 0 };
    const midLevel = levels[Math.floor(levels.length / 2)];
    const svcRate = midLevel.service_commission_rate ?? 0;
    const retailRate = midLevel.retail_commission_rate ?? 0;
    return { totalCommission: serviceRevenue * svcRate + productRevenue * retailRate };
  };

  const payPeriodFrom = format(currentPeriod.periodStart, 'yyyy-MM-dd');
  const payPeriodTo = format(new Date(), 'yyyy-MM-dd');

  const {
    data: payPeriodStylists,
    isLoading: stylistsLoading,
  } = useSalesByStylist(payPeriodFrom, payPeriodTo);

  // Compute total commission liability across all stylists
  const commissionLiability = useMemo(() => {
    if (!payPeriodStylists?.length) return 0;
    return payPeriodStylists.reduce((sum, s) => {
      const c = calculateCommission(s.serviceRevenue ?? 0, s.productRevenue ?? 0);
      return sum + c.totalCommission;
    }, 0);
  }, [payPeriodStylists, calculateCommission]);

  // Booking pipeline health
  const pipeline = useBookingPipeline(locFilter);

  const isLoading = metricsLoading || teamLoading || clientsLoading || capacityLoading || locationsLoading || rentLoading;
  const isError = metricsError || teamError || clientsError || capacityError;

  if (isError) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load executive summary.</span>
          </div>
          <Button
            variant="outline"
            size={tokens.button.card}
            className="mt-3"
            onClick={() => {
              refetchMetrics();
              refetchTeam();
              refetchClients();
              refetchCapacity();
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const revenue = metrics?.totalRevenue ?? 0;
  const priorRevenue = priorMetrics?.totalRevenue ?? 0;
  const revenueChange = priorRevenue > 0
    ? ((revenue - priorRevenue) / priorRevenue) * 100
    : revenue > 0 ? 100 : 0;
  const staffCount = teamData?.length ?? 0;
  const totalClients = clientStats?.total ?? 0;
  const utilization = capacityData?.overallUtilization ?? 0;
  const locations = (locationData ?? []).filter((l) => l.totalRevenue > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Rent revenue data
  const expectedRent = rentData?.expectedRent ?? 0;
  const collectedRent = rentData?.collectedRent ?? 0;
  const collectionRate = rentData?.collectionRate ?? 0;

  // Pay period label
  const payPeriodLabel = `${format(currentPeriod.periodStart, 'MMM d')} - ${format(currentPeriod.periodEnd, 'MMM d')}`;

  const allKpis: KpiData[] = [
    {
      icon: DollarSign,
      label: 'Sales Revenue',
      value: <BlurredAmount>{formatCurrencyWhole(revenue)}</BlurredAmount>,
      drillDown: '/dashboard/admin/analytics?tab=sales',
      drillLabel: 'View Sales',
      change: revenueChange,
      tooltip: 'Total service and product revenue from completed appointments in the selected date range.',
    },
    {
      icon: Building2,
      label: 'Rent Revenue',
      value: <BlurredAmount>{formatCurrencyWhole(hasRenters ? expectedRent : 0)}</BlurredAmount>,
      drillDown: '/dashboard/admin/booth-renters',
      drillLabel: 'View Renters',
      change: null,
      tooltip: 'Expected rent from active booth rental contracts, pro-rated to the selected date range. Collection rate shows how much has actually been paid.',
      subtitle: hasRenters && rentData?.activeRenterCount ? `${rentData.activeRenterCount} active renters` : undefined,
      badge: !hasRenters
        ? { label: 'No booth renters', color: 'bg-muted text-muted-foreground' }
        : expectedRent > 0
          ? { label: `${collectionRate}% collected`, color: collectionRate >= 90 ? 'bg-chart-2/10 text-chart-2' : collectionRate >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive' }
          : undefined,
    },
    {
      icon: Wallet,
      label: 'Commission Liability',
      value: <BlurredAmount>{formatCurrencyWhole(Math.round(commissionLiability))}</BlurredAmount>,
      drillDown: '/dashboard/admin/payroll?tab=commissions',
      drillLabel: 'View Payroll',
      change: null,
      tooltip: 'Estimated commission owed to all stylists for the current pay period, calculated from each stylist\'s revenue and their commission tier.',
      subtitle: `Pay period: ${payPeriodLabel}`,
    },
    {
      icon: Users,
      label: 'Total Staff',
      value: staffCount.toLocaleString(),
      drillDown: '/dashboard/admin/team',
      drillLabel: 'View Team',
      change: null,
      tooltip: 'Count of active team members. Filtered by location when a specific location is selected.',
    },
    {
      icon: UserCheck,
      label: 'Total Clients',
      value: totalClients.toLocaleString(),
      drillDown: '/dashboard/admin/analytics?tab=operations&subtab=clients',
      drillLabel: 'View Clients',
      change: null,
      tooltip: 'Count of active client records. Includes all clients with at least one visit on file.',
    },
    {
      icon: Activity,
      label: 'Utilization',
      value: `${utilization.toFixed(0)}%`,
      valueColor: utilization >= 60 ? 'text-chart-2' : utilization >= 30 ? 'text-amber-500' : 'text-destructive',
      drillDown: '/dashboard/admin/analytics?tab=operations&subtab=staff-utilization',
      drillLabel: 'View Capacity',
      change: null,
      tooltip: 'Percentage of available appointment capacity that is booked, based on the last 30 days of scheduling data.',
    },
    {
      icon: CalendarCheck2,
      label: 'Booking Pipeline',
      value: pipeline.label,
      valueColor: pipeline.status === 'healthy' ? 'text-chart-2' : pipeline.status === 'slowing' ? 'text-amber-500' : 'text-destructive',
      drillDown: '/dashboard/admin/analytics?tab=operations&subtab=booking-pipeline',
      drillLabel: 'View Pipeline',
      change: null,
      subtitle: `${pipeline.forwardCount} appts next 14d vs ${pipeline.baselineCount} avg`,
      tooltip: 'Compares appointments booked for the next 14 days against your trailing 14-day average. Flags slowdowns before they impact revenue.',
    },
  ];

  // Split into revenue/liability (first group) and operations (rest)
  const revenueKpis = allKpis.filter(k => ['Sales Revenue', 'Rent Revenue', 'Commission Liability'].includes(k.label));
  const operationsKpis = allKpis.filter(k => !['Sales Revenue', 'Rent Revenue', 'Commission Liability'].includes(k.label));

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-pinnable-anchor
              className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0"
            >
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm tracking-wide text-muted-foreground uppercase truncate">
                Executive Summary
              </h3>
              <MetricInfoTooltip description="A snapshot of your key business metrics. Sales revenue is from completed appointments, rent revenue is pro-rated from active contracts, and commission liability is calculated for the current pay period." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Location selector */}
            {showLocationSelector && (
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="h-7 w-auto min-w-[110px] max-w-[160px] rounded-lg border-border/50 font-sans text-xs px-2 gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canViewAggregate && (
                    <SelectItem value="all">All Locations</SelectItem>
                  )}
                  {accessibleLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Date range selector */}
            <Select value={range} onValueChange={(v) => setRange(v as SummaryRange)}>
              <SelectTrigger className="h-7 w-auto min-w-[80px] rounded-lg border-border/50 font-sans text-xs px-2 gap-1">
                <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_RANGES.map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Revenue & Liability Section */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-display text-[10px] tracking-widest text-muted-foreground/60 uppercase">Revenue & Liability</span>
          </div>
          <div className={cn("grid grid-cols-1 gap-4", revenueKpis.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
            {revenueKpis.map((kpi) => (
              <KpiTile key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </div>

        {/* Operations Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-display text-[10px] tracking-widest text-muted-foreground/60 uppercase">Operations</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {operationsKpis.map((kpi) => (
              <KpiTile key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </div>

        {locations.length > 1 && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-display text-[11px] tracking-wide text-muted-foreground uppercase">
                  Revenue by Location
                </span>
              </div>
              {locations.length > 5 && (
                <Link
                  to={dashPath('/admin/analytics?tab=sales')}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            <div className="space-y-0">
              {locations.slice(0, 5).map((loc, idx, arr) => {
                const totalLocRevenue = locations.reduce((sum, l) => sum + l.totalRevenue, 0) || 1;
                const pct = (loc.totalRevenue / totalLocRevenue) * 100;
                return (
                  <div
                    key={loc.location_id}
                    className={`flex items-center justify-between py-3 px-1 ${
                      idx < arr.length - 1 ? 'border-b border-border/40' : ''
                    }`}
                  >
                    <span className="text-sm truncate mr-4">{loc.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-display tabular-nums">
                        <BlurredAmount>{formatCurrencyWhole(loc.totalRevenue)}</BlurredAmount>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-end">
          <span className="text-[10px] text-muted-foreground/50">
            Updated {format(new Date(), 'h:mm a')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
