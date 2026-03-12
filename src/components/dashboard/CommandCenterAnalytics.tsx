import { useState, useMemo } from 'react';
import { VisibilityGate } from '@/components/visibility';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AggregateSalesCard } from '@/components/dashboard/AggregateSalesCard';
import { ForecastingCard } from '@/components/dashboard/sales/ForecastingCard';
import { CapacityUtilizationCard } from '@/components/dashboard/sales/CapacityUtilizationCard';
import { NewBookingsCard } from '@/components/dashboard/NewBookingsCard';
import { TopPerformersCard } from '@/components/dashboard/sales/TopPerformersCard';
import { RevenueDonutChart } from '@/components/dashboard/sales/RevenueDonutChart';
import { ClientFunnelCard } from '@/components/dashboard/sales/ClientFunnelCard';

import { GoalTrackerCard } from '@/components/dashboard/sales/GoalTrackerCard';
import { HiringCapacityCard } from '@/components/dashboard/HiringCapacityCard';
import { StaffingTrendChart } from '@/components/dashboard/StaffingTrendChart';
import { StylistWorkloadCard } from '@/components/dashboard/StylistWorkloadCard';
import { ExecutiveSummaryCard } from '@/components/dashboard/analytics/ExecutiveSummaryCard';
import { DailyBriefCard } from '@/components/dashboard/analytics/DailyBriefCard';
import { OperationalHealthCard } from '@/components/dashboard/analytics/OperationalHealthCard';
import { LocationsRollupCard } from '@/components/dashboard/analytics/LocationsRollupCard';
import { ServiceMixCard } from '@/components/dashboard/analytics/ServiceMixCard';
import { RetailEffectivenessCard } from '@/components/dashboard/analytics/RetailEffectivenessCard';
import { RebookingCard } from '@/components/dashboard/analytics/RebookingCard';
import { ClientHealthSummaryCard } from '@/components/dashboard/client-health/ClientHealthSummaryCard';
import { CommissionSummaryCard } from '@/components/dashboard/sales/CommissionSummaryCard';
import { StaffCommissionTable } from '@/components/dashboard/sales/StaffCommissionTable';
import { TrueProfitCard } from '@/components/dashboard/sales/TrueProfitCard';
import { StaffPerformanceReport } from '@/components/dashboard/analytics/StaffPerformanceReport';
import { ServiceProfitabilityCard } from '@/components/dashboard/analytics/ServiceProfitabilityCard';
import { BackroomControlTower } from '@/components/dashboard/backroom/control-tower/BackroomControlTower';
import { PredictiveBackroomSummary } from '@/components/dashboard/backroom/predictive-backroom/PredictiveBackroomSummary';
import { useDashboardVisibility } from '@/hooks/useDashboardVisibility';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { useSalesMetrics, useSalesByStylist } from '@/hooks/useSalesData';
import { useStaffUtilization } from '@/hooks/useStaffUtilization';
import { useActiveLocations } from '@/hooks/useLocations';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { useRetailBreakdown } from '@/hooks/useRetailBreakdown';
// Commission resolution is now handled internally by CommissionSummaryCard and StaffCommissionTable
import { Link } from 'react-router-dom';
import { Settings2, MapPin, Calendar } from 'lucide-react';
import { format, startOfMonth, subDays, startOfWeek } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek' | 'thisMonth' | 'todayToPayday' | 'lastMonth';

import { DATE_RANGE_LABELS, getDateRangeSubtitle } from '@/lib/dateRangeLabels';

const CC_DATE_RANGE_KEYS: DateRangeType[] = [
  'today', 'yesterday', '7d', '30d', 'thisWeek', 'thisMonth', 'todayToPayday', 'lastMonth',
];

// Helper function to get date range
function getDateRange(dateRange: DateRangeType): { dateFrom: string; dateTo: string } {
  const now = new Date();
  switch (dateRange) {
    case 'today':
      return { dateFrom: format(now, 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { dateFrom: format(yesterday, 'yyyy-MM-dd'), dateTo: format(yesterday, 'yyyy-MM-dd') };
    }
    case '7d':
      return { dateFrom: format(subDays(now, 7), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    case '30d':
      return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    case 'thisWeek':
      return { 
        dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), 
        dateTo: format(now, 'yyyy-MM-dd') 
      };
    case 'thisMonth':
      return { 
        dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), 
        dateTo: format(now, 'yyyy-MM-dd') 
      };
    case 'lastMonth': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { 
        dateFrom: format(lastMonth, 'yyyy-MM-dd'), 
        dateTo: format(lastDay, 'yyyy-MM-dd') 
      };
    }
    default:
      return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
  }
}

