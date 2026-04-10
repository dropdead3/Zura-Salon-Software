import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Scissors,
  Calendar,
  RefreshCw,
  Loader2,
  MapPin,
  Download,
  Target,
  GitCompare,
  BarChart3,
  Users,
  Link2,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useSalesMetrics, useSalesTrend, useSalesByStylist, useSalesByLocation, useSalesByPhorestStaff } from '@/hooks/useSalesData';
import { useTriggerPhorestSync, usePhorestConnection, useCreateStaffMapping } from '@/hooks/usePhorestSync';
import { useLocations, type HoursJson, type HolidayClosure } from '@/hooks/useLocations';
import { useSalesGoals } from '@/hooks/useSalesGoals';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { cn } from '@/lib/utils';
import { CommandCenterVisibilityToggle } from '@/components/dashboard/CommandCenterVisibilityToggle';

// Sub-components
import { SalesGoalsDialog } from '@/components/dashboard/sales/SalesGoalsDialog';
import { SalesGoalProgress } from '@/components/dashboard/sales/SalesGoalProgress';
import { LocationComparison } from '@/components/dashboard/sales/LocationComparison';
import { HistoricalComparison } from '@/components/dashboard/sales/HistoricalComparison';
import { StylistSalesRow } from '@/components/dashboard/sales/StylistSalesRow';
import { SalesTrendIndicator } from '@/components/dashboard/sales/SalesTrendIndicator';
import { LastSyncIndicator } from '@/components/dashboard/sales/LastSyncIndicator';
import { ProductCategoryChart } from '@/components/dashboard/sales/ProductCategoryChart';
import { ServicePopularityChart } from '@/components/dashboard/sales/ServicePopularityChart';
import { ClientFunnelCard } from '@/components/dashboard/sales/ClientFunnelCard';
import { PeakHoursHeatmap } from '@/components/dashboard/sales/PeakHoursHeatmap';
import { CommissionCalculator } from '@/components/dashboard/sales/CommissionCalculator';
import { SalesReportPDF } from '@/components/dashboard/sales/SalesReportPDF';
// CommissionTiersEditor removed — rates now managed via Stylist Levels in Settings

import { RevenueForecast } from '@/components/dashboard/sales/RevenueForecast';
import { YearOverYearComparison } from '@/components/dashboard/sales/YearOverYearComparison';
import { GoogleSheetsExport } from '@/components/dashboard/sales/GoogleSheetsExport';
import { PhorestStaffRow, PhorestStaffData } from '@/components/dashboard/sales/PhorestStaffRow';
import { StaffMatchingSuggestions, MatchSuggestion } from '@/components/dashboard/sales/StaffMatchingSuggestions';

