import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Tabs, TabsContent, SubTabsList, SubTabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VisibilityGate, useElementVisibility } from '@/components/visibility/VisibilityGate';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  BarChart3,
  UserCheck,
  Building2,
  CalendarDays,
  Wand2,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Wallet,
  ClipboardList,
  Beaker,
  Receipt,
  PieChart,
  AlertTriangle,
  Coins,
  Percent,
  Building,
  Grid3X3,
  Tag,
  Cake,
} from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { getReportTier, filterReportsByTier } from '@/config/reportCatalog';
import { ReportCard } from '@/components/dashboard/reports/ReportCard';
import { RecentReports } from '@/components/dashboard/reports/RecentReports';
import { SalesReportGenerator } from '@/components/dashboard/reports/SalesReportGenerator';
import { StaffKPIReport } from '@/components/dashboard/reports/StaffKPIReport';
import { ClientRetentionReport } from '@/components/dashboard/reports/ClientRetentionReport';
import { NoShowReport } from '@/components/dashboard/reports/NoShowReport';
import { CapacityReport } from '@/components/dashboard/reports/CapacityReport';
import { FinancialReportGenerator } from '@/components/dashboard/reports/FinancialReportGenerator';
import { ExecutiveSummaryReport } from '@/components/dashboard/reports/ExecutiveSummaryReport';
import { IndividualStaffReport } from '@/components/dashboard/reports/IndividualStaffReport';
import { PayrollSummaryReport } from '@/components/dashboard/reports/PayrollSummaryReport';
import { RetailProductReport } from '@/components/dashboard/reports/RetailProductReport';
import { RetailStaffReport } from '@/components/dashboard/reports/RetailStaffReport';
import { EndOfMonthReport } from '@/components/dashboard/reports/EndOfMonthReport';
import { ReportBuilderPage } from '@/components/dashboard/reports/builder/ReportBuilderPage';
import { ScheduledReportsSubTab } from '@/components/dashboard/reports/scheduled/ScheduledReportsSubTab';
import { ServiceProfitabilityReport } from '@/components/dashboard/reports/ServiceProfitabilityReport';
import { ChemicalCostReport } from '@/components/dashboard/reports/ChemicalCostReport';
import { TipAnalysisReport } from '@/components/dashboard/reports/TipAnalysisReport';
import { ServiceCategoryMixReport } from '@/components/dashboard/reports/ServiceCategoryMixReport';
import { TaxSummaryReport } from '@/components/dashboard/reports/TaxSummaryReport';
import { ClientAttritionReport } from '@/components/dashboard/reports/ClientAttritionReport';
import { StaffCompensationRatioReport } from '@/components/dashboard/reports/StaffCompensationRatioReport';
import { LocationBenchmarkReport } from '@/components/dashboard/reports/LocationBenchmarkReport';
import { DemandHeatmapReport } from '@/components/dashboard/reports/DemandHeatmapReport';
import { DiscountsReport } from '@/components/dashboard/reports/DiscountsReport';
import { FutureAppointmentsReport } from '@/components/dashboard/reports/FutureAppointmentsReport';
import { TopClientsReport } from '@/components/dashboard/reports/TopClientsReport';
import { ClientBirthdaysReport } from '@/components/dashboard/reports/ClientBirthdaysReport';
import { ClientSourceReport } from '@/components/dashboard/reports/ClientSourceReport';
import { DuplicateClientsReport } from '@/components/dashboard/reports/DuplicateClientsReport';
import { StaffTransactionDetailReport } from '@/components/dashboard/reports/StaffTransactionDetailReport';
import { DeletedAppointmentsReport } from '@/components/dashboard/reports/DeletedAppointmentsReport';
import { NoShowEnhancedReport } from '@/components/dashboard/reports/NoShowEnhancedReport';
import type { AnalyticsFilters } from '@/pages/dashboard/admin/AnalyticsHub';