// Map of card IDs to their render components
const CARD_COMPONENTS: Record<string, string> = {
  'executive_summary': 'ExecutiveSummary',
  'daily_brief': 'DailyBrief',
  'sales_overview': 'SalesOverview',
  'top_performers': 'TopPerformers',
  'revenue_breakdown': 'RevenueBreakdown',
  'client_funnel': 'ClientFunnel',
  'client_health': 'ClientHealth',
  'operational_health': 'OperationalHealth',
  'rebooking': 'Rebooking',
  'team_goals': 'TeamGoals',
  'goal_tracker': 'GoalTracker',
  'new_bookings': 'NewBookings',
  'week_ahead_forecast': 'Forecast',
  'capacity_utilization': 'Capacity',
  'hiring_capacity': 'HiringCapacity',
  'staffing_trends': 'StaffingTrends',
  'stylist_workload': 'StylistWorkload',
  'locations_rollup': 'LocationsRollup',
  'service_mix': 'ServiceMix',
  'retail_effectiveness': 'RetailEffectiveness',
  'commission_summary': 'CommissionSummary',
  'staff_commission_breakdown': 'StaffCommissionBreakdown',
};

/**
 * Command Center Analytics Section
 * 
 * Renders pinned analytics cards based on visibility settings.
 * Cards can be toggled from the Analytics Hub via "Show on Command Center" buttons.
 * Empty state shows when no cards are pinned.
 */
