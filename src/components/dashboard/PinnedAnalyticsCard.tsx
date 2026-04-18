import { useMemo, useState } from 'react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { format, startOfMonth, endOfMonth, subDays, startOfWeek } from 'date-fns';
import { VisibilityGate, useElementVisibility } from '@/components/visibility';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { Card } from '@/components/ui/card';
import { AggregateSalesCard, DateRange as SalesDateRange } from '@/components/dashboard/AggregateSalesCard';
import {
  DollarSign, TrendingUp, Users, Clock, BarChart3, Heart,
  Activity, MapPin, Scissors, ShoppingBag, CalendarCheck,
  Target, Gauge, FileText, Sparkles, Briefcase, UserPlus,
  LineChart, BarChart2, ChevronRight, CheckCircle2, AlertTriangle,
  Beaker, Award, FlaskConical, Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useTodaysQueue } from '@/hooks/useTodaysQueue';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { useRebookingRate } from '@/hooks/useRebookingRate';
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
import { OperationsQuickStats } from '@/components/dashboard/operations/OperationsQuickStats';
import { ExecutiveSummaryCard } from '@/components/dashboard/analytics/ExecutiveSummaryCard';
import { ClientHealthSummaryCard } from '@/components/dashboard/client-health/ClientHealthSummaryCard';
import { DailyBriefCard } from '@/components/dashboard/analytics/DailyBriefCard';
import { OperationalHealthCard } from '@/components/dashboard/analytics/OperationalHealthCard';
import { LocationsRollupCard } from '@/components/dashboard/analytics/LocationsRollupCard';
import { ServiceMixCard } from '@/components/dashboard/analytics/ServiceMixCard';
import { RetailEffectivenessCard } from '@/components/dashboard/analytics/RetailEffectivenessCard';
import { RebookingCard } from '@/components/dashboard/analytics/RebookingCard';
import { CommissionSummaryCard } from '@/components/dashboard/sales/CommissionSummaryCard';
import { StaffCommissionTable } from '@/components/dashboard/sales/StaffCommissionTable';
import { TrueProfitCard } from '@/components/dashboard/sales/TrueProfitCard';
import { StaffPerformanceReport } from '@/components/dashboard/analytics/StaffPerformanceReport';
import { ServiceProfitabilityCard } from '@/components/dashboard/analytics/ServiceProfitabilityCard';
import { ColorBarControlTower } from '@/components/dashboard/color-bar/control-tower/ColorBarControlTower';
import { PredictiveColorBarSummary } from '@/components/dashboard/color-bar/predictive-color-bar/PredictiveColorBarSummary';
import { ClientExperienceCard } from '@/components/dashboard/sales/ClientExperienceCard';
import { useSalesMetrics, useSalesByStylist, useServiceMix } from '@/hooks/useSalesData';
import { useTodayActualRevenue } from '@/hooks/useTodayActualRevenue';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { useRetailBreakdown } from '@/hooks/useRetailBreakdown';
import { useStaffUtilization } from '@/hooks/useStaffUtilization';
import { useLocations } from '@/hooks/useLocations';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import type { FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useClientFunnel } from '@/hooks/useSalesAnalytics';
import { useClientHealthSegments } from '@/hooks/useClientHealthSegments';
import { useNewBookings } from '@/hooks/useNewBookings';
import { useHiringCapacity } from '@/hooks/useHiringCapacity';
import { useGoalTrackerData } from '@/hooks/useGoalTrackerData';
import { useWeekAheadRevenue } from '@/hooks/useWeekAheadRevenue';
import { getNextPayDay, type PayScheduleSettings } from '@/hooks/usePaySchedule';

export type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek' | 'thisMonth' | 'todayToEom' | 'todayToPayday' | 'lastMonth';

/** Human-readable phrase for the active date range, used in compact card labels. */
function getPeriodLabel(dateRange: DateRangeType): string {
  const map: Record<DateRangeType, string> = {
    today: 'today',
    yesterday: 'yesterday',
    '7d': 'the last 7 days',
    '30d': 'the last 30 days',
    thisWeek: 'this week',
    thisMonth: 'this month',
    todayToEom: 'today through end of month',
    todayToPayday: 'today through next pay day',
    lastMonth: 'last month',
  };
  return map[dateRange] ?? 'this period';
}

