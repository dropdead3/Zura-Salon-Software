import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Tabs, TabsContent, SubTabsList, SubTabsTrigger } from '@/components/ui/tabs';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  Scissors,
  Loader2,
  Download,
  CreditCard,
  Receipt,
  CalendarClock,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useSalesMetrics, useSalesTrend, useSalesByStylist, useSalesByLocation } from '@/hooks/useSalesData';

// Commission resolution is now handled internally by CommissionSummaryCard and StaffCommissionTable
import { useSalesGoals } from '@/hooks/useSalesGoals';
import { useLocations } from '@/hooks/useLocations';
import { useTomorrowRevenue } from '@/hooks/useTomorrowRevenue';
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatCurrency';
import { CommandCenterVisibilityToggle } from '@/components/dashboard/CommandCenterVisibilityToggle';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge } from '@/components/dashboard/AnalyticsFilterBadge';
import { EmptyState } from '@/components/ui/empty-state';
// tokens already imported above
import { AggregateSalesCard } from '@/components/dashboard/AggregateSalesCard';

// Sub-components
import { SalesGoalsDialog } from '@/components/dashboard/sales/SalesGoalsDialog';
import { SalesGoalProgress } from '@/components/dashboard/sales/SalesGoalProgress';
import { LocationComparison } from '@/components/dashboard/sales/LocationComparison';
import { HistoricalComparison } from '@/components/dashboard/sales/HistoricalComparison';
import { StylistSalesRow } from '@/components/dashboard/sales/StylistSalesRow';
import { LastSyncIndicator } from '@/components/dashboard/sales/LastSyncIndicator';
import { ProductCategoryChart } from '@/components/dashboard/sales/ProductCategoryChart';

import { ClientFunnelCard } from '@/components/dashboard/sales/ClientFunnelCard';
import { ClientEngagementCard } from '@/components/dashboard/sales/ClientEngagementCard';
import { ClientExperienceCard } from '@/components/dashboard/sales/ClientExperienceCard';
import { StaffKPISummary } from '@/components/dashboard/sales/StaffKPISummary';
import { PeakHoursHeatmap } from '@/components/dashboard/sales/PeakHoursHeatmap';
import { CommissionSummaryCard } from '@/components/dashboard/sales/CommissionSummaryCard';
import { StaffCommissionTable } from '@/components/dashboard/sales/StaffCommissionTable';
import { SalesReportPDF } from '@/components/dashboard/sales/SalesReportPDF';

import { GoalTrackerCard } from '@/components/dashboard/sales/GoalTrackerCard';
import { GoalsTabContent } from '@/components/dashboard/goals/GoalsTabContent';
import { RevenueForecast } from '@/components/dashboard/sales/RevenueForecast';
import { ForecastingCard } from '@/components/dashboard/sales/ForecastingCard';
import { GrowthForecastCard } from '@/components/dashboard/sales/GrowthForecastCard';
import { YearOverYearComparison } from '@/components/dashboard/sales/YearOverYearComparison';
import { GoogleSheetsExport } from '@/components/dashboard/sales/GoogleSheetsExport';
import { CompareTabContent } from '@/components/dashboard/sales/compare/CompareTabContent';
import { CorrelationsContent } from '@/components/dashboard/analytics/CorrelationsContent';
import { RetailAnalyticsContent } from '@/components/dashboard/analytics/RetailAnalyticsContent';
import { ServicesContent } from '@/components/dashboard/analytics/ServicesContent';
import { PricingAnalyticsContent } from '@/components/dashboard/analytics/PricingAnalyticsContent';
import { SubtabFavoriteStar } from '@/components/dashboard/analytics/SubtabFavoriteStar';
import { TaxSummaryCard } from '@/components/dashboard/sales/TaxSummaryCard';
import type { AnalyticsFilters } from '@/pages/dashboard/admin/AnalyticsHub';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


interface SalesTabContentProps {
  filters: AnalyticsFilters;
  subTab?: string;
  onSubTabChange: (value: string) => void;
}

