import { useMemo, useState } from 'react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { format, startOfMonth, endOfMonth, subDays, startOfWeek } from 'date-fns';
// VisibilityGate intentionally NOT imported here. PinnedAnalyticsCard is only
// rendered when the user has explicitly pinned a card via Customize; re-gating
// it on per-role visibility silently betrays user intent (the contract: a
// pinned card MUST render). The role-level visibility table still gates the
// underlying Analytics Hub tabs and the Customize menu's "Available cards"
// list — those are the correct enforcement points. Local pass-through shims
// keep the existing JSX structure intact without re-introducing the gate.
import * as React from 'react';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';
const VisibilityGate = ({ children }: {
  elementKey?: string;
  elementName?: string;
  elementCategory?: string;
  children: React.ReactNode;
}) => <>{children}</>;
const useElementVisibility = (_elementKey: string): boolean => true;
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { Card } from '@/components/ui/card';
import { AggregateSalesCard, DateRange as SalesDateRange } from '@/components/dashboard/AggregateSalesCard';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Clock, BarChart3, Heart,
  Activity, MapPin, Scissors, ShoppingBag, CalendarCheck,
  Target, Gauge, FileText, Sparkles, Briefcase, UserPlus,
  LineChart, BarChart2, ChevronRight, CheckCircle2, AlertTriangle,
  Beaker, Award, FlaskConical, Package, GraduationCap, Minus,
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

import { ClientFunnelCard } from '@/components/dashboard/sales/ClientFunnelCard';

import { GoalTrackerCard } from '@/components/dashboard/sales/GoalTrackerCard';
import { HiringCapacityCard } from '@/components/dashboard/HiringCapacityCard';
import { LevelProgressKpiCard } from '@/components/dashboard/LevelProgressNudge';
import { StaffingTrendChart } from '@/components/dashboard/StaffingTrendChart';
import { StylistWorkloadCard } from '@/components/dashboard/StylistWorkloadCard';
import { OperationsQuickStats } from '@/components/dashboard/operations/OperationsQuickStats';
import { ExecutiveSummaryCard } from '@/components/dashboard/analytics/ExecutiveSummaryCard';
import { ClientHealthSummaryCard } from '@/components/dashboard/client-health/ClientHealthSummaryCard';
import { DailyBriefCard } from '@/components/dashboard/analytics/DailyBriefCard';
import { OperationalHealthCard } from '@/components/dashboard/analytics/OperationalHealthCard';
import { LocationsStatusCard } from '@/components/dashboard/analytics/LocationsStatusCard';
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
import { useSalesMetrics, useSalesByStylist, useServiceMix, useSalesTrend } from '@/hooks/useSalesData';
import { Sparkline } from '@/components/ui/Sparkline';
import { CARD_QUESTIONS } from '@/components/dashboard/analytics/cardQuestions';
import { useTodayActualRevenue } from '@/hooks/useTodayActualRevenue';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { useRetailBreakdown } from '@/hooks/useRetailBreakdown';
import { useStaffUtilization } from '@/hooks/useStaffUtilization';
import { useLocations, isClosedOnDate } from '@/hooks/useLocations';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import type { FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useClientFunnel } from '@/hooks/useSalesAnalytics';
import { useClientHealthSegments } from '@/hooks/useClientHealthSegments';
import { useNewBookings } from '@/hooks/useNewBookings';
import { useHiringCapacity } from '@/hooks/useHiringCapacity';
import { useTeamLevelProgress } from '@/hooks/useTeamLevelProgress';
import { useGoalTrackerData } from '@/hooks/useGoalTrackerData';
import { useWeekAheadRevenue } from '@/hooks/useWeekAheadRevenue';
import { getNextPayDay, type PayScheduleSettings } from '@/hooks/usePaySchedule';

export type DateRangeType = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek' | 'thisMonth' | 'todayToEom' | 'todayToPayday' | 'lastMonth';

// ── Executive Summary materiality thresholds ────────────────────────────
// Doctrine: "if confidence is low, suppress recommendations." A delta on
// trivial absolute volume is noise dressed as signal — see CARD_QUESTIONS
// for why this card answers "are we trending?" not "what's the total?"
//
// The volume floor and flat-delta width are persona-tier-aware — resolved
// at render time via useMaterialityThresholds() so a $500 floor that's
// correct for an owner doesn't suppress every signal for a solo stylist
// on $200 days. See src/hooks/useMaterialityThresholds.ts.
const EXEC_SUMMARY_TREND_DAYS = 14;       // trailing window for sparkline

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
  locations_rollup: { icon: MapPin, label: 'Locations Status' },
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
  level_progress_kpi: { icon: GraduationCap, label: 'Level Progress' },
};