// Map pinned cards to their parent analytics tab visibility keys
// If the parent tab is hidden, the card should also be hidden
const CARD_TO_TAB_MAP: Record<string, string> = {
  'executive_summary': 'analytics_leadership_tab',
  'sales_overview': 'analytics_sales_tab',
  'top_performers': 'analytics_sales_tab',
  'revenue_breakdown': 'analytics_sales_tab',
  'goal_tracker': 'analytics_sales_tab',
  'week_ahead_forecast': 'analytics_sales_tab',
  'capacity_utilization': 'analytics_operations_tab',
  'operations_stats': 'analytics_operations_tab',
  'new_bookings': 'analytics_operations_tab',
  'hiring_capacity': 'analytics_operations_tab',
  'staffing_trends': 'analytics_operations_tab',
  'stylist_workload': 'analytics_operations_tab',
  'client_funnel': 'analytics_marketing_tab',
  'client_health': 'analytics_operations_tab',
  'daily_brief': 'analytics_leadership_tab',
  'operational_health': 'analytics_operations_tab',
  'locations_rollup': 'analytics_sales_tab',
  'service_mix': 'analytics_sales_tab',
  'retail_effectiveness': 'analytics_sales_tab',
  'rebooking': 'analytics_operations_tab',
  'client_experience_staff': 'analytics_sales_tab',
  'commission_summary': 'analytics_sales_tab',
  'staff_commission_breakdown': 'analytics_sales_tab',
  'true_profit': 'analytics_sales_tab',
  'staff_performance': 'analytics_sales_tab',
  'service_profitability': 'analytics_sales_tab',
  'control_tower': 'analytics_operations_tab',
  'predictive_inventory': 'analytics_operations_tab',
};

// Map dashboard date range to Sales Overview date range
function mapToSalesDateRange(dashboardRange: DateRangeType): SalesDateRange {
  const mapping: Record<DateRangeType, SalesDateRange> = {
    'today': 'today',
    'yesterday': 'yesterday',
    '7d': '7d',
    '30d': '30d',
    'thisWeek': 'thisWeek',
    'thisMonth': 'mtd',
    'todayToEom': 'todayToEom',
    'todayToPayday': 'todayToEom', // Fallback for sales card
    'lastMonth': 'lastMonth',
  };
  return mapping[dashboardRange] || 'today';
}

export { type FilterContext };