export function SalesTabContent({
  filters, subTab = 'overview', onSubTabChange }: SalesTabContentProps) {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { formatDate } = useFormatDate();
  const engagementRef = useRef<HTMLDivElement>(null);
  const [engagementView, setEngagementView] = useState<'visits' | 'retention' | 'rebooking'>('visits');
  const { data: locations } = useLocations();
  const { goals } = useSalesGoals();
  const { data: tomorrowData } = useTomorrowRevenue();
  // Commission resolution handled internally by commission components

  const locationFilter = filters.locationId !== 'all' ? filters.locationId : undefined;

  // Create filterContext for child components
  const filterContext = {
    locationId: filters.locationId,
    dateRange: filters.dateRange,
  };

  // Resolve location name for AI context
  const selectedLocationName = locationFilter
    ? locations?.find(l => l.id === locationFilter)?.name || 'Unknown'
    : 'All Locations';

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    locationId: locationFilter,
  });
  
  const { data: trendData, isLoading: trendLoading } = useSalesTrend(
    filters.dateFrom, 
    filters.dateTo,
    locationFilter
  );
  
  const { data: stylistData, isLoading: stylistLoading } = useSalesByStylist(filters.dateFrom, filters.dateTo, locationFilter);
  const { data: locationData, isLoading: locationLoading } = useSalesByLocation(filters.dateFrom, filters.dateTo);

  // Calculate goal based on date range
  const currentGoal = useMemo(() => {
    const isMonthly = filters.dateRange === 'thisMonth' || filters.dateRange === '30d' || filters.dateRange === 'lastMonth';
    if (filters.locationId !== 'all' && goals?.locationTargets?.[filters.locationId]) {
      return isMonthly 
        ? goals.locationTargets[filters.locationId].monthly 
        : goals.locationTargets[filters.locationId].weekly;
    }
    return isMonthly ? (goals?.monthlyTarget || 50000) : (goals?.weeklyTarget || 12500);
  }, [filters.dateRange, filters.locationId, goals]);

  // Detect single-day ranges for prompt display
  const isSingleDayRange = filters.dateRange === 'today' || filters.dateRange === 'yesterday';

  // Format trend data for chart
  const chartData = useMemo(() => {
    const data = trendData?.overall || trendData || [];
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      ...d,
      dateLabel: formatDate(new Date(d.date), 'MMM d'),
    }));
  }, [trendData]);


  const totalStylistRevenue = useMemo(() => {
    return (stylistData || []).reduce((sum, s) => sum + s.totalRevenue, 0) || 1;
  }, [stylistData]);

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
    a.download = `sales-report-${filters.dateFrom}-to-${filters.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LastSyncIndicator syncType="sales" showAutoRefresh />
        </div>
        <div className="flex items-center gap-2">
          <SalesGoalsDialog />
          <Button variant="outline" size="icon" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
          </Button>
          <GoogleSheetsExport 
            data={{
              stylistData,
              locationData,
              dailyData: chartData,
              metrics,
            }}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
          />
          <SalesReportPDF
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            metrics={metrics}
            stylistData={stylistData}
            locationData={locationData}
          />
        </div>
      </div>

      {/* Sub-tabs for detailed views */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
          View
        </span>
        <Tabs value={subTab} onValueChange={onSubTabChange}>
          <SubTabsList>
            <VisibilityGate elementKey="sales_overview_subtab" elementName="Overview" elementCategory="Page Tabs">
              <SubTabsTrigger value="overview">Overview</SubTabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_goals_subtab" elementName="Goals" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="goals">Goals</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="goals" label="Goals" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_compare_subtab" elementName="Compare" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="compare">Compare</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="compare" label="Compare" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_staff_subtab" elementName="Staff Performance" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="staff">Staff Performance</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="staff" label="Staff Performance" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_forecasting_subtab" elementName="Forecasting" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="forecasting">Forecasting</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="forecasting" label="Forecasting" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_commission_subtab" elementName="Commission" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="commission">Commission</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="commission" label="Commission" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_services_subtab" elementName="Services" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="services">Services</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="services" label="Services" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_retail_subtab" elementName="Retail" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="retail">Retail</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="retail" label="Retail" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_correlations_subtab" elementName="Correlations" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="correlations">Correlations</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="correlations" label="Correlations" />
              </div>
            </VisibilityGate>
            <VisibilityGate elementKey="sales_pricing_subtab" elementName="Pricing" elementCategory="Page Tabs">
              <div className="group/subtab relative inline-flex items-center">
                <SubTabsTrigger value="pricing">Pricing</SubTabsTrigger>
                <SubtabFavoriteStar tab="sales" subtab="pricing" label="Pricing" />
              </div>
            </VisibilityGate>
          </SubTabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Sales Overview Card */}
          <PinnableCard 
            elementKey="sales_overview" 
            elementName="Sales Overview" 
            category="Analytics Hub - Sales"
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          >
            <AggregateSalesCard 
              externalDateRange={filters.dateRange as any}
              externalDateFilters={{
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
              }}
              hideInternalFilter={true}
              filterContext={{
                locationId: filters.locationId,
                dateRange: filters.dateRange,
              }}
            />
          </PinnableCard>

          {/* Revenue Trend */}
          <PinnableCard elementKey="revenue_trend_chart" elementName="Revenue Trend" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="font-display text-base tracking-wide">REVENUE TREND</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] relative">
                  {trendLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
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
                            tickFormatter={(value) => formatCurrencyUtil(value / 1000, undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + 'k'}
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrencyUtil(value), 'Revenue']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
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
                      
                      {/* Single day prompt */}
                      {isSingleDayRange && chartData.length <= 1 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-card/95 backdrop-blur-sm border rounded-lg px-4 py-3 text-center max-w-xs shadow-sm">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Single data point</span>
                              <br />
                              Adjust the date range filter above to see revenue trends over time
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </PinnableCard>

          {/* Location Comparison - only show when 2+ locations */}
          {(locationData?.length ?? 0) >= 2 && (
            <PinnableCard elementKey="location_comparison" elementName="Location Comparison" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <LocationComparison 
                locations={locationData || []} 
                isLoading={locationLoading}
                filterContext={filterContext}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
              />
            </PinnableCard>
          )}

          {/* Product and Service Charts */}
          <PinnableCard elementKey="product_category_chart" elementName="Product Categories" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ProductCategoryChart dateFrom={filters.dateFrom} dateTo={filters.dateTo} filterContext={filterContext} />
          </PinnableCard>
          {/* Tax Summary */}
          <PinnableCard elementKey="tax_summary" elementName="Tax Collected" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <TaxSummaryCard
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={locationFilter}
              dateRange={filters.dateRange as any}
            />
          </PinnableCard>

          {/* Compact Top Services summary — full analysis in Services tab */}
          <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onSubTabChange('services')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted flex items-center justify-center rounded-lg">
                  <Scissors className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Service Analytics</p>
                  <p className="text-xs text-muted-foreground">Popularity, efficiency, pricing & demand trends</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="mt-6 space-y-6">
          <GoalsTabContent />
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <PinnableCard elementKey="comparison_builder" elementName="Comparison Builder" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <CompareTabContent 
              filters={filters}
              filterContext={filterContext}
            />
          </PinnableCard>
        </TabsContent>

        <TabsContent value="staff" className="mt-6 space-y-6">
          {/* Staff KPI Summary Row */}
          <StaffKPISummary
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={locationFilter}
            onTileClick={(view) => {
              setEngagementView(view);
              engagementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />

          {/* Stylist Leaderboard */}
          <PinnableCard elementKey="staff_leaderboard" elementName="Staff Performance" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <Card className={tokens.card.wrapper}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={tokens.card.iconBox}>
                      <CreditCard className={tokens.card.icon} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className={tokens.card.title}>STAFF PERFORMANCE</CardTitle>
                        <MetricInfoTooltip description="Ranks team members by total revenue from completed appointments. Staff below the configurable performance threshold are flagged for attention." />
                      </div>
                      <CardDescription>Revenue by team member</CardDescription>
                    </div>
                  </div>
                  <AnalyticsFilterBadge locationId={filters.locationId} dateRange={filters.dateRange} />
                </div>
              </CardHeader>
              <CardContent>
                {stylistLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !stylistData || stylistData.length === 0 ? (
                  <EmptyState icon={CreditCard} title="No staff data" description="No revenue data found for the selected period." />
                ) : (
                  <div className="space-y-3">
                    {stylistData.slice(0, 10).map((stylist, index) => (
                      <StylistSalesRow
                        key={stylist.staffId}
                        stylist={stylist}
                        rank={index + 1}
                        totalRevenue={totalStylistRevenue}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </PinnableCard>

          {/* Client Engagement Card (Visits / Retention / Rebooking) */}
          <div ref={engagementRef}>
            <PinnableCard elementKey="client_engagement_staff" elementName="Client Engagement" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <ClientEngagementCard
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                locationId={locationFilter}
                filterContext={filterContext}
                activeView={engagementView}
                onViewChange={setEngagementView}
              />
            </PinnableCard>
          </div>

          {/* Client Experience Card */}
          <PinnableCard elementKey="client_experience_staff" elementName="Client Experience" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ClientExperienceCard
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={locationFilter}
              filterContext={filterContext}
            />
          </PinnableCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <PinnableCard elementKey="peak_hours_heatmap" elementName="Peak Hours Heatmap" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <PeakHoursHeatmap dateFrom={filters.dateFrom} dateTo={filters.dateTo} filterContext={filterContext} />
            </PinnableCard>
            <PinnableCard elementKey="client_funnel" elementName="Client Funnel" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <ClientFunnelCard dateFrom={filters.dateFrom} dateTo={filters.dateTo} filterContext={filterContext} />
            </PinnableCard>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6 space-y-6">
          <EnforcementGateBanner gateKey="gate_baselines">
          <PinnableCard elementKey="week_ahead_forecast" elementName="Forecasting" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ForecastingCard />
          </PinnableCard>

          {/* Growth Forecasting - Long-range trend-based projections */}
          <PinnableCard elementKey="growth_forecast" elementName="Growth Forecast" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <GrowthForecastCard />
          </PinnableCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <PinnableCard elementKey="revenue_forecast" elementName="Revenue Forecast" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <RevenueForecast 
                dailyData={chartData.map(d => ({ date: d.dateLabel, revenue: d.totalRevenue || 0 }))} 
                monthlyTarget={goals?.monthlyTarget || 50000} 
                isLoading={trendLoading}
                filterContext={filterContext}
              />
            </PinnableCard>
            <PinnableCard elementKey="historical_comparison" elementName="Historical Comparison" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <HistoricalComparison 
                currentDateFrom={filters.dateFrom} 
                currentDateTo={filters.dateTo} 
                locationId={locationFilter}
                filterContext={filterContext}
              />
            </PinnableCard>
          </div>
          </EnforcementGateBanner>
        </TabsContent>

        <TabsContent value="commission" className="mt-6 space-y-6">
          {/* Instructional banner */}
          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">How commission works</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Commission tiers define the percentage each stylist earns based on their individual revenue. 
                Higher revenue unlocks better rates. The breakdown below shows each stylist's estimated 
                commission for the selected date range.
              </p>
            </div>
            <Button
              variant="outline"
              size={tokens.button.inline}
              className="shrink-0 text-xs gap-1.5"
              onClick={() => navigate(dashPath('/admin/payroll?tab=commissions'))}
            >
              Manage Tiers
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Payroll Summary */}
          <PinnableCard elementKey="commission_summary" elementName="Commission Summary" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <CommissionSummaryCard
              stylistData={stylistData}
              isLoading={stylistLoading}
            />
          </PinnableCard>

          {/* Per-Stylist Breakdown */}
          <PinnableCard elementKey="staff_commission_breakdown" elementName="Staff Commission Breakdown" category="Analytics Hub - Sales" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <StaffCommissionTable
              stylistData={stylistData}
              isLoading={stylistLoading}
            />
          </PinnableCard>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <ServicesContent
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={locationFilter}
            filterContext={filterContext}
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          />
        </TabsContent>

        <TabsContent value="retail" className="mt-6">
          <RetailAnalyticsContent
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={locationFilter}
            filterContext={filterContext}
          />
        </TabsContent>

        <TabsContent value="correlations" className="mt-6">
          <CorrelationsContent 
            locationId={locationFilter}
            filterContext={filterContext}
          />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PricingAnalyticsContent
            locationId={locationFilter}
            filterContext={filterContext}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationName={selectedLocationName}
          />
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