// Tooltip descriptions for compact bento tiles — extracted to a sibling
// registry so the Customize menu hover preview can layer them under the
// canonical CARD_QUESTIONS doctrine line. See src/__tests__/card-questions-uniqueness.test.ts
// for coverage enforcement.
import { CARD_DESCRIPTIONS } from './analytics/cardDescriptions';

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
  level_progress_kpi: { label: 'Team Progress', href: '/dashboard/admin/team-directory' },
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

  // Prior comparable period — same window length, immediately preceding the current range.
  // Used by Executive Summary to express revenue as a delta vs noise.
  const priorPeriodRange = useMemo(() => {
    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
    }
    const ms = to.getTime() - from.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const priorTo = new Date(from.getTime() - oneDay);
    const priorFrom = new Date(priorTo.getTime() - ms);
    return {
      dateFrom: format(priorFrom, 'yyyy-MM-dd'),
      dateTo: format(priorTo, 'yyyy-MM-dd'),
    };
  }, [filters.dateFrom, filters.dateTo]);
  const { data: priorSalesData } = useSalesMetrics({
    dateFrom: priorPeriodRange.dateFrom,
    dateTo: priorPeriodRange.dateTo,
    locationId: locationFilter,
  });

  // Trailing-N-day revenue series for the Executive Summary sparkline.
  // Independent of `filters.dateRange` — a "today" filter would otherwise
  // collapse to a single point. Only fetched when the card is pinned.
  const trendRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (EXEC_SUMMARY_TREND_DAYS - 1));
    return {
      dateFrom: format(start, 'yyyy-MM-dd'),
      dateTo: format(end, 'yyyy-MM-dd'),
    };
  }, []);
  const { data: salesTrendData } = useSalesTrend(
    trendRange.dateFrom,
    trendRange.dateTo,
    locationFilter,
  );
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
  const { counts: levelCounts } = useTeamLevelProgress();
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
  // Parent-tab gate intentionally removed — see header comment. Pinned cards
  // are user-opt-in and must render. `parentTabVisible` is left in place as a
  // shimmed no-op so future signals can re-attach without restructuring JSX.
  void parentTabVisible;

  // ── Compact (simple) view ──────────────────────────────────────
  if (compact) {
    // Filter out unknown card IDs gracefully
    if (!CARD_META[cardId]) {
      reportVisibilitySuppression('pinned-analytics-card', 'unknown-card-id', { cardId });
      return null;
    }
    // Dev-only soft assert: every renderable card must have a canonical
    // question registered. Enforces non-redundancy at author time without
    // breaking production rendering.
    if (import.meta.env.DEV && !(cardId in CARD_QUESTIONS)) {
      reportVisibilitySuppression('pinned-analytics-card', 'card-missing-question', { cardId });
    }
    
    const meta = CARD_META[cardId];
    const Icon = meta.icon;
    
    // Extract primary metric per card
    let metricValue = '';
    let metricLabel = '';
    let metricSubtext = '';
    let goalPaceIcon: React.ReactNode = null;
    // Tone class for the optional Executive Summary sparkline. Set inside
    // the executive_summary case so the sparkline below inherits the same
    // emerald / rose / muted color as the delta indicator.
    let execSparklineTone: string | null = null;
    let execSparklineSuppressed = false;

    // Smart compact currency for simple-view tiles:
    // - values >= $1,000 collapse to compact form ($20.3K, $1.2M) to prevent overflow
    // - smaller values render with full precision so $842 stays exact
    const formatCurrencySmart = (amount: number) =>
      Math.abs(amount) >= 1000 ? formatCurrencyCompact(amount) : formatCurrencyWhole(amount);

    switch (cardId) {
      case 'executive_summary': {
        // Differentiated lens: revenue *vs prior comparable period*, not the raw total.
        // (Sales Overview owns the raw $ clock; this surface answers "are we trending?")
        // Materiality gate: a delta on trivial volume is noise dressed as signal.
        const current = salesData?.totalRevenue ?? 0;
        const prior = priorSalesData?.totalRevenue ?? 0;

        const belowVolumeThreshold =
          current < EXEC_SUMMARY_MIN_VOLUME_USD || prior < EXEC_SUMMARY_MIN_VOLUME_USD;

        if (prior > 0 && current > 0 && !belowVolumeThreshold) {
          const deltaPct = ((current - prior) / prior) * 100;
          const isFlat = Math.abs(deltaPct) < EXEC_SUMMARY_FLAT_DELTA_PCT;
          if (isFlat) {
            metricValue = 'Flat';
            goalPaceIcon = <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />;
            metricLabel = `${formatCurrencySmart(current)} vs ${formatCurrencySmart(prior)} prior period`;
            execSparklineTone = 'text-muted-foreground';
          } else {
            const sign = deltaPct > 0 ? '+' : '';
            metricValue = `${sign}${deltaPct.toFixed(1)}%`;
            const TrendIcon = deltaPct > 0 ? TrendingUp : TrendingDown;
            const trendTone = deltaPct > 0 ? 'text-emerald-500' : 'text-rose-500';
            goalPaceIcon = <TrendIcon className={cn('h-4 w-4', trendTone)} aria-hidden />;
            metricLabel = `${formatCurrencySmart(current)} vs ${formatCurrencySmart(prior)} prior period`;
            execSparklineTone = trendTone;
          }
        } else if (belowVolumeThreshold && (current > 0 || prior > 0)) {
          // Suppress comparison — not enough volume to be meaningful.
          metricValue = formatCurrencySmart(current);
          metricLabel = `Volume below comparison threshold for ${getPeriodLabel(filters.dateRange)}`;
          execSparklineSuppressed = true;
        } else if (current > 0) {
          // No prior baseline (new org / first period) — show the total, call out the gap.
          metricValue = formatCurrencySmart(current);
          metricLabel = 'No prior period to compare against yet';
          execSparklineSuppressed = true;
        } else {
          metricValue = '--';
          metricLabel = `No revenue recorded for ${getPeriodLabel(filters.dateRange)}`;
          execSparklineSuppressed = true;
        }
        break;
      }
      case 'sales_overview':
        // Custom render below — leave metricValue/metricLabel empty so we use the dedicated layout.
        metricValue = '';
        metricLabel = '';
        break;
      case 'daily_brief': {
        // Differentiated lens: today's *operational* pulse, not just revenue
        const waiting = queueData?.stats.waitingCount ?? 0;
        const inService = queueData?.stats.inServiceCount ?? 0;
        const completed = queueData?.stats.completedCount ?? 0;
        const totalToday = waiting + inService + completed;
        const revenueToday = salesData?.totalRevenue ?? 0;
        if (totalToday > 0 || revenueToday > 0) {
          metricValue = `${totalToday} appt${totalToday === 1 ? '' : 's'}`;
          const parts: string[] = [];
          if (waiting > 0) parts.push(`${waiting} waiting`);
          if (inService > 0) parts.push(`${inService} in service`);
          if (revenueToday > 0) parts.push(`${formatCurrencySmart(revenueToday)} earned`);
          metricLabel = parts.length > 0 ? parts.join(' · ') : `Activity ${getPeriodLabel(filters.dateRange)}`;
        } else {
          metricValue = '--';
          metricLabel = `No activity ${getPeriodLabel(filters.dateRange)} yet`;
        }
        break;
      }
      case 'top_performers': {
        const top = performersForCard[0];
        if (top) {
          metricValue = `${top.name.split(' ')[0]} · ${formatCurrencySmart(top.totalRevenue)}`;
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
      case 'revenue_breakdown': {
        // Differentiated lens: revenue *mix*, not the totals (Sales Overview owns totals)
        const service = salesData?.serviceRevenue ?? 0;
        const product = salesData?.productRevenue ?? 0;
        const total = service + product;
        if (total > 0) {
          const servicePct = Math.round((service / total) * 100);
          const retailPct = 100 - servicePct;
          const dominant = servicePct >= retailPct ? `${servicePct}% Service` : `${retailPct}% Retail`;
          metricValue = dominant;
          metricLabel = `Service ${formatCurrencySmart(service)} · Retail ${formatCurrencySmart(product)}`;
        } else {
          metricValue = '--';
          metricLabel = `No revenue mix to report for ${getPeriodLabel(filters.dateRange)}`;
        }
        break;
      }
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
        const accessibleIds = new Set((accessibleLocations ?? []).map((l) => l.id));
        const visible = (locations ?? []).filter((l) => accessibleIds.has(l.id));
        if (visible.length < 2) {
          // Materiality gate — single-location orgs get no surface here.
          metricValue = '';
          metricLabel = '';
          break;
        }
        const now = new Date();
        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const CLOSING_SOON_THRESHOLD_MINUTES = 30;
        const OPENS_SOON_THRESHOLD_MINUTES = 30;
        let openCount = 0;
        let closingSoonCount = 0;
        let opensSoonCount = 0;
        for (const loc of visible) {
          const closure = isClosedOnDate(loc.hours_json, loc.holiday_closures, now);
          if (closure.isClosed) continue;
          const dh = loc.hours_json?.[dayKeys[now.getDay()]];
          if (!dh?.open || !dh?.close || dh.closed) continue;
          const [oH, oM] = dh.open.split(':').map(Number);
          const [cH, cM] = dh.close.split(':').map(Number);
          if ([oH, oM, cH, cM].some(Number.isNaN)) continue;
          const openMin = oH * 60 + oM;
          const closeMin = cH * 60 + cM;
          if (nowMin >= openMin && nowMin < closeMin) {
            openCount += 1;
            const remaining = closeMin - nowMin;
            if (remaining > 0 && remaining <= CLOSING_SOON_THRESHOLD_MINUTES) {
              closingSoonCount += 1;
            }
          } else if (nowMin < openMin) {
            const untilOpen = openMin - nowMin;
            if (untilOpen > 0 && untilOpen <= OPENS_SOON_THRESHOLD_MINUTES) {
              opensSoonCount += 1;
            }
          }
        }
        metricValue = `${openCount} of ${visible.length}`;
        const labelExtras = [
          closingSoonCount > 0 ? `${closingSoonCount} ${closingSoonCount === 1 ? 'closes' : 'close'} soon` : null,
          opensSoonCount > 0 ? `${opensSoonCount} ${opensSoonCount === 1 ? 'opens' : 'open'} soon` : null,
        ].filter(Boolean);
        metricLabel = labelExtras.length > 0
          ? `Open right now · ${labelExtras.join(' · ')}`
          : 'Open right now';
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
          metricValue = formatCurrencySmart(weekAheadData?.totalRevenue ?? 0);
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
      case 'level_progress_kpi': {
        const total = levelCounts?.total ?? 0;
        if (total === 0) {
          // Visibility-contract canon: silence when no team to evaluate
          reportVisibilitySuppression('pinned-analytics-card', 'no-team-data', { cardId });
          return null;
        }
        const needsReview = levelCounts?.belowStandard ?? 0;
        const ready = levelCounts?.ready ?? 0;
        const atRisk = levelCounts?.atRisk ?? 0;
        const onPace = levelCounts?.inProgress ?? 0;
        if (needsReview > 0) {
          metricValue = `${needsReview} need review`;
          goalPaceIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
        } else if (ready > 0) {
          metricValue = `${ready} ready to level up`;
          goalPaceIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
        } else if (atRisk > 0) {
          metricValue = `${atRisk} at risk`;
          goalPaceIcon = <AlertTriangle className="w-3.5 h-3.5 text-warning-foreground shrink-0" />;
        } else {
          metricValue = `${onPace} on pace`;
        }
        metricLabel = `${total} stylist${total === 1 ? '' : 's'} tracked`;
        break;
      }
      default:
        metricValue = '--';
        metricLabel = '';
    }
    
    const visKey = cardId === 'operations_stats' ? 'operations_quick_stats' : cardId;
    const link = CARD_LINKS[cardId];
    const description = CARD_DESCRIPTIONS[cardId];

    // ── Sales Overview: closed-day detection + 3-row payload ──
    let salesOverviewView:
      | { kind: 'closed'; message: string }
      | { kind: 'metrics'; current: string; expected: string | null; attach: string }
      | null = null;

    if (cardId === 'sales_overview') {
      // Closed-day check is today-only by design
      const evaluateClosure = (): { message: string } | null => {
        if (!isToday) return null;
        if (!locations || locations.length === 0) return null; // wait for data — don't flash "Closed"
        const today = new Date();

        if (filters.locationId !== 'all') {
          const loc = locations.find(l => l.id === filters.locationId);
          if (!loc) return null;
          const closure = isClosedOnDate(loc.hours_json, loc.holiday_closures, today);
          if (!closure.isClosed) return null;
          const reason = closure.reason && closure.reason !== 'Regular hours' ? closure.reason : 'No Sales';
          return { message: `${loc.name} Closed — ${reason}` };
        }

        // All-locations rollup: only show closed when EVERY accessible location is closed today
        const accessIds = new Set((accessibleLocations ?? []).map(l => l.id));
        const scope = accessIds.size > 0
          ? locations.filter(l => accessIds.has(l.id))
          : locations.filter(l => l.is_active);
        if (scope.length === 0) return null;

        const closures = scope.map(l => isClosedOnDate(l.hours_json, l.holiday_closures, today));
        const allClosed = closures.every(c => c.isClosed);
        if (!allClosed) return null;

        const holidayReasons = closures
          .map(c => c.reason)
          .filter((r): r is string => !!r && r !== 'Regular hours');
        const sharedHoliday = holidayReasons.length === scope.length
          && holidayReasons.every(r => r === holidayReasons[0])
          ? holidayReasons[0]
          : null;
        return { message: sharedHoliday ? `Locations Closed — ${sharedHoliday}` : 'Locations Closed' };
      };

      const closure = evaluateClosure();
      if (closure) {
        salesOverviewView = { kind: 'closed', message: closure.message };
      } else {
        const expectedRevenue = salesData?.totalRevenue ?? 0;
        const currentRevenue = isToday && todayActualData?.hasActualData
          ? todayActualData.actualRevenue
          : expectedRevenue;
        const showExpected = isToday; // Only meaningful when "today" — otherwise == current
        const attach = attachmentData ? formatPercent(attachmentData.attachmentRate) : '--';

        salesOverviewView = {
          kind: 'metrics',
          current: formatCurrencySmart(currentRevenue),
          expected: showExpected ? formatCurrencySmart(expectedRevenue) : null,
          attach,
        };
      }
    }

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
              {salesOverviewView ? (
                salesOverviewView.kind === 'closed' ? (
                  <p className="text-sm text-muted-foreground mt-1">{salesOverviewView.message}</p>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-sans">
                        Current Sales
                      </span>
                      <BlurredAmount className="font-display text-xl font-medium truncate">
                        {salesOverviewView.current}
                      </BlurredAmount>
                    </div>
                    {salesOverviewView.expected && (
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-sans">
                          Expected Sales
                        </span>
                        <BlurredAmount className="text-sm text-muted-foreground truncate">
                          {salesOverviewView.expected}
                        </BlurredAmount>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-sans">
                        Retail Attach
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {salesOverviewView.attach}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <BlurredAmount className="font-display text-2xl font-medium truncate block">{metricValue}</BlurredAmount>
                  {metricLabel && (
                    <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                      {goalPaceIcon}
                      {metricLabel}
                    </p>
                  )}
                  {cardId === 'executive_summary' && !execSparklineSuppressed && (() => {
                    const series = (salesTrendData?.overall ?? [])
                      .map((d: any) => Number(d.revenue) || 0);
                    if (series.length < 3) return null;
                    return (
                      <Sparkline
                        data={series}
                        height={20}
                        className={cn('mt-1.5 block', execSparklineTone ?? 'text-muted-foreground')}
                        ariaLabel={`Trailing ${EXEC_SUMMARY_TREND_DAYS}-day revenue trend`}
                      />
                    );
                  })()}
                  {metricSubtext && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-sans">
                      {metricSubtext}
                    </p>
                  )}
                </>
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
          <PinnableCard elementKey="locations_rollup" elementName="Locations Status" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <LocationsStatusCard filterContext={filterContext} />
          </PinnableCard>
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
          </PinnableCard>
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
    case 'level_progress_kpi':
      return (
        <VisibilityGate elementKey="level_progress_kpi">
          <PinnableCard elementKey="level_progress_kpi" elementName="Level Progress" category="Command Center" dateRange={filters.dateRange} locationName={selectedLocationName}>
            <LevelProgressKpiCard />
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