// Helper function to get date range
export function getDateRange(
  dateRange: DateRangeType, 
  payScheduleSettings?: PayScheduleSettings | null
): { dateFrom: string; dateTo: string } {
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
    case 'todayToEom':
      return {
        dateFrom: format(now, 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'todayToPayday': {
      const nextPayDay = getNextPayDay(payScheduleSettings || null);
      return { 
        dateFrom: format(now, 'yyyy-MM-dd'), 
        dateTo: format(nextPayDay, 'yyyy-MM-dd') 
      };
    }
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

export interface AnalyticsFilters {
  locationId: string;
  dateRange: DateRangeType;
  dateFrom: string;
  dateTo: string;
}

interface PinnedAnalyticsCardProps {
  cardId: string;
  filters: AnalyticsFilters;
  compact?: boolean;
}

// Cards whose data is independent of the date range filter
const TIME_INDEPENDENT_CARDS = new Set([
  'week_ahead_forecast',
  'hiring_capacity',
  'staffing_trends',
  'stylist_workload',
  'client_health',
]);

// Icon + label mapping for each card in compact mode
const CARD_META: Record<string, { icon: React.ElementType; label: string }> = {
  executive_summary: { icon: Sparkles, label: 'Executive Summary' },
  daily_brief: { icon: FileText, label: 'Appointments Summary' },
  sales_overview: { icon: DollarSign, label: 'Sales Overview' },
  top_performers: { icon: TrendingUp, label: 'Top Performers' },
  operations_stats: { icon: Clock, label: 'Operations' },
  revenue_breakdown: { icon: BarChart3, label: 'Revenue Breakdown' },
  client_funnel: { icon: Users, label: 'Client Funnel' },
  client_health: { icon: Heart, label: 'Client Health' },
  operational_health: { icon: Activity, label: 'Operational Health' },
  locations_rollup: { icon: MapPin, label: 'Locations Rollup' },
  service_mix: { icon: Scissors, label: 'Service Mix' },
  retail_effectiveness: { icon: ShoppingBag, label: 'Retail Effectiveness' },
  rebooking: { icon: CalendarCheck, label: 'Rebooking Rate' },
  goal_tracker: { icon: Target, label: 'Goal Tracker' },
  capacity_utilization: { icon: Gauge, label: 'Capacity Utilization' },
  week_ahead_forecast: { icon: LineChart, label: 'Week Ahead Forecast' },
  new_bookings: { icon: UserPlus, label: 'New Bookings' },
  hiring_capacity: { icon: Briefcase, label: 'Hiring Capacity' },
  staffing_trends: { icon: BarChart2, label: 'Staffing Trends' },
  stylist_workload: { icon: Users, label: 'Stylist Workload' },
  client_experience_staff: { icon: Users, label: 'Client Experience' },
  commission_summary: { icon: DollarSign, label: 'Commission Summary' },
  staff_commission_breakdown: { icon: Users, label: 'Staff Commissions' },
  true_profit: { icon: TrendingUp, label: 'True Profit' },
  staff_performance: { icon: Award, label: 'Staff Performance' },
  service_profitability: { icon: Scissors, label: 'Service Profitability' },
  control_tower: { icon: FlaskConical, label: 'Control Tower' },
  predictive_inventory: { icon: Package, label: 'Predictive Inventory' },
};

// Tooltip descriptions for compact bento tiles
const CARD_DESCRIPTIONS: Record<string, string> = {
  executive_summary: 'Total revenue across all services and products.',
  daily_brief: 'Revenue generated today across all providers.',
  sales_overview: 'Combined service and product revenue for the selected period.',
  top_performers: 'Highest-earning team member by total revenue.',
  operations_stats: 'Current queue activity including waiting and in-service clients.',
  revenue_breakdown: 'Revenue split between services and retail products.',
  client_funnel: 'Total unique clients (new and returning) in the period.',
  client_health: 'Clients flagged as at-risk, win-back, or new-no-return.',
  operational_health: 'Overall operational status across monitored locations.',
  locations_rollup: 'Number of active locations in your organization.',
  service_mix: 'Highest-revenue service category in the period.',
  retail_effectiveness: 'Percentage of service transactions that include a retail purchase.',
  rebooking: 'Percentage of clients who rebooked before leaving.',
  goal_tracker: 'Organization-wide goal completion percentage.',
  capacity_utilization: 'Average chair utilization across all providers.',
  week_ahead_forecast: 'Projected total revenue for the next 7 days.',
  new_bookings: 'New appointments booked in the selected period.',
  hiring_capacity: 'Open chair positions based on capacity analysis.',
  staffing_trends: 'Count of currently active staff members.',
  stylist_workload: 'Average utilization percentage across all stylists.',
  client_experience_staff: 'Client experience scores by staff member.',
  commission_summary: 'Estimated commission payouts across all staff for the period.',
  staff_commission_breakdown: 'Per-stylist commission breakdown based on revenue and commission model.',
  true_profit: 'Revenue minus chemical cost, labor cost, and waste — your real bottom line.',
  staff_performance: 'Unified stylist scorecard: revenue, rebooking, retail, and color bar metrics.',
  service_profitability: 'Service-level profitability ranking by revenue minus product cost.',
  control_tower: 'Real-time color bar alerts: waste, variance, and compliance issues.',
  predictive_inventory: 'AI-forecasted color inventory needs based on booking trends.',
};

// Link mapping for compact bento tiles
const CARD_LINKS: Record<string, { label: string; href: string }> = {
  executive_summary: { label: 'Brief', href: '/dashboard/admin/analytics?tab=leadership' },
  sales_overview: { label: 'Sales', href: '/dashboard/admin/analytics?tab=sales' },
  top_performers: { label: 'Team', href: '/dashboard/admin/analytics?tab=sales&subtab=team' },
  capacity_utilization: { label: 'Capacity', href: '/dashboard/admin/analytics?tab=operations&subtab=capacity' },
  client_funnel: { label: 'Clients', href: '/dashboard/admin/analytics?tab=marketing' },
  goal_tracker: { label: 'Goals', href: '/dashboard/admin/analytics?tab=sales&subtab=goals' },
  new_bookings: { label: 'Pipeline', href: '/dashboard/admin/analytics?tab=operations&subtab=booking-pipeline' },
  client_health: { label: 'Health', href: '/dashboard/admin/analytics?tab=operations' },
  service_mix: { label: 'Mix', href: '/dashboard/admin/analytics?tab=sales' },
  rebooking: { label: 'Rebooking', href: '/dashboard/admin/analytics?tab=operations' },
  retail_effectiveness: { label: 'Retail', href: '/dashboard/admin/analytics?tab=sales' },
  staffing_trends: { label: 'Staff', href: '/dashboard/admin/analytics?tab=operations' },
  stylist_workload: { label: 'Workload', href: '/dashboard/admin/analytics?tab=operations&subtab=capacity' },
  operational_health: { label: 'Health', href: '/dashboard/admin/analytics?tab=operations' },
  week_ahead_forecast: { label: 'Forecast', href: '/dashboard/admin/analytics?tab=sales' },
  daily_brief: { label: 'Brief', href: '/dashboard/admin/analytics?tab=leadership' },
  revenue_breakdown: { label: 'Revenue', href: '/dashboard/admin/analytics?tab=sales' },
  locations_rollup: { label: 'Locations', href: '/dashboard/admin/analytics?tab=sales' },
  hiring_capacity: { label: 'Hiring', href: '/dashboard/admin/analytics?tab=operations' },
  operations_stats: { label: 'Queue', href: '/dashboard/admin/analytics?tab=operations' },
  client_experience_staff: { label: 'Experience', href: '/dashboard/admin/analytics?tab=sales' },
  commission_summary: { label: 'Commissions', href: '/dashboard/admin/analytics?tab=sales' },
  staff_commission_breakdown: { label: 'Commissions', href: '/dashboard/admin/analytics?tab=sales' },
  true_profit: { label: 'Profit', href: '/dashboard/admin/analytics?tab=sales' },
  staff_performance: { label: 'Performance', href: '/dashboard/admin/analytics?tab=sales' },
  service_profitability: { label: 'Profitability', href: '/dashboard/admin/analytics?tab=sales' },
  control_tower: { label: 'Control Tower', href: '/dashboard/admin/color-bar' },
  predictive_inventory: { label: 'Inventory', href: '/dashboard/admin/color-bar' },
};

/**
 * Renders a single pinned analytics card with shared filters.
 * This component is used by DashboardHome to render individual analytics cards
 * that have been placed inline with other dashboard sections.
 */
export function PinnedAnalyticsCard({ cardId, filters, compact = false }: PinnedAnalyticsCardProps) {
  // Check if parent tab is visible - if not, hide this card
  const parentTabKey = CARD_TO_TAB_MAP[cardId];
  const parentTabVisible = useElementVisibility(parentTabKey || '');
  
  const locationFilter = filters.locationId !== 'all' ? filters.locationId : undefined;
  
  // Create filter context for cards that display it
  const filterContext: FilterContext = {
    locationId: filters.locationId,
    dateRange: filters.dateRange,
  };
  
  // Fetch data for cards that need it - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { data: salesData } = useSalesMetrics({ 
    dateFrom: filters.dateFrom, 
    dateTo: filters.dateTo,
    locationId: locationFilter,
  });
  const { data: performers, isLoading: isLoadingPerformers } = useSalesByStylist(
    filters.dateFrom, 
    filters.dateTo,
    locationFilter
  );
  const { workload, isLoading: isLoadingWorkload } = useStaffUtilization(undefined, '30days');
  const { data: attachmentData, isLoading: isLoadingAttachment } = useRetailAttachmentRate({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    locationId: locationFilter,
  });
  const { data: retailBreakdown } = useRetailBreakdown(
    filters.dateFrom,
    filters.dateTo,
    true,
    locationFilter,
  );

  const { accessibleLocations } = useUserLocationAccess();
  const { data: locations } = useLocations();
  const { data: rebookData } = useRebookingRate(filters.dateFrom, filters.dateTo, filters.locationId);
  const { formatCurrencyWhole, formatCurrencyCompact } = useFormatCurrency();
  const { formatPercent, formatNumber } = useFormatNumber();
  
  // Additional hooks for compact metrics (called unconditionally per React rules)
  const { data: serviceMixData } = useServiceMix(filters.dateFrom, filters.dateTo, locationFilter);
  const { data: clientFunnelData } = useClientFunnel(filters.dateFrom, filters.dateTo, locationFilter);
  const { data: clientHealthData } = useClientHealthSegments();
  const newBookingsQuery = useNewBookings(locationFilter, filters.dateRange);
  const hiringCapacity = useHiringCapacity();
  const { orgMetrics: goalOrgMetrics } = useGoalTrackerData('monthly');
  const { data: weekAheadData, isLoading: weekAheadLoading } = useWeekAheadRevenue(locationFilter);
  const { data: queueData } = useTodaysQueue(locationFilter);
  const isToday = filters.dateRange === 'today';
  const { data: todayActualData } = useTodayActualRevenue(isToday);
  const selectedLocationName = locationFilter
    ? locations?.find(l => l.id === locationFilter)?.name || 'Unknown'
    : 'All Locations';
  
  // Transform performers data to match TopPerformersCard expected format
  const performersForCard = performers?.map(p => ({
    user_id: p.user_id,
    name: p.name,
    photo_url: p.photo_url,
    totalRevenue: p.totalRevenue,
  })) || [];
  
  // If parent tab is hidden and we have a mapping, don't render the card
  // This check MUST come AFTER all hooks are called
  if (parentTabKey && !parentTabVisible) {
    return null;
  }

  // ── Compact (simple) view ──────────────────────────────────────
  if (compact) {
    // Filter out unknown card IDs gracefully
    if (!CARD_META[cardId]) return null;
    
    const meta = CARD_META[cardId];
    const Icon = meta.icon;
    
    // Extract primary metric per card
    let metricValue = '';
    let metricLabel = '';
    let metricSubtext = '';
    let goalPaceIcon: React.ReactNode = null;
    
    switch (cardId) {
      case 'executive_summary':
        metricValue = formatCurrencyWhole(salesData?.totalRevenue ?? 0);
        metricLabel = filters.dateRange === 'today'
          ? "Today's expected revenue across all services and retail"
          : `Total revenue across all services and retail for ${getPeriodLabel(filters.dateRange)}`;
        break;
      case 'sales_overview':
        if (isToday && todayActualData?.hasActualData) {
          metricValue = formatCurrencyWhole(todayActualData.actualRevenue);
          metricLabel = 'Sales so far today';
          metricSubtext = `${formatCurrencyWhole(salesData?.totalRevenue ?? 0)} expected today`;
        } else {
          metricValue = formatCurrencyWhole(salesData?.totalRevenue ?? 0);
          metricLabel = isToday
            ? "Today's expected revenue across all services and retail"
            : `Total revenue across all services and retail for ${getPeriodLabel(filters.dateRange)}`;
        }
        break;
      case 'daily_brief':
        metricValue = formatCurrencyWhole(salesData?.totalRevenue ?? 0);
        metricLabel = `Revenue earned ${getPeriodLabel(filters.dateRange)}`;
        break;
      case 'top_performers': {
        const top = performersForCard[0];
        if (top) {
          metricValue = `${top.name.split(' ')[0]} · ${formatCurrencyWhole(top.totalRevenue)}`;
          metricLabel = `Highest earning team member ${getPeriodLabel(filters.dateRange)}`;
        } else {
          metricValue = '--';
          metricLabel = '';
        }
        break;
      }
      case 'operations_stats': {
        const waiting = queueData?.stats.waitingCount ?? 0;
        const inService = queueData?.stats.inServiceCount ?? 0;
        metricValue = `${waiting + inService}`;
        metricLabel = `${waiting} waiting · ${inService} in service`;
        break;
      }
      case 'revenue_breakdown':
        metricValue = `${formatCurrencyWhole(salesData?.serviceRevenue ?? 0)} / ${formatCurrencyWhole(salesData?.productRevenue ?? 0)}`;
        metricLabel = `Service vs. retail revenue for ${getPeriodLabel(filters.dateRange)}`;
        break;
      case 'retail_effectiveness':
        metricValue = attachmentData ? formatPercent(attachmentData.attachmentRate) : '--';
        metricLabel = `Retail attachment rate for ${getPeriodLabel(filters.dateRange)}`;
        break;
      case 'rebooking':
        metricValue = rebookData ? formatPercent(rebookData.rebookRate) : '--';
        metricLabel = `Clients who rebooked before leaving (${getPeriodLabel(filters.dateRange)})`;
        break;
      case 'capacity_utilization': {
        const avgUtil = workload?.length
          ? Math.round(workload.reduce((s, w) => s + w.utilizationScore, 0) / workload.length)
          : 0;
        metricValue = `${avgUtil}%`;
        metricLabel = 'Average chair utilization across locations';
        break;
      }
      case 'operational_health': {
        const locCount = accessibleLocations?.length ?? 0;
        metricValue = locCount > 0 ? `${locCount} location${locCount !== 1 ? 's' : ''} monitored` : 'Healthy';
        metricLabel = 'Monitoring status across all locations';
        break;
      }
      case 'locations_rollup': {
        const locRollupCount = accessibleLocations?.length ?? 0;
        metricValue = `${locRollupCount} location${locRollupCount !== 1 ? 's' : ''}`;
        metricLabel = '';
        break;
      }
      case 'service_mix': {
        const topCat = serviceMixData?.[0];
        if (topCat) {
          metricValue = `${topCat.category} · ${formatCurrencyCompact(topCat.revenue)}`;
          metricLabel = `Top service category by revenue (${getPeriodLabel(filters.dateRange)})`;
        } else {
          metricValue = '--';
          metricLabel = '';
        }
        break;
      }
      case 'client_funnel': {
        const total = (clientFunnelData?.newClientCount ?? 0) + (clientFunnelData?.returningClientCount ?? 0);
        metricValue = `${formatNumber(total)} clients`;
        metricLabel = `New and returning clients ${getPeriodLabel(filters.dateRange)}`;
        break;
      }
      case 'client_health': {
        if (clientHealthData) {
          const needAttention =
            (clientHealthData['at-risk']?.length ?? 0) +
            (clientHealthData['win-back']?.length ?? 0) +
            (clientHealthData['new-no-return']?.length ?? 0);
          metricValue = `${formatNumber(needAttention)} need attention`;
          metricLabel = '';
        } else {
          metricValue = '--';
          metricLabel = '';
        }
        break;
      }
      case 'goal_tracker': {
        metricValue = `${Math.round(goalOrgMetrics.percentage)}%`;
        const ps = goalOrgMetrics.paceStatus;
        metricLabel = ps === 'ahead' ? 'Ahead of target pace' : ps === 'behind' ? 'Falling behind target pace' : 'On track to hit goal';
        goalPaceIcon = ps === 'behind'
          ? <AlertTriangle className="w-3.5 h-3.5 text-warning-foreground shrink-0" />
          : <CheckCircle2 className="w-3.5 h-3.5 text-success-foreground shrink-0" />;
        break;
      }
      case 'week_ahead_forecast': {
        if (weekAheadLoading) {
          metricValue = '--';
          metricLabel = 'Loading forecast data';
        } else {
          metricValue = formatCurrencyWhole(weekAheadData?.totalRevenue ?? 0);
          metricLabel = 'Estimated booked service revenue for the next 7 days (excludes today)';
        }
        break;
      }
      case 'new_bookings': {
        const count = newBookingsQuery.data?.bookedInRange ?? 0;
        metricValue = `${formatNumber(count)} added`;
        metricLabel = `Appointments added to the schedule ${getPeriodLabel(filters.dateRange)}`;
        break;
      }
      case 'hiring_capacity': {
        metricValue = `${hiringCapacity.totalHiresNeeded} open`;
        metricLabel = 'Chairs available for new hires';
        break;
      }
      case 'staffing_trends': {
        const activeStaff = workload?.length ?? 0;
        metricValue = `${formatNumber(activeStaff)} active`;
        metricLabel = 'Currently active team members';
        break;
      }
      case 'stylist_workload': {
        const avgUtilWl = workload?.length
          ? Math.round(workload.reduce((s, w) => s + w.utilizationScore, 0) / workload.length)
          : 0;
        metricValue = `${avgUtilWl}%`;
        metricLabel = 'Average utilization across active staff';
        break;
      }
      case 'commission_summary':
      case 'staff_commission_breakdown':
      case 'true_profit':
      case 'staff_performance':
      case 'service_profitability':
      case 'control_tower':
      case 'predictive_inventory':
        metricValue = '--';
        metricLabel = 'View full card for details';
        break;
      default:
        metricValue = '--';
        metricLabel = '';
    }
    
    const visKey = cardId === 'operations_stats' ? 'operations_quick_stats' : cardId;
    const link = CARD_LINKS[cardId];
    const description = CARD_DESCRIPTIONS[cardId];
    
    return (
      <VisibilityGate elementKey={visKey}>
        <PinnableCard
          elementKey={visKey}
          elementName={meta.label}
          category="Command Center"
          dateRange={filters.dateRange}
          locationName={selectedLocationName}
        >
          <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5 relative')}>
            {description && <MetricInfoTooltip description={description} className={tokens.kpi.infoIcon} />}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className={cn(tokens.kpi.label, 'flex-1')}>{meta.label}</span>
            </div>
            <div className="mt-4 flex-1">
              <BlurredAmount className="font-display text-2xl font-medium">{metricValue}</BlurredAmount>
              {metricLabel && (
                <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                  {goalPaceIcon}
                  {metricLabel}
                </p>
              )}
              {metricSubtext && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-sans">
                  {metricSubtext}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/40 min-h-[28px]">
              {TIME_INDEPENDENT_CARDS.has(cardId) && filters.dateRange !== 'today' ? (
                <span className="text-[10px] italic text-muted-foreground/50">
                  Time filter n/a
                </span>
              ) : <span />}
              {link && (
                <Link 
                  to={link.href} 
                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  View {link.label} <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </Card>
        </PinnableCard>
      </VisibilityGate>
    );
  }
  
  switch (cardId) {
    case 'executive_summary':
      return (
        <VisibilityGate elementKey="executive_summary">
          <PinnableCard elementKey="executive_summary" elementName="Executive Summary" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ExecutiveSummaryCard
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'operational_health':
      return (
        <VisibilityGate elementKey="operational_health">
          <PinnableCard elementKey="operational_health" elementName="Operational Health" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <OperationalHealthCard
              filterContext={filterContext}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={filters.locationId}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'operations_stats':
      return (
        <VisibilityGate 
          elementKey="operations_quick_stats"
          elementName="Operations Quick Stats"
          elementCategory="operations"
        >
          <PinnableCard elementKey="operations_quick_stats" elementName="Operations Quick Stats" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <OperationsQuickStats locationId={locationFilter} filterContext={filterContext} />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'sales_overview':
      return (
        <VisibilityGate elementKey="sales_overview">
          <PinnableCard elementKey="sales_overview" elementName="Sales Overview" category="Command Center"
            metricData={{
              "Total Revenue": salesData?.totalRevenue || 0,
              "Service Revenue": salesData?.serviceRevenue || 0,
              "Product Revenue": salesData?.productRevenue || 0,
              "Average Ticket": salesData?.averageTicket || 0,
            }}
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          >
            <AggregateSalesCard 
              externalDateRange={mapToSalesDateRange(filters.dateRange)}
              externalDateFilters={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
              hideInternalFilter={true}
              filterContext={filterContext}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'top_performers':
      return (
        <VisibilityGate elementKey="top_performers">
          <PinnableCard elementKey="top_performers" elementName="Top Performers" category="Command Center"
            metricData={performersForCard.slice(0, 5).reduce((acc, p, i) => {
              acc[`#${i + 1} ${p.name}`] = p.totalRevenue;
              return acc;
            }, {} as Record<string, string | number>)}
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          >
            <TopPerformersCard 
              performers={performersForCard} 
              isLoading={isLoadingPerformers}
              filterContext={filterContext}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'locations_rollup':
      return (
        <VisibilityGate elementKey="locations_rollup">
          <EnforcementGateBanner gateKey="gate_margin_baselines">
            <PinnableCard elementKey="locations_rollup" elementName="Locations Rollup" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
              <LocationsRollupCard filterContext={filterContext} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
            </PinnableCard>
          </EnforcementGateBanner>
        </VisibilityGate>
      );
    case 'service_mix':
      return (
        <VisibilityGate elementKey="service_mix">
          <PinnableCard elementKey="service_mix" elementName="Service Mix" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ServiceMixCard
              filterContext={filterContext}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={filters.locationId}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'retail_effectiveness':
      return (
        <VisibilityGate elementKey="retail_effectiveness">
          <PinnableCard elementKey="retail_effectiveness" elementName="Retail Effectiveness" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <RetailEffectivenessCard
              filterContext={filterContext}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={filters.locationId}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'rebooking':
      return (
        <VisibilityGate elementKey="rebooking">
          <PinnableCard elementKey="rebooking" elementName="Rebooking Rate" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <RebookingCard
              filterContext={filterContext}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={filters.locationId}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'revenue_breakdown':
      return (
        <VisibilityGate elementKey="revenue_breakdown">
          <PinnableCard elementKey="revenue_breakdown" elementName="Revenue Breakdown" category="Command Center"
            metricData={{
              "Service Revenue": salesData?.serviceRevenue || 0,
              "Product Revenue": salesData?.productRevenue || 0,
            }}
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          >
            <RevenueDonutChart 
              serviceRevenue={salesData?.serviceRevenue || 0}
              productRevenue={salesData?.productRevenue || 0}
              filterContext={filterContext}
              retailAttachmentRate={attachmentData?.attachmentRate}
              retailAttachmentLoading={isLoadingAttachment}
              retailBreakdown={retailBreakdown ? {
                productOnlyRevenue: retailBreakdown.productRevenue,
                extensionRevenue: retailBreakdown.extensionRevenue,
                merchRevenue: retailBreakdown.merchRevenue,
                giftCardRevenue: retailBreakdown.giftCardRevenue,
              } : undefined}
            />
        </VisibilityGate>
      );
    case 'client_health':
      return (
        <VisibilityGate elementKey="client_health">
          <PinnableCard elementKey="client_health" elementName="Client Health" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ClientHealthSummaryCard />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'daily_brief':
      return (
        <VisibilityGate elementKey="daily_brief">
          <PinnableCard elementKey="daily_brief" elementName="Appointments Summary" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <DailyBriefCard filterContext={filterContext} locationId={filters.locationId} />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'client_funnel':
      return (
        <VisibilityGate elementKey="client_funnel">
          <PinnableCard elementKey="client_funnel" elementName="Client Funnel" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ClientFunnelCard 
              dateFrom={filters.dateFrom} 
              dateTo={filters.dateTo}
              filterContext={filterContext}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'goal_tracker':
      return (
        <VisibilityGate elementKey="goal_tracker">
          <GoalTrackerCard />
        </VisibilityGate>
      );
    case 'new_bookings':
      return (
        <VisibilityGate elementKey="new_bookings">
          <PinnableCard elementKey="new_bookings" elementName="New Bookings" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <NewBookingsCard filterContext={filterContext} />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'week_ahead_forecast':
      return (
        <VisibilityGate elementKey="week_ahead_forecast">
          <PinnableCard elementKey="week_ahead_forecast" elementName="Week Ahead Forecast" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ForecastingCard />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'capacity_utilization':
      return (
        <VisibilityGate elementKey="capacity_utilization">
          <PinnableCard elementKey="capacity_utilization" elementName="Capacity Utilization" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <CapacityUtilizationCard />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'hiring_capacity':
      return (
        <VisibilityGate elementKey="hiring_capacity">
          <PinnableCard elementKey="hiring_capacity" elementName="Hiring Capacity" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <HiringCapacityCard />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'staffing_trends':
      return (
        <VisibilityGate elementKey="staffing_trends">
          <PinnableCard elementKey="staffing_trends" elementName="Staffing Trends" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <StaffingTrendChart />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'stylist_workload':
      return (
        <VisibilityGate elementKey="stylist_workload">
          <PinnableCard elementKey="stylist_workload" elementName="Stylist Workload" category="Command Center"
            metricData={workload?.slice(0, 5).reduce((acc, w) => {
              acc[`${w.name} Utilization`] = `${w.utilizationScore}%`;
              acc[`${w.name} Appointments`] = w.appointmentCount;
              return acc;
            }, {} as Record<string, string | number>)}
            dateRange={filters.dateRange}
            locationName={selectedLocationName}
          >
            <StylistWorkloadCard 
              workload={workload || []} 
              isLoading={isLoadingWorkload} 
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'commission_summary':
      return (
        <VisibilityGate elementKey="commission_summary">
          <PinnableCard elementKey="commission_summary" elementName="Commission Summary" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <CommissionSummaryCard
              stylistData={performers}
              isLoading={isLoadingPerformers}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'staff_commission_breakdown':
      return (
        <VisibilityGate elementKey="staff_commission_breakdown">
          <PinnableCard elementKey="staff_commission_breakdown" elementName="Staff Commission Breakdown" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <StaffCommissionTable
              stylistData={performers}
              isLoading={isLoadingPerformers}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'true_profit':
      return (
        <VisibilityGate elementKey="true_profit">
          <PinnableCard elementKey="true_profit" elementName="True Profit" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <TrueProfitCard
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={locationFilter}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'staff_performance':
      return (
        <VisibilityGate elementKey="staff_performance">
          <PinnableCard elementKey="staff_performance" elementName="Staff Performance" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <StaffPerformanceReport
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={locationFilter}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'service_profitability':
      return (
        <VisibilityGate elementKey="service_profitability">
          <PinnableCard elementKey="service_profitability" elementName="Service Profitability" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ServiceProfitabilityCard
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={locationFilter}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'control_tower':
      return (
        <VisibilityGate elementKey="control_tower">
          <PinnableCard elementKey="control_tower" elementName="Control Tower" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ColorBarControlTower locationId={locationFilter} />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'predictive_inventory':
      return (
        <VisibilityGate elementKey="predictive_inventory">
          <PinnableCard elementKey="predictive_inventory" elementName="Predictive Inventory" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <PredictiveColorBarSummary locationId={locationFilter} />
          </PinnableCard>
        </VisibilityGate>
      );
    case 'client_experience_staff':
      return (
        <VisibilityGate elementKey="client_experience_staff">
          <PinnableCard elementKey="client_experience_staff" elementName="Client Experience" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <ClientExperienceCard
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              locationId={locationFilter}
              filterContext={filterContext}
            />
          </PinnableCard>
        </VisibilityGate>
      );
    default:
      return null;
  }
}
