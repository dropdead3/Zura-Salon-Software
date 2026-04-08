import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  Download, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  BarChart3,
  UserCheck,
  RefreshCw,
  Building2,
  ArrowLeft,
  ArrowRight,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations } from '@/hooks/useLocations';
import { ReportCard } from '@/components/dashboard/reports/ReportCard';
import { RecentReports } from '@/components/dashboard/reports/RecentReports';
import { SalesReportGenerator } from '@/components/dashboard/reports/SalesReportGenerator';
import { StaffKPIReport } from '@/components/dashboard/reports/StaffKPIReport';
import { ClientRetentionReport } from '@/components/dashboard/reports/ClientRetentionReport';
import { NoShowReport } from '@/components/dashboard/reports/NoShowReport';
import { CapacityReport } from '@/components/dashboard/reports/CapacityReport';
import { RetailStaffReport } from '@/components/dashboard/reports/RetailStaffReport';

const reportCategories = [
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'clients', label: 'Clients', icon: UserCheck },
  { id: 'operations', label: 'Operations', icon: Clock },
  { id: 'financial', label: 'Financial', icon: TrendingUp },
];

const salesReports = [
  { id: 'daily-sales', name: 'Daily Sales Summary', description: 'Revenue by day with service/product split', icon: BarChart3 },
  { id: 'stylist-sales', name: 'Sales by Stylist', description: 'Individual performance rankings', icon: Users },
  { id: 'location-sales', name: 'Sales by Location', description: 'Multi-location comparison', icon: Building2 },
  { id: 'product-sales', name: 'Product Sales Report', description: 'Top products and attachment rates', icon: DollarSign },
  { id: 'retail-staff', name: 'Retail Sales by Staff', description: 'Per-stylist retail revenue, units, and attachment rates', icon: Users },
];

const staffReports = [
  { id: 'staff-kpi', name: 'Staff KPI Report', description: 'Comprehensive staff performance metrics', icon: BarChart3 },
  { id: 'productivity', name: 'Productivity Report', description: 'Hours worked vs revenue generated', icon: Clock },
  { id: 'rebooking', name: 'Rebooking Analysis', description: 'Staff rebooking rates and trends', icon: RefreshCw },
  { id: 'new-clients', name: 'New Client Acquisition', description: "Who's bringing in new clients", icon: UserCheck },
];

const clientReports = [
  { id: 'retention', name: 'Client Retention Report', description: 'Return rates and at-risk clients', icon: UserCheck },
  { id: 'lifetime-value', name: 'Client Lifetime Value', description: 'Top spenders and average LTV', icon: DollarSign },
  { id: 'new-vs-returning', name: 'New vs Returning', description: 'Acquisition funnel analysis', icon: TrendingUp },
  { id: 'visit-frequency', name: 'Visit Frequency', description: 'Visit patterns by segment', icon: CalendarDays },
];

const operationsReports = [
  { id: 'capacity', name: 'Capacity Utilization', description: 'Booking density and peak hours', icon: BarChart3 },
  { id: 'no-show', name: 'No-Show Report', description: 'No-show rates by staff, day, time', icon: Clock },
  { id: 'service-duration', name: 'Service Duration', description: 'Actual vs expected times', icon: Clock },
  { id: 'lead-time', name: 'Appointment Lead Time', description: 'How far ahead clients book', icon: CalendarDays },
];

const financialReports = [
  { id: 'revenue-trend', name: 'Revenue Trend', description: 'Daily/weekly/monthly trends', icon: TrendingUp },
  { id: 'commission', name: 'Commission Report', description: 'Staff earnings calculations', icon: DollarSign },
  { id: 'goals', name: 'Goal Progress', description: 'Team and individual goal tracking', icon: BarChart3 },
  { id: 'yoy', name: 'Year-over-Year', description: 'Historical performance comparison', icon: TrendingUp },
];

export default function ReportsHub() {
  const [activeTab, setActiveTab] = useState('sales');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [locationId, setLocationId] = useState<string>('all');
  
  const { data: locations } = useLocations();
  const filteredSalesReports = (locations?.filter(l => l.is_active).length ?? 0) >= 2
    ? salesReports
    : salesReports.filter(r => r.id !== 'location-sales');

  const handleReportSelect = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const handleCloseReport = () => {
    setSelectedReport(null);
  };

  const renderReportCards = (reports: typeof salesReports) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          id={report.id}
          name={report.name}
          description={report.description}
          icon={report.icon}
          onSelect={handleReportSelect}
        />
      ))}
    </div>
  );

  const renderSelectedReport = () => {
    const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
    const dateTo = format(dateRange.to, 'yyyy-MM-dd');
    const location = locationId === 'all' ? undefined : locationId;

    switch (selectedReport) {
      case 'daily-sales':
      case 'stylist-sales':
      case 'location-sales':
      case 'product-sales':
        return (
          <SalesReportGenerator
            reportType={selectedReport}
            dateFrom={dateFrom}
            dateTo={dateTo}
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
            dateFrom={dateFrom}
            dateTo={dateTo}
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
            dateFrom={dateFrom}
            dateTo={dateTo}
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
            dateFrom={dateFrom}
            dateTo={dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'capacity':
        return (
          <CapacityReport
            dateFrom={dateFrom}
            dateTo={dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      case 'retail-staff':
        return (
          <RetailStaffReport
            dateFrom={dateFrom}
            dateTo={dateTo}
            locationId={location}
            onClose={handleCloseReport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <DashboardPageHeader
          title="Report Generator"
          description="Generate, schedule, and export business reports"
          backTo="/dashboard/admin/analytics"
          backLabel="Back to Analytics Hub"
          actions={
            <div className="flex items-center gap-3">
              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size={tokens.button.card} className="min-w-[200px] justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 space-y-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size={tokens.button.inline} onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                      <Button variant="outline" size={tokens.button.inline} onClick={() => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}>Last Month</Button>
                    </div>
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => { if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to }); }}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Location Filter */}
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Selected Report View */}
        {selectedReport ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground" onClick={handleCloseReport}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Reports
            </Button>
            {renderSelectedReport()}
          </div>
        ) : (
          <>
            {/* Category Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <ResponsiveTabsList onTabChange={setActiveTab}>
                {reportCategories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                    <cat.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{cat.label}</span>
                  </TabsTrigger>
                ))}
              </ResponsiveTabsList>

              <TabsContent value="sales" className="mt-6">
                {renderReportCards(filteredSalesReports)}
              </TabsContent>

              <TabsContent value="staff" className="mt-6">
                {renderReportCards(staffReports)}
              </TabsContent>

              <TabsContent value="clients" className="mt-6">
                {renderReportCards(clientReports)}
              </TabsContent>

              <TabsContent value="operations" className="mt-6">
                {renderReportCards(operationsReports)}
              </TabsContent>

              <TabsContent value="financial" className="mt-6">
                {renderReportCards(financialReports)}
              </TabsContent>
            </Tabs>

            {/* Recent Reports */}
            <RecentReports />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
