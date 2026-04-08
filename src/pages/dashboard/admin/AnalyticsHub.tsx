import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, min } from 'date-fns';
import { getNextPayDay } from '@/hooks/usePaySchedule';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisibilityGate, useElementVisibility } from '@/components/visibility/VisibilityGate';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DollarSign, 
  BarChart3, 
  TrendingUp, 
  Target, 
  FileText,
  MapPin,
  Calendar as CalendarIcon,
  Home,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useTranslation } from 'react-i18next';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { SubtabFavoriteStar } from '@/components/dashboard/analytics/SubtabFavoriteStar';

// Tab content components
import { SalesTabContent } from '@/components/dashboard/analytics/SalesTabContent';
import { OperationsTabContent } from '@/components/dashboard/analytics/OperationsTabContent';
import { MarketingTabContent } from '@/components/dashboard/analytics/MarketingTabContent';
import { ProgramTabContent } from '@/components/dashboard/analytics/ProgramTabContent';
import { RentRevenueTab } from '@/components/dashboard/analytics/RentRevenueTab';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

import { CampaignsTabContent } from '@/components/dashboard/analytics/CampaignsTabContent';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { LeadershipTabContent } from '@/components/dashboard/analytics/LeadershipTabContent';
import { useHasRenters } from '@/hooks/useHasRenters';
import { PageExplainer } from '@/components/ui/PageExplainer';


const baseCategories = [
  { id: 'leadership', label: 'Executive Summary', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'operations', label: 'Operations', icon: BarChart3 },
  { id: 'marketing', label: 'Marketing', icon: TrendingUp },
  { id: 'campaigns', label: 'Campaigns', icon: Target },
  { id: 'program', label: 'Program', icon: Target },
];

const rentCategory = { id: 'rent', label: 'Rent', icon: Home };

export type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'thisWeek' | 'thisMonth' | 'todayToEom' | 'todayToPayday' | 'lastMonth' | 'ytd' | 'custom';

export interface AnalyticsFilters {
  locationId: string;
  dateRange: DateRangeType;
  dateFrom: string;
  dateTo: string;
}