export function CommandCenterAnalytics() {
  const { data: visibilityData, isLoading } = useDashboardVisibility();
  const { layout } = useDashboardLayout();
  
  // Shared filter state for all pinned analytics cards
  const [locationId, setLocationId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  
  // Fetch locations for dropdown
  const { data: locations } = useActiveLocations();
  
  // Calculate date filters from dateRange
  const dateFilters = useMemo(() => getDateRange(dateRange), [dateRange]);
  const locationFilter = locationId !== 'all' ? locationId : undefined;
  
  // Check if any analytics cards are visible for leadership roles
  const leadershipRoles = ['super_admin', 'admin', 'manager'];
  
  const isElementVisible = (elementKey: string) => {
    if (!visibilityData) return false;
    const element = visibilityData.find(
      v => v.element_key === elementKey && leadershipRoles.includes(v.role)
    );
    return element?.is_visible ?? false;
  };
  
  // Get all visible card IDs
  const allVisibleCardIds = useMemo(() => {
    return Object.keys(CARD_COMPONENTS).filter(id => isElementVisible(id));
  }, [visibilityData]);
  
  // Order visible cards by user's preferred order (from pinnedCards)
  const orderedVisibleCards = useMemo(() => {
    const savedOrder = layout.pinnedCards || [];
    
    // Start with cards in saved order that are visible
    const fromSavedOrder = savedOrder.filter(id => allVisibleCardIds.includes(id));
    
    // Add any visible cards not in saved order
    const notInOrder = allVisibleCardIds.filter(id => !savedOrder.includes(id));
    
    return [...fromSavedOrder, ...notInOrder];
  }, [layout.pinnedCards, allVisibleCardIds]);
  
  const hasAnyPinned = orderedVisibleCards.length > 0;
  
  // Fetch data for cards that need it (only when pinned to avoid unnecessary API calls)
  const { data: salesData } = useSalesMetrics({ 
    dateFrom: dateFilters.dateFrom, 
    dateTo: dateFilters.dateTo,
    locationId: locationFilter,
  });
  const { data: performers, isLoading: isLoadingPerformers } = useSalesByStylist(
    dateFilters.dateFrom, 
    dateFilters.dateTo,
    locationFilter
  );
  const { workload, isLoading: isLoadingWorkload } = useStaffUtilization(undefined, '30days');
  const { data: attachmentData, isLoading: isLoadingAttachment } = useRetailAttachmentRate({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    locationId: locationFilter,
  });
  const { data: retailBreakdown } = useRetailBreakdown(
    dateFilters.dateFrom,
    dateFilters.dateTo,
    true,
    locationFilter,
  );
  // Commission resolution handled internally by commission components
  
  // Show nothing if loading
  if (isLoading) return null;
  
  // Show hint if no cards are pinned
  if (!hasAnyPinned) {
    return (
      <div className="text-center py-8 border border-dashed rounded-xl bg-muted/10">
        <Settings2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground mb-1">
          No analytics cards pinned to Command Center
        </p>
        <p className="text-xs text-muted-foreground/70">
          Visit the{' '}
          <Link to="/dashboard/admin/analytics" className="underline hover:text-foreground transition-colors">
            Analytics Hub
          </Link>{' '}
          and use the gear icon (⚙) to pin cards here.
        </p>
      </div>
    );
  }
  
  // Transform performers data to match TopPerformersCard expected format
  const performersForCard = performers?.map(p => ({
    user_id: p.user_id,
    name: p.name,
    photo_url: p.photo_url,
    totalRevenue: p.totalRevenue,
  })) || [];
  
  // Render a card by its ID
  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'executive_summary':
        return (
          <VisibilityGate key={cardId} elementKey="executive_summary">
            <PinnableCard elementKey="executive_summary" elementName="Executive Summary" category="Command Center">
              <ExecutiveSummaryCard />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'daily_brief':
        return (
          <VisibilityGate key={cardId} elementKey="daily_brief">
            <PinnableCard elementKey="daily_brief" elementName="Daily Brief" category="Command Center">
              <DailyBriefCard
                filterContext={{
                  locationId,
                  dateRange,
                }}
                locationId={locationId}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'sales_overview':
        return (
          <VisibilityGate key={cardId} elementKey="sales_overview">
            <PinnableCard elementKey="sales_overview" elementName="Sales Overview" category="Command Center">
              <AggregateSalesCard 
                externalDateRange={dateRange as any}
                externalDateFilters={dateFilters}
                hideInternalFilter={true}
                filterContext={{
                  locationId: locationId,
                  dateRange: dateRange,
                }}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'top_performers':
        return (
          <VisibilityGate key={cardId} elementKey="top_performers">
            <PinnableCard elementKey="top_performers" elementName="Top Performers" category="Command Center">
              <TopPerformersCard 
                performers={performersForCard} 
                isLoading={isLoadingPerformers} 
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'revenue_breakdown':
        return (
          <VisibilityGate key={cardId} elementKey="revenue_breakdown">
            <PinnableCard elementKey="revenue_breakdown" elementName="Revenue Breakdown" category="Command Center">
              <RevenueDonutChart 
                serviceRevenue={salesData?.serviceRevenue || 0}
                productRevenue={salesData?.productRevenue || 0}
                retailAttachmentRate={attachmentData?.attachmentRate}
                retailAttachmentLoading={isLoadingAttachment}
                retailBreakdown={retailBreakdown ? {
                  productOnlyRevenue: retailBreakdown.productRevenue,
                  extensionRevenue: retailBreakdown.extensionRevenue,
                  merchRevenue: retailBreakdown.merchRevenue,
                  giftCardRevenue: retailBreakdown.giftCardRevenue,
                } : undefined}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'client_funnel':
        return (
          <VisibilityGate key={cardId} elementKey="client_funnel">
            <PinnableCard elementKey="client_funnel" elementName="Client Funnel" category="Command Center">
              <ClientFunnelCard dateFrom={dateFilters.dateFrom} dateTo={dateFilters.dateTo} />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'client_health':
        return (
          <VisibilityGate key={cardId} elementKey="client_health">
            <PinnableCard elementKey="client_health" elementName="Client Health" category="Command Center">
              <ClientHealthSummaryCard />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'operational_health':
        return (
          <VisibilityGate key={cardId} elementKey="operational_health">
            <PinnableCard elementKey="operational_health" elementName="Operational Health" category="Command Center">
              <OperationalHealthCard
                filterContext={{
                  locationId,
                  dateRange,
                }}
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationId}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'rebooking':
        return (
          <VisibilityGate key={cardId} elementKey="rebooking">
            <PinnableCard elementKey="rebooking" elementName="Rebooking Rate" category="Command Center">
              <RebookingCard
                filterContext={{
                  locationId,
                  dateRange,
                }}
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationId}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'goal_tracker':
        return (
          <VisibilityGate key={cardId} elementKey="goal_tracker">
            <GoalTrackerCard />
          </VisibilityGate>
        );
      case 'new_bookings':
        return (
          <VisibilityGate key={cardId} elementKey="new_bookings">
            <PinnableCard elementKey="new_bookings" elementName="New Bookings" category="Command Center">
              <NewBookingsCard 
                filterContext={{
                  locationId: locationId,
                  dateRange: dateRange,
                }}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'week_ahead_forecast':
        return (
          <VisibilityGate key={cardId} elementKey="week_ahead_forecast">
            <PinnableCard elementKey="week_ahead_forecast" elementName="Week Ahead Forecast" category="Command Center">
              <ForecastingCard />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'capacity_utilization':
        return (
          <VisibilityGate key={cardId} elementKey="capacity_utilization">
            <PinnableCard elementKey="capacity_utilization" elementName="Capacity Utilization" category="Command Center">
              <CapacityUtilizationCard />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'hiring_capacity':
        return (
          <VisibilityGate key={cardId} elementKey="hiring_capacity">
            <PinnableCard elementKey="hiring_capacity" elementName="Hiring Capacity" category="Command Center">
              <HiringCapacityCard />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'staffing_trends':
        return (
          <VisibilityGate key={cardId} elementKey="staffing_trends">
            <PinnableCard elementKey="staffing_trends" elementName="Staffing Trends" category="Command Center">
              <StaffingTrendChart />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'stylist_workload':
        return (
          <VisibilityGate key={cardId} elementKey="stylist_workload">
            <PinnableCard elementKey="stylist_workload" elementName="Stylist Workload" category="Command Center">
              <StylistWorkloadCard 
                workload={workload || []} 
                isLoading={isLoadingWorkload} 
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'locations_rollup':
        return (
          <VisibilityGate key={cardId} elementKey="locations_rollup">
            <EnforcementGateBanner gateKey="gate_margin_baselines">
              <PinnableCard elementKey="locations_rollup" elementName="Locations Rollup" category="Command Center">
                <LocationsRollupCard
                  filterContext={{
                    locationId: 'all',
                    dateRange,
                  }}
                  dateFrom={dateFilters.dateFrom}
                  dateTo={dateFilters.dateTo}
                />
              </PinnableCard>
            </EnforcementGateBanner>
          </VisibilityGate>
        );
      case 'service_mix':
        return (
          <VisibilityGate key={cardId} elementKey="service_mix">
            <PinnableCard elementKey="service_mix" elementName="Service Mix" category="Command Center">
              <ServiceMixCard
                filterContext={{
                  locationId,
                  dateRange,
                }}
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationId}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'retail_effectiveness':
        return (
          <VisibilityGate key={cardId} elementKey="retail_effectiveness">
            <PinnableCard elementKey="retail_effectiveness" elementName="Retail Effectiveness" category="Command Center">
              <RetailEffectivenessCard
                filterContext={{
                  locationId,
                  dateRange,
                }}
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationId}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'commission_summary':
        return (
          <VisibilityGate key={cardId} elementKey="commission_summary">
            <PinnableCard elementKey="commission_summary" elementName="Commission Summary" category="Command Center">
              <CommissionSummaryCard
                stylistData={performers}
                isLoading={isLoadingPerformers}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'staff_commission_breakdown':
        return (
          <VisibilityGate key={cardId} elementKey="staff_commission_breakdown">
            <PinnableCard elementKey="staff_commission_breakdown" elementName="Staff Commission Breakdown" category="Command Center">
              <StaffCommissionTable
                stylistData={performers}
                isLoading={isLoadingPerformers}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Shared Filter Bar - appears when any analytics cards are pinned */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Location Select */}
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="h-9 w-auto min-w-[180px] text-sm">
            <MapPin className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Date Range Select */}
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeType)}>
          <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm">
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CC_DATE_RANGE_KEYS.map((key) => {
              const subtitle = getDateRangeSubtitle(key);
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span>{DATE_RANGE_LABELS[key] ?? key}</span>
                    {subtitle && (
                      <span className="text-[11px] text-muted-foreground leading-tight">{subtitle}</span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
      {/* Render cards in user's preferred order */}
      {orderedVisibleCards.map(cardId => renderCard(cardId))}
    </div>
  );
}