const reportCategories = [
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'clients', label: 'Clients', icon: UserCheck },
  { id: 'operations', label: 'Operations', icon: Clock },
  { id: 'financial', label: 'Financial', icon: TrendingUp },
  { id: 'custom', label: 'Custom Builder', icon: Wand2 },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar },
];

const salesReports = [
  { id: 'daily-sales', name: 'Daily Sales Summary', description: 'Revenue by day with service/product split', icon: BarChart3 },
  { id: 'stylist-sales', name: 'Sales by Stylist', description: 'Individual performance rankings', icon: Users },
  { id: 'location-sales', name: 'Sales by Location', description: 'Multi-location comparison', icon: Building2 },
  { id: 'product-sales', name: 'Product Sales Report', description: 'Top products and attachment rates', icon: DollarSign },
  { id: 'retail-products', name: 'Retail Product Report', description: 'Full product performance with red flags and categories', icon: ShoppingBag },
  { id: 'retail-staff', name: 'Retail Sales by Staff', description: 'Per-stylist retail revenue, units, and attachment rates', icon: Users },
  { id: 'category-mix', name: 'Service Category Mix', description: 'Revenue share by service category (Color, Cut, Extensions, etc.)', icon: PieChart },
  { id: 'tax-summary', name: 'Tax Summary', description: 'Tax collected by period and location for remittance', icon: Receipt },
  { id: 'discounts', name: 'Discounts & Promotions', description: 'Discount amounts by staff, promotion usage, and discount-to-revenue ratio', icon: Tag },
];

const staffReports = [
  { id: 'individual-staff', name: 'Staff 1:1 Prep', description: 'Comprehensive individual report for meetings', icon: Users },
  { id: 'staff-kpi', name: 'Staff KPI Report', description: 'Comprehensive staff performance metrics', icon: BarChart3 },
  { id: 'productivity', name: 'Productivity Report', description: 'Hours worked vs revenue generated', icon: Clock },
  { id: 'rebooking', name: 'Rebooking Analysis', description: 'Staff rebooking rates and trends', icon: UserCheck },
  { id: 'new-clients', name: 'New Client Acquisition', description: "Who's bringing in new clients", icon: UserCheck },
  { id: 'tip-analysis', name: 'Tip Analysis', description: 'Tip distribution, avg tip per visit, tip-to-revenue ratio by stylist', icon: Coins },
  { id: 'staff-transaction-detail', name: 'Staff Transaction Detail', description: 'Line-item detail per stylist per day', icon: FileText },
  { id: 'compensation-ratio', name: 'Compensation Ratio', description: 'Labor cost as % of revenue per stylist with commission source', icon: Percent },
];

const clientReports = [
  { id: 'retention', name: 'Client Retention Report', description: 'Return rates and at-risk clients', icon: UserCheck },
  { id: 'lifetime-value', name: 'Client Lifetime Value', description: 'Top spenders and average LTV', icon: DollarSign },
  { id: 'new-vs-returning', name: 'New vs Returning', description: 'Acquisition funnel analysis', icon: TrendingUp },
  { id: 'visit-frequency', name: 'Visit Frequency', description: 'Visit patterns by segment', icon: CalendarDays },
  { id: 'client-attrition', name: 'Client Attrition', description: 'At-risk, lapsed, and lost clients with revenue impact', icon: AlertTriangle },
  { id: 'top-clients', name: 'Top Clients', description: 'Ranked by spend with visit frequency, avg ticket, and top service', icon: DollarSign },
  { id: 'client-birthdays', name: 'Client Birthdays', description: 'Upcoming birthdays for marketing outreach', icon: CalendarDays },
  { id: 'client-source', name: 'Client Source', description: 'Where clients came from (referral, online, walk-in)', icon: UserCheck },
  { id: 'duplicate-clients', name: 'Duplicate Clients', description: 'Potential duplicate client records by email/phone match', icon: AlertTriangle },
];