type DateRange = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek' | 'thisMonth' | 'todayToEom' | 'lastMonth';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [phorestStaffFilter, setPhorestStaffFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [linkingStaffId, setLinkingStaffId] = useState<string | null>(null);
  
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const { data: locations } = useLocations();
  const syncSales = useTriggerPhorestSync();
  const { goals } = useSalesGoals();
  const { data: phorestConnection } = usePhorestConnection();
  const createMapping = useCreateStaffMapping();
  const { data: employees } = useEmployeeProfile();

  // Calculate date filters
  const dateFilters = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { dateFrom: format(now, 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { dateFrom: format(yesterday, 'yyyy-MM-dd'), dateTo: format(yesterday, 'yyyy-MM-dd') };
      case '7d':
        return { dateFrom: format(subDays(now, 7), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
      case '30d':
        return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
      case 'thisWeek':
        return { 
          dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), 
          dateTo: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') 
        };
      case 'thisMonth':
        return { 
          dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), 
          dateTo: format(endOfMonth(now), 'yyyy-MM-dd') 
        };
      case 'todayToEom':
        return { 
          dateFrom: format(now, 'yyyy-MM-dd'), 
          dateTo: format(endOfMonth(now), 'yyyy-MM-dd') 
        };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        return { 
          dateFrom: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), 
          dateTo: format(endOfMonth(lastMonth), 'yyyy-MM-dd') 
        };
      default:
        return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    }
  }, [dateRange]);

  const filters = {
    ...dateFilters,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
  };

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics(filters);
  const { data: trendData, isLoading: trendLoading } = useSalesTrend(
    dateFilters.dateFrom, 
    dateFilters.dateTo,
    locationFilter !== 'all' ? locationFilter : undefined
  );
  const { data: stylistData, isLoading: stylistLoading } = useSalesByStylist(dateFilters.dateFrom, dateFilters.dateTo);
  const { data: locationData, isLoading: locationLoading } = useSalesByLocation(dateFilters.dateFrom, dateFilters.dateTo);
  const { data: phorestStaffData, isLoading: phorestStaffLoading } = useSalesByPhorestStaff(dateFilters.dateFrom, dateFilters.dateTo);

  // Calculate goal based on date range
  const currentGoal = useMemo(() => {
    const isMonthly = dateRange === 'thisMonth' || dateRange === '30d' || dateRange === 'lastMonth';
    if (locationFilter !== 'all' && goals?.locationTargets?.[locationFilter]) {
      return isMonthly 
        ? goals.locationTargets[locationFilter].monthly 
        : goals.locationTargets[locationFilter].weekly;
    }
    return isMonthly ? (goals?.monthlyTarget || 50000) : (goals?.weeklyTarget || 12500);
  }, [dateRange, locationFilter, goals]);

  // Format trend data for chart
  const chartData = useMemo(() => {
    const data = trendData?.overall || trendData || [];
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      ...d,
      dateLabel: formatDate(new Date(d.date), 'MMM d'),
    }));
  }, [trendData]);

  // Pie chart data for revenue breakdown
  const revenueBreakdown = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Services', value: metrics.serviceRevenue, color: CHART_COLORS[0] },
      { name: 'Products', value: metrics.productRevenue, color: CHART_COLORS[1] },
    ].filter(d => d.value > 0);
  }, [metrics]);

  const totalStylistRevenue = useMemo(() => {
    return (stylistData || []).reduce((sum, s) => sum + s.totalRevenue, 0) || 1;
  }, [stylistData]);

  const totalPhorestStaffRevenue = useMemo(() => {
    return (phorestStaffData?.allStaff || []).reduce((sum, s) => sum + s.totalRevenue, 0) || 1;
  }, [phorestStaffData]);

  // Filter Phorest staff based on filter selection
  const filteredPhorestStaff = useMemo(() => {
    const allStaff = phorestStaffData?.allStaff || [];
    switch (phorestStaffFilter) {
      case 'mapped': return allStaff.filter(s => s.isMapped);
      case 'unmapped': return allStaff.filter(s => !s.isMapped);
      default: return allStaff;
    }
  }, [phorestStaffData, phorestStaffFilter]);

  // Generate matching suggestions
  const matchingSuggestions = useMemo((): MatchSuggestion[] => {
    if (!phorestConnection?.staff_list || !phorestStaffData) return [];
    
    // Get unmapped phorest staff IDs that have sales data
    const unmappedStaffWithSales = phorestStaffData.allStaff.filter(s => !s.isMapped);
    if (unmappedStaffWithSales.length === 0) return [];

    // We need employee data - for now we'll use the connection staff list
    // In a real implementation, we'd fetch unmapped employees too
    const suggestions: MatchSuggestion[] = [];
    
    // Get phorest staff that aren't mapped
    const phorestStaff = phorestConnection.staff_list || [];
    
    // This would need access to employee_profiles that aren't yet mapped
    // For now, return empty - the full implementation would query unmapped employees
    
    return suggestions.slice(0, 5);
  }, [phorestConnection, phorestStaffData]);

  // Handle quick link from Phorest Staff tab
  const handleStaffLink = (staff: PhorestStaffData) => {
    navigate(dashPath('/admin/phorest-settings'));
  };

  // Handle suggestion link
  const handleSuggestionLink = async (suggestion: MatchSuggestion) => {
    setLinkingStaffId(suggestion.phorestStaffId);
    try {
      await createMapping.mutateAsync({
        user_id: suggestion.employeeId,
        phorest_staff_id: suggestion.phorestStaffId,
        phorest_staff_name: suggestion.phorestStaffName,
        phorest_staff_email: suggestion.phorestStaffEmail,
        phorest_branch_id: suggestion.phorestBranchId,
        phorest_branch_name: suggestion.phorestBranchName,
      });
    } finally {
      setLinkingStaffId(null);
    }
  };

  const handleExportCSV = () => {
    if (!stylistData) return;
    
    const headers = ['Stylist', 'Total Revenue', 'Service Revenue', 'Product Revenue', 'Services', 'Products', 'Transactions'];
    const rows = stylistData.map(s => [
      s.name,
      s.totalRevenue.toFixed(2),
      s.serviceRevenue.toFixed(2),
      s.productRevenue.toFixed(2),
      s.totalServices,
      s.totalProducts,
      s.totalTransactions,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateFilters.dateFrom}-to-${dateFilters.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center rounded-lg shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-display truncate">SALES DASHBOARD</h1>
                <p className="text-muted-foreground text-sm hidden sm:block">Revenue and transaction analytics</p>
              </div>
              <CommandCenterVisibilityToggle 
                elementKey="week_ahead_forecast" 
                elementName="Forecasting" 
              />
            </div>
          </div>
          
          {/* Controls - Scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[140px] shrink-0">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
              <SelectTrigger className="w-[130px] shrink-0">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="todayToEom">Today to EOM</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <SalesGoalsDialog />
            <Button
              variant="outline"
              size="icon"
              onClick={() => syncSales.mutate('sales')}
              disabled={syncSales.isPending}
              className="shrink-0"
            >
              {syncSales.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportCSV} className="shrink-0">
              <Download className="w-4 h-4" />
            </Button>
            <GoogleSheetsExport 
              data={{
                stylistData,
                locationData,
                dailyData: chartData,
                metrics,
              }}
              dateFrom={dateFilters.dateFrom}
              dateTo={dateFilters.dateTo}
            />
            <SalesReportPDF
              dateFrom={dateFilters.dateFrom}
              dateTo={dateFilters.dateTo}
              metrics={metrics}
              stylistData={stylistData}
              locationData={locationData}
            />
          </div>

          {/* Sync indicator */}
          <LastSyncIndicator syncType="sales" showAutoRefresh />
        </div>

        {/* Goal Progress */}
        {(() => {
          const selectedLoc = locationFilter !== 'all'
            ? locations?.find(l => l.id === locationFilter)
            : null;

          // Merged hours for "All Locations": a day is closed only if ALL locations are closed
          const mergedHoursJson = locationFilter === 'all' && locations?.length
            ? (() => {
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                const merged: any = {};
                for (const day of days) {
                  const allClosed = locations.every(loc => {
                    const hj = loc.hours_json as Record<string, any> | null;
                    return hj?.[day]?.closed === true;
                  });
                  merged[day] = allClosed ? { closed: true } : { closed: false };
                }
                return merged as HoursJson;
              })()
            : undefined;

          const mergedHolidays = locationFilter === 'all' && locations?.length
            ? (() => {
                const allSets = locations.map(loc =>
                  new Set((loc.holiday_closures as Array<{ date: string }> || []).map(h => h.date))
                );
                if (allSets.length === 0) return undefined;
                const intersection = [...allSets[0]].filter(d => allSets.every(s => s.has(d)));
                return intersection.map(date => ({ date, name: '' })) as HolidayClosure[];
              })()
            : undefined;

          return (
            <SalesGoalProgress 
              current={metrics?.totalRevenue || 0} 
              target={currentGoal}
              label={
                locationFilter !== 'all' 
                  ? `${selectedLoc?.name} Goal`
                  : dateRange === 'thisMonth' || dateRange === '30d' || dateRange === 'lastMonth'
                    ? 'Monthly Goal'
                    : 'Weekly Goal'
              }
              goalPeriod={dateRange === 'thisWeek' || dateRange === '7d' ? 'weekly' : 'monthly'}
              hoursJson={selectedLoc?.hours_json ?? mergedHoursJson}
              holidayClosures={selectedLoc?.holiday_closures ?? mergedHolidays}
            />
          );
        })()}

        {/* KPI Cards - Swipeable on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="col-span-1">
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-display truncate">
                    {metricsLoading ? '...' : formatCurrencyWhole(metrics?.totalRevenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-chart-2/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-chart-2" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-display">
                    {metricsLoading ? '...' : formatCurrencyWhole(Math.round(metrics?.averageTicket || 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Ticket</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-chart-3/10 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4 md:w-5 md:h-5 text-chart-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-display">
                    {metricsLoading ? '...' : formatNumber(metrics?.totalServices || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Services</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-chart-4/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-chart-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-display">
                    {metricsLoading ? '...' : formatNumber(metrics?.totalProducts || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historical Comparison */}
        <HistoricalComparison 
          currentDateFrom={dateFilters.dateFrom}
          currentDateTo={dateFilters.dateTo}
          locationId={locationFilter !== 'all' ? locationFilter : undefined}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <ResponsiveTabsList onTabChange={setActiveTab}>
            <TabsTrigger value="overview" className="flex-1 md:flex-none">Overview</TabsTrigger>
            <TabsTrigger value="stylists" className="flex-1 md:flex-none">By Stylist</TabsTrigger>
            {(locations?.filter(l => l.is_active).length ?? 0) >= 2 && (
              <TabsTrigger value="locations" className="flex-1 md:flex-none">By Location</TabsTrigger>
            )}
            <TabsTrigger value="phorest-staff" className="flex-1 md:flex-none">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Phorest Staff
              {(phorestStaffData?.unmappedCount || 0) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {phorestStaffData?.unmappedCount}
                </Badge>
              )}
            </TabsTrigger>
            {(locations?.filter(l => l.is_active).length ?? 0) >= 2 && (
              <TabsTrigger value="compare" className="flex-1 md:flex-none">
                <GitCompare className="w-4 h-4 mr-1 hidden sm:inline" />
                Compare
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="flex-1 md:flex-none">
              <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
              Analytics
            </TabsTrigger>
          </ResponsiveTabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Revenue Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-display">Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    {trendLoading ? (
                      <DashboardLoader size="md" className="h-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="dateLabel" 
                            tick={{ fontSize: 12 }} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => formatCurrencyWhole(v)}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary) / 0.2)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Revenue Breakdown</CardTitle>
                  <CardDescription>Services vs Products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] md:h-[250px]">
                    {metricsLoading ? (
                      <DashboardLoader size="md" className="h-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={0}
                            stroke="hsl(var(--border) / 0.4)"
                            strokeWidth={1}
                            dataKey="value"
                          >
                            {revenueBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [formatCurrencyWhole(value), '']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Services</span>
                      <span className="font-medium">{formatCurrencyWhole(metrics?.serviceRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Products</span>
                      <span className="font-medium">{formatCurrencyWhole(metrics?.productRevenue || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* By Stylist Tab - With clickable rows */}
          <TabsContent value="stylists" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg">Sales by Stylist</h2>
                <p className="text-sm text-muted-foreground">Click to view detailed stats</p>
              </div>
              <Badge variant="outline">
                {stylistData?.length || 0} stylists
              </Badge>
            </div>
            
            {stylistLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3" />
                          <div className="h-2 bg-muted rounded w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(stylistData || []).map((stylist, idx) => (
                  <StylistSalesRow 
                    key={stylist.user_id}
                    stylist={stylist}
                    rank={idx + 1}
                    totalRevenue={totalStylistRevenue}
                  />
                ))}
                {(!stylistData || stylistData.length === 0) && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No stylist data available for this period
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* By Location Tab - only show when 2+ locations */}
          {(locations?.filter(l => l.is_active).length ?? 0) >= 2 && (
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Sales by Location</CardTitle>
                <CardDescription>Performance by branch</CardDescription>
              </CardHeader>
              <CardContent>
                {locationLoading ? (
                  <DashboardLoader size="md" className="h-[300px]" />
                ) : (
                  <>
                    <div className="h-[250px] md:h-[300px] mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={locationData || []}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(v) => formatCurrencyWhole(v)} />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              formatCurrencyWhole(value), 
                              name === 'serviceRevenue' ? 'Services' : name === 'productRevenue' ? 'Products' : 'Total'
                            ]}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="serviceRevenue" name="Services" fill="hsl(var(--primary))" stackId="a" />
                          <Bar dataKey="productRevenue" name="Products" fill="hsl(var(--chart-2))" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {(locationData || []).map((loc, i) => (
                        <Card key={loc.location_id || i} className="bg-muted/50">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-display text-sm">{loc.name}</h3>
                              <Badge variant="outline">{formatCurrencyWhole(loc.totalRevenue)}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div>
                                <p className="text-muted-foreground">Services</p>
                                <p className="font-medium">{loc.totalServices}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Products</p>
                                <p className="font-medium">{loc.totalProducts}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Trans.</p>
                                <p className="font-medium">{loc.totalTransactions}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Phorest Staff Tab */}
          <TabsContent value="phorest-staff" className="space-y-4">
            {/* Staff Matching Suggestions */}
            {matchingSuggestions.length > 0 && (
              <StaffMatchingSuggestions 
                suggestions={matchingSuggestions}
                onLink={handleSuggestionLink}
                isLinking={createMapping.isPending}
                linkingId={linkingStaffId || undefined}
                unmappedCount={phorestStaffData?.unmappedCount}
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg">All Phorest Staff</h2>
                <p className="text-sm text-muted-foreground">
                  {phorestStaffData?.mappedCount || 0} linked, {phorestStaffData?.unmappedCount || 0} unlinked
                </p>
              </div>
              <Select value={phorestStaffFilter} onValueChange={(v: 'all' | 'mapped' | 'unmapped') => setPhorestStaffFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="mapped">Linked Only</SelectItem>
                  <SelectItem value="unmapped">Unlinked Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {phorestStaffLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3" />
                          <div className="h-2 bg-muted rounded w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPhorestStaff.map((staff, idx) => (
                  <PhorestStaffRow 
                    key={staff.phorestStaffId}
                    staff={staff}
                    rank={idx + 1}
                    totalRevenue={totalPhorestStaffRevenue}
                    onLinkClick={handleStaffLink}
                  />
                ))}
                {filteredPhorestStaff.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      {phorestStaffFilter === 'unmapped' 
                        ? 'All staff are linked! 🎉'
                        : phorestStaffFilter === 'mapped'
                          ? 'No linked staff yet. Link staff to see their data here.'
                          : 'No Phorest staff data available for this period. Try syncing sales data.'}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* CTA to go to settings */}
            {(phorestStaffData?.unmappedCount || 0) > 0 && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Link remaining staff</p>
                    <p className="text-sm text-muted-foreground">
                      Go to Phorest Settings to map remaining team members
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => window.location.href = '/dashboard/admin/phorest-settings'}
                  >
                    <Link2 className="w-4 h-4" />
                    Phorest Settings
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Compare Tab - only show when 2+ locations */}
          {(locations?.filter(l => l.is_active).length ?? 0) >= 2 && (
            <TabsContent value="compare" className="space-y-6">
              <LocationComparison 
                locations={locationData || []} 
                isLoading={locationLoading}
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
              />
            </TabsContent>
          )}

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <ProductCategoryChart 
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter !== 'all' ? locationFilter : undefined}
              />
              <ClientFunnelCard 
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter !== 'all' ? locationFilter : undefined}
              />
            </div>
            
            <ServicePopularityChart 
              dateFrom={dateFilters.dateFrom}
              dateTo={dateFilters.dateTo}
              locationId={locationFilter !== 'all' ? locationFilter : undefined}
            />
            
            <div className="grid lg:grid-cols-2 gap-6">
              <PeakHoursHeatmap 
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter !== 'all' ? locationFilter : undefined}
              />
              <CommissionCalculator 
                serviceRevenue={metrics?.serviceRevenue || 0}
                productRevenue={metrics?.productRevenue || 0}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
