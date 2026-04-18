import { useState, useMemo } from 'react';
import { DailyBriefingPanel } from '@/components/dashboard/DailyBriefingPanel';
import { useTasks } from '@/hooks/useTasks';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import type { BriefingRoleContext } from '@/hooks/useDailyBriefingEngine';

/** Inline wrapper that provides task + role data to DailyBriefingPanel inside Command Center */
function DailyBriefingSection() {
  const { tasks } = useTasks();
  const roles = useEffectiveRoles();
  const roleContext: BriefingRoleContext = roles.includes('super_admin') || roles.includes('admin')
    ? 'owner'
    : roles.includes('manager')
    ? 'manager'
    : 'stylist';
  return <DailyBriefingPanel tasks={tasks} roleContext={roleContext} compact />;
}
import { VisibilityGate } from '@/components/visibility';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AggregateSalesCard } from '@/components/dashboard/AggregateSalesCard';
import { ForecastingCard } from '@/components/dashboard/sales/ForecastingCard';
import { CapacityUtilizationCard } from '@/components/dashboard/sales/CapacityUtilizationCard';
import { NewBookingsCard } from '@/components/dashboard/NewBookingsCard';
import { TopPerformersCard } from '@/components/dashboard/sales/TopPerformersCard';
import { RevenueDonutChart } from '@/components/dashboard/sales/RevenueDonutChart';
import { RetailPerformanceAlert } from '@/components/dashboard/sales/RetailPerformanceAlert';
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
import { ColorBarControlTower } from '@/components/dashboard/color-bar/control-tower/ColorBarControlTower';
import { PredictiveColorBarSummary } from '@/components/dashboard/color-bar/predictive-color-bar/PredictiveColorBarSummary';
import { ZuraCapitalCard } from '@/components/dashboard/capital-engine/ZuraCapitalCard';
import { ClientExperienceCard } from '@/components/dashboard/sales/ClientExperienceCard';
import { OperationsQuickStats } from '@/components/dashboard/operations/OperationsQuickStats';
import { useDashboardVisibility } from '@/hooks/useDashboardVisibility';
import { useDashboardLayout, getPinnedVisibilityKey } from '@/hooks/useDashboardLayout';
import { useSalesMetrics, useSalesByStylist } from '@/hooks/useSalesData';
import { useStaffUtilization } from '@/hooks/useStaffUtilization';
import { useActiveLocations } from '@/hooks/useLocations';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { useRetailBreakdown } from '@/hooks/useRetailBreakdown';
// Commission resolution is now handled internally by CommissionSummaryCard and StaffCommissionTable
import { Link } from 'react-router-dom';
import { Settings2, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek' | 'thisMonth' | 'todayToEom' | 'todayToPayday' | 'lastMonth';

import { DATE_RANGE_LABELS, getDateRangeSubtitle } from '@/lib/dateRangeLabels';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { getDateRange } from '@/components/dashboard/PinnedAnalyticsCard';


const CC_DATE_RANGE_KEYS: DateRangeType[] = [
  'today', 'yesterday', '7d', '30d', 'thisWeek', 'thisMonth', 'todayToEom', 'todayToPayday', 'lastMonth',
];

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
  'true_profit': 'TrueProfit',
  'staff_performance': 'StaffPerformance',
  'service_profitability': 'ServiceProfitability',
  'control_tower': 'ControlTower',
  'predictive_inventory': 'PredictiveInventory',
  'client_experience_staff': 'ClientExperience',
  'operations_stats': 'OperationsStats',
  'zura_capital': 'ZuraCapital',
};

/**
 * Command Center Analytics Section
 * 
 * Renders pinned analytics cards based on visibility settings.
 * Cards can be toggled from the Analytics Hub via "Show on Command Center" buttons.
 * Empty state shows when no cards are pinned.
 */
export function CommandCenterAnalytics() {
  const { dashPath } = useOrgDashboardPath();
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
  
  const isElementVisible = (cardId: string) => {
    if (!visibilityData) return false;
    const visibilityKey = getPinnedVisibilityKey(cardId);
    const element = visibilityData.find(
      v => v.element_key === visibilityKey && leadershipRoles.includes(v.role)
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
          <Link to={dashPath('/admin/analytics')} className="underline hover:text-foreground transition-colors">
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
            <PinnableCard elementKey="daily_brief" elementName="Appointments Summary" category="Command Center">
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
            <div className="flex flex-col gap-3">
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
              {(() => {
                const svc = salesData?.serviceRevenue || 0;
                const prod = salesData?.productRevenue || 0;
                const t = svc + prod;
                const extRev = retailBreakdown?.extensionRevenue ?? 0;
                const truePct = t > 0 ? Math.round(((prod - extRev) / t) * 100) : 0;
                const hasBd = !!retailBreakdown && (
                  (retailBreakdown.productRevenue ?? 0) > 0 ||
                  (retailBreakdown.extensionRevenue ?? 0) > 0 ||
                  (retailBreakdown.merchRevenue ?? 0) > 0 ||
                  (retailBreakdown.giftCardRevenue ?? 0) > 0
                );
                return (
                  <RetailPerformanceAlert
                    trueRetailPercent={truePct}
                    retailAttachmentRate={attachmentData?.attachmentRate}
                    total={t}
                    hasBreakdown={hasBd}
                  />
                );
              })()}
            </div>
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
      case 'true_profit':
        return (
          <VisibilityGate key={cardId} elementKey="true_profit">
            <PinnableCard elementKey="true_profit" elementName="True Profit" category="Command Center">
              <TrueProfitCard
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'staff_performance':
        return (
          <VisibilityGate key={cardId} elementKey="staff_performance">
            <PinnableCard elementKey="staff_performance" elementName="Staff Performance" category="Command Center">
              <StaffPerformanceReport
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'service_profitability':
        return (
          <VisibilityGate key={cardId} elementKey="service_profitability">
            <PinnableCard elementKey="service_profitability" elementName="Service Profitability" category="Command Center">
              <ServiceProfitabilityCard
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'control_tower':
        return (
          <VisibilityGate key={cardId} elementKey="control_tower">
            <PinnableCard elementKey="control_tower" elementName="Control Tower" category="Command Center">
              <ColorBarControlTower locationId={locationFilter} />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'predictive_inventory':
        return (
          <VisibilityGate key={cardId} elementKey="predictive_inventory">
            <PinnableCard elementKey="predictive_inventory" elementName="Predictive Inventory" category="Command Center">
              <PredictiveColorBarSummary locationId={locationFilter} />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'client_experience_staff':
        return (
          <VisibilityGate key={cardId} elementKey="client_experience_staff">
            <PinnableCard elementKey="client_experience_staff" elementName="Client Experience" category="Command Center">
              <ClientExperienceCard
                dateFrom={dateFilters.dateFrom}
                dateTo={dateFilters.dateTo}
                locationId={locationFilter}
              />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'operations_stats':
        return (
          <VisibilityGate key={cardId} elementKey="operations_quick_stats">
            <PinnableCard elementKey="operations_quick_stats" elementName="Operations Queue" category="Command Center">
              <OperationsQuickStats locationId={locationFilter} filterContext={{ locationId, dateRange }} />
            </PinnableCard>
          </VisibilityGate>
        );
      case 'zura_capital':
        return (
          <VisibilityGate key={cardId} elementKey="zura_capital">
            <PinnableCard elementKey="zura_capital" elementName="Zura Capital" category="Command Center">
              <ZuraCapitalCard />
            </PinnableCard>
          </VisibilityGate>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Daily Briefing Panel — always first */}
      <DailyBriefingSection />

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