const operationsReports = [
  { id: 'capacity', name: 'Capacity Utilization', description: 'Booking density and peak hours', icon: BarChart3 },
  { id: 'no-show', name: 'No-Show Report', description: 'No-show rates by staff, day, time', icon: Clock },
  { id: 'no-show-enhanced', name: 'No-Shows & Cancellations', description: 'Combined report with revenue impact and repeat offenders', icon: AlertTriangle },
  { id: 'deleted-appointments', name: 'Deleted Appointments', description: 'Audit trail of removed appointments with lost revenue', icon: Clock },
  { id: 'service-duration', name: 'Service Duration', description: 'Actual vs expected times', icon: Clock },
  { id: 'lead-time', name: 'Appointment Lead Time', description: 'How far ahead clients book', icon: CalendarDays },
  { id: 'demand-heatmap', name: 'Demand Heatmap', description: 'Appointment volume by hour and day-of-week', icon: Grid3X3 },
];

const financialReports = [
  { id: 'executive-summary', name: 'Executive Summary', description: 'One-page org overview with location breakdown', icon: Building2 },
  { id: 'revenue-trend', name: 'Revenue Trend', description: 'Daily/weekly/monthly trends', icon: TrendingUp, visibilityKey: 'report_revenue_trend' },
  { id: 'commission', name: 'Commission Report', description: 'Staff earnings calculations', icon: DollarSign, visibilityKey: 'report_commission' },
  { id: 'goals', name: 'Goal Progress', description: 'Team and individual goal tracking', icon: BarChart3 },
  { id: 'yoy', name: 'Year-over-Year', description: 'Historical performance comparison', icon: TrendingUp, visibilityKey: 'report_yoy' },
  { id: 'payroll-summary', name: 'Payroll Summary', description: 'Commission + rent for pay period processing', icon: Wallet },
  { id: 'end-of-month', name: 'End-of-Month Summary', description: 'Comprehensive monthly business report', icon: ClipboardList },
  { id: 'service-profitability', name: 'Service Profitability', description: 'Revenue vs chemical + labor cost per service', icon: TrendingUp },
  { id: 'chemical-cost', name: 'Chemical Cost Report', description: 'Chemical cost per service, waste %, and margin from Color Bar', icon: Beaker },
  { id: 'location-benchmark', name: 'Location Benchmarking', description: 'Side-by-side KPI comparison across all locations', icon: Building },
  { id: 'future-appointments', name: 'Future Appointments Value', description: 'Revenue pipeline from upcoming booked appointments', icon: CalendarDays },
];

interface ReportsTabContentProps {
  filters: AnalyticsFilters;
  /** When true, hides the back-to-analytics link logic since we're a standalone page */
  isStandalone?: boolean;
}