export default function AnalyticsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const subTab = searchParams.get('subtab') || undefined;
  const { effectiveOrganization } = useOrganizationContext();
  const { roles } = useAuth();
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');

  // Add rent tab only for super admins
  const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
  const { data: hasRenters = false } = useHasRenters();
  const analyticsCategories = (isSuperAdmin && hasRenters)
    ? [...baseCategories, rentCategory] 
    : baseCategories;
  
  // Check visibility of each tab
  const leadershipTabVisible = useElementVisibility('analytics_leadership_tab');
  const salesTabVisible = useElementVisibility('analytics_sales_tab');
  const operationsTabVisible = useElementVisibility('analytics_operations_tab');
  const marketingTabVisible = useElementVisibility('analytics_marketing_tab');
  const campaignsTabVisible = useElementVisibility('analytics_campaigns_tab');
  const programTabVisible = useElementVisibility('analytics_program_tab');
  const reportsTabVisible = useElementVisibility('analytics_reports_tab');
  const rentTabVisible = useElementVisibility('analytics_rent_tab');
  
  // Find first visible tab for redirect
  const getFirstVisibleTab = useCallback(() => {
    if (leadershipTabVisible) return 'leadership';
    if (salesTabVisible) return 'sales';
    if (operationsTabVisible) return 'operations';
    if (marketingTabVisible) return 'marketing';
    if (campaignsTabVisible) return 'campaigns';
    if (programTabVisible) return 'program';
    if (reportsTabVisible) return 'reports';
    if (rentTabVisible && isSuperAdmin) return 'rent';
    return null;
  }, [leadershipTabVisible, salesTabVisible, operationsTabVisible, marketingTabVisible, campaignsTabVisible, programTabVisible, reportsTabVisible, rentTabVisible, isSuperAdmin]);

  const firstVisibleTab = getFirstVisibleTab();
  const activeTab =
    tabFromUrl && analyticsCategories.some((c) => c.id === tabFromUrl)
      ? tabFromUrl
      : (firstVisibleTab ?? 'sales');

  // Visibility is enforced at render time via `VisibilityGate` and for redirects via `useElementVisibility` checks above.

  // Sync URL when no tab param: default to first visible tab
  useEffect(() => {
    if (tabFromUrl === null || tabFromUrl === '') {
      const defaultTab = firstVisibleTab ?? 'sales';
      setSearchParams({ tab: defaultTab }, { replace: true });
    }
  }, [tabFromUrl, firstVisibleTab, setSearchParams]);
  
  // Auto-redirect if current tab is hidden
  useEffect(() => {
    const currentTabHidden = 
      (activeTab === 'leadership' && !leadershipTabVisible) ||
      (activeTab === 'sales' && !salesTabVisible) ||
      (activeTab === 'operations' && !operationsTabVisible) ||
      (activeTab === 'marketing' && !marketingTabVisible) ||
      (activeTab === 'campaigns' && !campaignsTabVisible) ||
      (activeTab === 'program' && !programTabVisible) ||
      (activeTab === 'reports' && !reportsTabVisible) ||
      (activeTab === 'rent' && (!rentTabVisible || !isSuperAdmin));
    
    if (currentTabHidden) {
      const firstVisible = getFirstVisibleTab();
      if (firstVisible) {
        setSearchParams({ tab: firstVisible });
      }
    }
  }, [activeTab, leadershipTabVisible, salesTabVisible, operationsTabVisible, marketingTabVisible, campaignsTabVisible, programTabVisible, reportsTabVisible, rentTabVisible, isSuperAdmin, getFirstVisibleTab, setSearchParams]);
  
  // Location access control
  const { 
    accessibleLocations, 
    canViewAggregate, 
    defaultLocationId,
    isLoading: locationAccessLoading 
  } = useUserLocationAccess();
  const { formatDate } = useFormatDate();
  
  const [locationId, setLocationId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: min([endOfMonth(new Date()), new Date()]),
  });
  
  // Set default location when access data loads
  useEffect(() => {
    if (!locationAccessLoading && !locationId) {
      setLocationId(defaultLocationId);
    }
  }, [locationAccessLoading, defaultLocationId, locationId]);
  
  // Determine if we should show the location selector
  const showLocationSelector = canViewAggregate || accessibleLocations.length > 1;

  // Calculate date filters based on selected range
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
      case '90d':
        return { dateFrom: format(subDays(now, 90), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
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
      case 'todayToPayday':
        const nextPayDay = getNextPayDay(null); // Uses default settings
        return { 
          dateFrom: format(now, 'yyyy-MM-dd'), 
          dateTo: format(nextPayDay, 'yyyy-MM-dd') 
        };
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        return { 
          dateFrom: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), 
          dateTo: format(endOfMonth(lastMonth), 'yyyy-MM-dd') 
        };
      case 'ytd':
        return {
          dateFrom: format(startOfYear(now), 'yyyy-MM-dd'),
          dateTo: format(now, 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          dateFrom: format(customDateRange.from, 'yyyy-MM-dd'),
          dateTo: format(customDateRange.to, 'yyyy-MM-dd'),
        };
      default:
        return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    }
  }, [dateRange, customDateRange]);

  const filters: AnalyticsFilters = {
    locationId,
    dateRange,
    ...dateFilters,
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleSubTabChange = (value: string) => {
    setSearchParams({ tab: activeTab, subtab: value });
  };

  // Auto-switch to 30d when entering services subtab (if still on default 'today')
  useEffect(() => {
    if (subTab === 'services' && dateRange === 'today') {
      setDateRange('30d');
    }
  }, [subTab]);

  return (
    <DashboardLayout>
      <div className="w-full max-w-none p-4 md:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <DashboardPageHeader
          title={t('analytics.title')}
          description={t('analytics.subtitle')}
          actions={activeTab !== 'leadership' ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* Location Filter - conditionally rendered based on access */}
              {showLocationSelector && (
                <Select value={locationId} onValueChange={setLocationId}>
                   <SelectTrigger className="w-[200px]">
                    <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder={t('sales.select_location')} />
                  </SelectTrigger>
                  <SelectContent>
                    {canViewAggregate && (
                      <SelectItem value="all">{t('sales.all_locations_option')}</SelectItem>
                    )}
                    {accessibleLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Single location badge (when only one location assigned) */}
              {!showLocationSelector && accessibleLocations.length === 1 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm h-9">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{accessibleLocations[0].name}</span>
                </div>
              )}

              {/* Date Range Select */}
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeType)}>
                <SelectTrigger className="w-[180px]">
                  <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{tc('date_range.today')}</SelectItem>
                  <SelectItem value="yesterday">{tc('date_range.yesterday')}</SelectItem>
                  <SelectItem value="7d">{tc('date_range.last_7_days')}</SelectItem>
                  <SelectItem value="30d">{tc('date_range.last_30_days')}</SelectItem>
                  <SelectItem value="90d">{tc('date_range.last_90_days')}</SelectItem>
                  <SelectItem value="thisWeek">{tc('date_range.this_week')}</SelectItem>
                  <SelectItem value="thisMonth">{tc('date_range.this_month')}</SelectItem>
                  <SelectItem value="todayToEom">{tc('date_range.today_to_eom')}</SelectItem>
                  <SelectItem value="todayToPayday">{tc('date_range.today_to_payday')}</SelectItem>
                  <SelectItem value="lastMonth">{tc('date_range.last_month')}</SelectItem>
                  <SelectItem value="ytd">{tc('date_range.year_to_date')}</SelectItem>
                  <SelectItem value="custom">{tc('date_range.custom_range')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Picker (only when custom is selected) */}
              {dateRange === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size={tokens.button.card} className="min-w-[200px] justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {formatDate(customDateRange.from, 'MMM d')} - {formatDate(customDateRange.to, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-3 space-y-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { const now = new Date(); setCustomDateRange({
                            from: startOfMonth(now),
                            to: min([endOfMonth(now), now]),
                          }); }}
                        >
                          {tc('date_range.this_month')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomDateRange({
                            from: startOfMonth(subMonths(new Date(), 1)),
                            to: endOfMonth(subMonths(new Date(), 1)),
                          })}
                        >
                          {tc('date_range.last_month')}
                        </Button>
                      </div>
                      <Calendar
                        mode="range"
                        selected={{ from: customDateRange.from, to: customDateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setCustomDateRange({ from: range.from, to: range.to });
                          }
                        }}
                        toDate={new Date()}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <Button variant="outline" size={tokens.button.card} asChild className="gap-2">
                <Link to="/dashboard/admin/reports">
                  <FileText className="w-4 h-4" />
                  <span className="hidden lg:inline">Reports</span>
                </Link>
              </Button>
            </div>
          ) : undefined}
        />
        <PageExplainer pageId="analytics-hub" />

        {/* Main Tab Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <ResponsiveTabsList onTabChange={handleTabChange}>
            {analyticsCategories.map((cat) => (
              // VisibilityGate is the source of truth for whether the tab should render at all.
              <VisibilityGate
                key={cat.id}
                elementKey={`analytics_${cat.id}_tab`}
                elementName={t(`analytics.${cat.id}`, { defaultValue: cat.label })}
                elementCategory="Page Tabs"
              >
                <div className="relative group/subtab inline-flex items-center">
                  <TabsTrigger
                    value={cat.id}
                    className="gap-2"
                  >
                    <cat.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {t(`analytics.${cat.id}`, { defaultValue: cat.label })}
                    </span>
                  </TabsTrigger>
                  {cat.id !== 'leadership' && (
                    <SubtabFavoriteStar tab={cat.id} subtab="" label={cat.label} />
                  )}
                </div>
              </VisibilityGate>
            ))}
          </ResponsiveTabsList>

          <VisibilityGate elementKey="analytics_leadership_tab">
            <TabsContent value="leadership" className="mt-6">
              <LeadershipTabContent />
            </TabsContent>
          </VisibilityGate>

          <VisibilityGate elementKey="analytics_sales_tab">
            <TabsContent value="sales" className="mt-6">
              <SalesTabContent 
                filters={filters} 
                subTab={subTab}
                onSubTabChange={handleSubTabChange}
              />
            </TabsContent>
          </VisibilityGate>

          <VisibilityGate elementKey="analytics_operations_tab">
            <TabsContent value="operations" className="mt-6">
              <OperationsTabContent 
                filters={filters}
                subTab={subTab}
                onSubTabChange={handleSubTabChange}
              />
            </TabsContent>
          </VisibilityGate>

          <VisibilityGate elementKey="analytics_marketing_tab">
            <TabsContent value="marketing" className="mt-6">
              <MarketingTabContent filters={filters} />
            </TabsContent>
          </VisibilityGate>

          <VisibilityGate elementKey="analytics_campaigns_tab">
            <TabsContent value="campaigns" className="mt-6">
              <CampaignsTabContent />
            </TabsContent>
          </VisibilityGate>

          <VisibilityGate elementKey="analytics_program_tab">
            <TabsContent value="program" className="mt-6">
              <ProgramTabContent filters={filters} />
            </TabsContent>
          </VisibilityGate>


          {isSuperAdmin && hasRenters && effectiveOrganization?.id && (
            <VisibilityGate elementKey="analytics_rent_tab">
              <TabsContent value="rent" className="mt-6">
                <RentRevenueTab organizationId={effectiveOrganization.id} />
              </TabsContent>
            </VisibilityGate>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