export function ReportsTabContent({ filters, isStandalone }: ReportsTabContentProps) {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('sales');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const deepLinkStaffId = useRef<string | null>(null);
  const deepLinkProcessed = useRef(false);

  // Deep-link support: ?report=individual-staff&staffId=abc
  useEffect(() => {
    if (deepLinkProcessed.current) return;
    const reportParam = searchParams.get('report');
    const staffIdParam = searchParams.get('staffId');
    if (reportParam) {
      setSelectedReport(reportParam);
      if (staffIdParam) {
        deepLinkStaffId.current = staffIdParam;
      }
      deepLinkProcessed.current = true;
      // Clean up URL params to avoid re-triggering
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('report');
      newParams.delete('staffId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const canRunReports = hasPermission('run_reports');
  const { data: locations } = useLocations();
  const locationCount = locations?.length ?? 1;
  const reportTier = getReportTier(locationCount);
  const filteredSalesReports = (locations?.filter(l => l.is_active).length ?? 0) >= 2
    ? salesReports
    : salesReports.filter(r => r.id !== 'location-sales');

  // Check if parent sales tab is visible (determines if sales/financial reports should show)
  const salesTabVisible = useElementVisibility('analytics_sales_tab');

  if (!canRunReports) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>
              You do not have permission to run or download reports. Contact your administrator for access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Reports can be previewed and downloaded as CSV or PDF. Access is granted to admins and managers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter categories based on parent visibility
  const visibleCategories = useMemo(() => {
    return reportCategories.filter(cat => {
      // Hide Sales and Financial categories if sales tab is hidden
      if ((cat.id === 'sales' || cat.id === 'financial') && !salesTabVisible) {
        return false;
      }
      return true;
    });
  }, [salesTabVisible]);

  // Auto-redirect if current category is hidden
  useEffect(() => {
    if ((activeCategory === 'sales' || activeCategory === 'financial') && !salesTabVisible) {
      const firstVisible = visibleCategories[0]?.id || 'staff';
      setActiveCategory(firstVisible);
    }
  }, [activeCategory, salesTabVisible, visibleCategories]);

  const handleReportSelect = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  const renderReportCards = (reports: typeof salesReports | typeof financialReports) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => {
        const visibilityKey = 'visibilityKey' in report ? report.visibilityKey : undefined;
        const card = (
          <ReportCard
            key={report.id}
            id={report.id}
            name={report.name}
            description={report.description}
            icon={report.icon}
            onSelect={handleReportSelect}
          />
        );
        
        if (visibilityKey) {
          return (
            <VisibilityGate
              key={report.id}
              elementKey={visibilityKey}
              elementName={report.name}
              elementCategory="Reports - Financial"
            >
              {card}
            </VisibilityGate>
          );
        }
        
        return card;
      })}
    </div>
  );

  // Reports that manage their own back button
  const selfContainedReports = ['individual-staff', 'payroll-summary', 'retail-products', 'retail-staff', 'end-of-month', 'service-profitability', 'chemical-cost', 'tip-analysis', 'category-mix', 'tax-summary', 'client-attrition', 'compensation-ratio', 'location-benchmark', 'demand-heatmap', 'discounts', 'future-appointments', 'top-clients', 'client-birthdays', 'client-source', 'duplicate-clients', 'staff-transaction-detail', 'deleted-appointments', 'no-show-enhanced'];

  const renderSelectedReport = () => {
    const location = filters.locationId === 'all' ? undefined : filters.locationId;

    switch (selectedReport) {
      case 'individual-staff':
        return (
          <IndividualStaffReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
            initialStaffId={deepLinkStaffId.current || undefined}
            dateRangeKey={filters.dateRange}
          />
        );
      case 'payroll-summary':
        return (
          <PayrollSummaryReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'retail-products':
        return (
          <RetailProductReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'retail-staff':
        return (
          <RetailStaffReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'end-of-month':
        return (
          <EndOfMonthReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'daily-sales':
      case 'stylist-sales':
      case 'location-sales':
      case 'product-sales':
        return (
          <SalesReportGenerator
            reportType={selectedReport}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'staff-kpi':
      case 'productivity':
      case 'rebooking':
      case 'new-clients':
        return (
          <StaffKPIReport
            reportType={selectedReport}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'retention':
      case 'lifetime-value':
      case 'new-vs-returning':
      case 'visit-frequency':
        return (
          <ClientRetentionReport
            reportType={selectedReport}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'no-show':
      case 'service-duration':
      case 'lead-time':
        return (
          <NoShowReport
            reportType={selectedReport}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'capacity':
        return (
          <CapacityReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'executive-summary':
        return (
          <ExecutiveSummaryReport
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'revenue-trend':
      case 'commission':
      case 'goals':
      case 'yoy':
        return (
          <FinancialReportGenerator
            reportType={selectedReport}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'service-profitability':
        return <ServiceProfitabilityReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'chemical-cost':
        return <ChemicalCostReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'tip-analysis':
        return <TipAnalysisReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'category-mix':
        return <ServiceCategoryMixReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'tax-summary':
        return <TaxSummaryReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'client-attrition':
        return <ClientAttritionReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'compensation-ratio':
        return <StaffCompensationRatioReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'location-benchmark':
        return <LocationBenchmarkReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} onClose={handleCloseReport} />;
      case 'demand-heatmap':
        return <DemandHeatmapReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'discounts':
        return <DiscountsReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'future-appointments':
        return <FutureAppointmentsReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'top-clients':
        return <TopClientsReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'client-birthdays':
        return <ClientBirthdaysReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'client-source':
        return <ClientSourceReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'duplicate-clients':
        return <DuplicateClientsReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'staff-transaction-detail':
        return <StaffTransactionDetailReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'deleted-appointments':
        return <DeletedAppointmentsReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      case 'no-show-enhanced':
        return <NoShowEnhancedReport dateFrom={filters.dateFrom} dateTo={filters.dateTo} locationId={location} onClose={handleCloseReport} />;
      default:
        return null;
    }
  };

  if (selectedReport) {
    // Self-contained reports have their own back button
    if (selfContainedReports.includes(selectedReport)) {
      return <div className="space-y-4">{renderSelectedReport()}</div>;
    }
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
          onClick={handleCloseReport}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Reports
        </Button>
        {renderSelectedReport()}
      </div>
    );
  }

  const quickActions = [
    { id: 'individual-staff', label: 'Staff 1:1 Prep', desc: 'Full performance report for individual staff meetings', icon: Users, accent: 'from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/5 dark:to-purple-500/5' },
    { id: 'payroll-summary', label: 'Payroll Summary', desc: 'Commission + rent summary for pay processing', icon: Wallet, accent: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5' },
    { id: 'end-of-month', label: 'End-of-Month', desc: 'Comprehensive monthly business snapshot', icon: ClipboardList, accent: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5' },
    { id: 'retail-products', label: 'Retail Report', desc: 'Product performance, red flags, and trends', icon: ShoppingBag, accent: 'from-rose-500/10 to-pink-500/10 dark:from-rose-500/5 dark:to-pink-500/5' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Hero */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base tracking-wide">Quick Actions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Jump into your most-used reports</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                onClick={() => handleReportSelect(qa.id)}
                className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${qa.accent} p-4 text-left transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.98]`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="rounded-lg bg-background/60 backdrop-blur-sm p-2 border">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-medium">{qa.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{qa.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Label + Sub-tabs */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wider">
          All Reports
        </span>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <SubTabsList>
            {visibleCategories.map((cat) => (
              <VisibilityGate 
                key={cat.id}
                elementKey={`reports_${cat.id}_subtab`} 
                elementName={`${cat.label} Reports`} 
                elementCategory="Page Tabs"
              >
                <SubTabsTrigger value={cat.id}>
                  <cat.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </SubTabsTrigger>
              </VisibilityGate>
            ))}
          </SubTabsList>

        {/* Only render Sales content if visible */}
        {salesTabVisible && (
          <TabsContent value="sales" className="mt-6">
            {renderReportCards(filterReportsByTier(filteredSalesReports, reportTier))}
          </TabsContent>
        )}

        <TabsContent value="staff" className="mt-6">
          {renderReportCards(staffReports)}
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          {renderReportCards(clientReports)}
        </TabsContent>

        <TabsContent value="operations" className="mt-6">
          {renderReportCards(operationsReports)}
        </TabsContent>

        {/* Only render Financial content if sales tab is visible */}
        {salesTabVisible && (
          <TabsContent value="financial" className="mt-6">
            {renderReportCards(financialReports)}
          </TabsContent>
        )}

        {/* Custom Report Builder */}
        <TabsContent value="custom" className="mt-6">
          <ReportBuilderPage />
        </TabsContent>

        {/* Scheduled Reports */}
        <TabsContent value="scheduled" className="mt-6">
          <ScheduledReportsSubTab />
        </TabsContent>
        </Tabs>
      </div>

      {/* Recent Reports */}
      <RecentReports />
    </div>
  );
}
