import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { LastSyncIndicator } from '@/components/dashboard/sales/LastSyncIndicator';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount, useHideNumbers } from '@/contexts/HideNumbersContext';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { 
  DollarSign, 
  Scissors, 
  ShoppingBag, 
  Receipt,
  CreditCard,
  MapPin,
  Building2,
  Download,
  Info,
  ChevronRight,
  ChevronDown,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  Moon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { useSalesMetrics, useSalesByStylist, useSalesByLocation, useSalesTrend } from '@/hooks/useSalesData';
import { useLiveSessionSnapshot } from '@/hooks/useLiveSessionSnapshot';
import { useTipsDrilldown } from '@/hooks/useTipsDrilldown';
import { useActiveLocations, isClosedOnDate, getLocationHoursForDate } from '@/hooks/useLocations';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { useTomorrowRevenue } from '@/hooks/useTomorrowRevenue';
import { useSalesComparison } from '@/hooks/useSalesComparison';
import { useTodayActualRevenue } from '@/hooks/useTodayActualRevenue';
import { useActualRevenue } from '@/hooks/useActualRevenue';
import { useRetailBreakdown } from '@/hooks/useRetailBreakdown';
import { useRevenueGapAnalysis, useScheduledRevenue } from '@/hooks/useRevenueGapAnalysis';
import { useAdjustedExpectedRevenue } from '@/hooks/useAdjustedExpectedRevenue';
import { RevenueGapDrilldown } from './sales/RevenueGapDrilldown';
import { useRetailAttachmentRate } from '@/hooks/useRetailAttachmentRate';
import { useSalesGoals } from '@/hooks/useSalesGoals';
import { useGoalPeriodRevenue } from '@/hooks/useGoalPeriodRevenue';
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Package, Shirt, Gem as GemIcon, Gift } from 'lucide-react';

import { ServiceProductDrilldown } from './ServiceProductDrilldown';
import { RetailCategoryDrilldown } from './RetailCategoryDrilldown';
import { useRevenueByCategoryDrilldown } from '@/hooks/useRevenueByCategoryDrilldown';
import { LocationMetricDrilldownSheet, type LocationDrilldownType } from './LocationMetricDrilldownSheet';
import { TipsDrilldownPanel } from './sales/TipsDrilldownPanel';
import { TransactionsByHourPanel } from './sales/TransactionsByHourPanel';
import { TicketDistributionPanel } from './sales/TicketDistributionPanel';
import { RevPerHourByStylistPanel } from './sales/RevPerHourByStylistPanel';
import { useNavigate } from 'react-router-dom';
import { GoalLocationsDrilldown } from './sales/GoalLocationsDrilldown';
import { RevenueByCategoryPanel } from './sales/RevenueByCategoryPanel';
import { AvgTicketByStylistPanel } from './sales/AvgTicketByStylistPanel';
import { ClientTypeSplitPanel } from './sales/ClientTypeSplitPanel';

// Sub-components
import { SalesTrendIndicator } from './sales/SalesTrendIndicator';
import { TrendSparkline } from './TrendSparkline';
import { TopPerformersCard } from './sales/TopPerformersCard';
import { RevenueDonutChart } from './sales/RevenueDonutChart';

import { SalesGoalProgress } from './sales/SalesGoalProgress';

import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { Progress } from '@/components/ui/progress';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useRevenueDisplay } from '@/contexts/RevenueDisplayContext';
import { useTranslation } from 'react-i18next';

export type DateRange = 'today' | 'yesterday' | '7d' | '30d' | 'thisWeek' | 'mtd' | 'todayToEom' | 'lastMonth' | 'ytd' | 'lastYear' | 'last365';

/** Wrapper that fetches goal-period revenue independently of the dashboard filter */
function GoalProgressWithOwnRevenue({ goalPeriod, locationId, target, label, hoursJson, holidayClosures, onClick, isExpanded }: {
  goalPeriod: 'weekly' | 'monthly';
  locationId?: string;
  target: number;
  label: string;
  hoursJson?: any;
  holidayClosures?: any;
  onClick?: () => void;
  isExpanded?: boolean;
}) {
  const { data: goalRevenue = 0 } = useGoalPeriodRevenue(goalPeriod, locationId);
  return (
    <SalesGoalProgress
      current={goalRevenue}
      target={target}
      label={label}
      goalPeriod={goalPeriod}
      hoursJson={hoursJson}
      holidayClosures={holidayClosures}
      onClick={onClick}
      isExpanded={isExpanded}
    />
  );
}

/** Format HH:MM:SS to 12-hour time like "7:45 PM" */
function formatEndTime(time: string): string {
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

interface AggregateSalesCardProps {
  // When provided, use these instead of internal state
  externalDateRange?: DateRange;
  externalDateFilters?: { dateFrom: string; dateTo: string };
  // Hide the internal date selector when using external filters
  hideInternalFilter?: boolean;
  // Optional filter context for pinned card display
  filterContext?: {
    locationId: string;
    dateRange: string;
  };
}

export function AggregateSalesCard({ 
  externalDateRange,
  externalDateFilters,
  hideInternalFilter = false,
  filterContext,
}: AggregateSalesCardProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const [internalDateRange, setInternalDateRange] = useState<DateRange>('today');
  const [drilldownMode, setDrilldownMode] = useState<'services' | 'products' | null>(null);
  const [locationDrilldownTarget, setLocationDrilldownTarget] = useState<string | null>(null);
  const [locationDrilldown, setLocationDrilldown] = useState<{ type: LocationDrilldownType; locationId: string; locationName: string } | null>(null);
  const [tipsDrilldownOpen, setTipsDrilldownOpen] = useState(false);
  const [tipsCardExpanded, setTipsCardExpanded] = useState(false);
  const [activeDrilldown, setActiveDrilldown] = useState<'revenue' | 'transactions' | 'avgTicket' | 'revPerHour' | 'goals' | 'expectedGap' | null>(null);
  const [todaySummaryExpanded, setTodaySummaryExpanded] = useState(false);
  const { hideNumbers } = useHideNumbers();
  const { formatCurrency, formatCurrencyWhole, currency } = useFormatCurrency();
  const { taxLabel } = useRevenueDisplay();
  const [retailExpanded, setRetailExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [retailCategoryDrilldown, setRetailCategoryDrilldown] = useState<'Products' | 'Merch' | 'Gift Cards' | 'Extensions' | null>(null);


  // Toggle a secondary KPI drilldown with mutual exclusivity
  const toggleDrilldown = (panel: 'revenue' | 'transactions' | 'avgTicket' | 'revPerHour' | 'goals' | 'expectedGap') => {
    setActiveDrilldown(prev => prev === panel ? null : panel);
    setTipsDrilldownOpen(false); // Close tips when opening another
  };

  const handleTipsToggle = () => {
    setTipsDrilldownOpen(prev => !prev);
    setActiveDrilldown(null); // Close others when opening tips
  };

  const handleTipsCardToggle = () => {
    setTipsCardExpanded(prev => {
      if (prev) {
        setTipsDrilldownOpen(false);
      }
      return !prev;
    });
  };

  const handleLocationMetricClick = (
    e: React.MouseEvent,
    type: LocationDrilldownType,
    location: { location_id?: string | null; name: string }
  ) => {
    e.stopPropagation();
    const locId = location.location_id;
    if (!locId) return;
    if (type === 'services' || type === 'products') {
      setDrilldownMode(type);
      setLocationDrilldownTarget(locId);
    } else {
      setLocationDrilldown({ type, locationId: locId, locationName: location.name });
    }
  };

  // Location table sorting
  type LocationSortField = 'name' | 'totalRevenue' | 'serviceRevenue' | 'productRevenue' | 'totalTransactions' | 'avgTicket';
  type SortDirection = 'asc' | 'desc';
  const [locationSortField, setLocationSortField] = useState<LocationSortField>('totalRevenue');
  const [locationSortDirection, setLocationSortDirection] = useState<SortDirection>('desc');

  // Collapsible locations + region filter
  const [locationsExpanded, setLocationsExpanded] = useState(false);
  const [regionFilter, setRegionFilter] = useState('all');
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  // Use external if provided, otherwise internal
  const dateRange = externalDateRange ?? internalDateRange;

  const dateFilters = externalDateFilters ?? (() => {
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
          dateTo: format(now, 'yyyy-MM-dd') 
        };
      case 'mtd':
        return { 
          dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), 
          dateTo: format(now, 'yyyy-MM-dd') 
        };
      case 'todayToEom':
        return { 
          dateFrom: format(now, 'yyyy-MM-dd'), 
          dateTo: format(endOfMonth(now), 'yyyy-MM-dd') 
        };
      case 'lastMonth': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          dateFrom: format(lm, 'yyyy-MM-dd'),
          dateTo: format(lmEnd, 'yyyy-MM-dd'),
        };
      }
      case 'ytd':
        return { 
          dateFrom: format(startOfYear(now), 'yyyy-MM-dd'), 
          dateTo: format(now, 'yyyy-MM-dd') 
        };
      case 'lastYear':
        const lastYearDate = subYears(now, 1);
        return { 
          dateFrom: format(startOfYear(lastYearDate), 'yyyy-MM-dd'), 
          dateTo: format(endOfYear(lastYearDate), 'yyyy-MM-dd') 
        };
      case 'last365':
        return { 
          dateFrom: format(subDays(now, 365), 'yyyy-MM-dd'), 
          dateTo: format(now, 'yyyy-MM-dd') 
        };
      default:
        return { dateFrom: format(subDays(now, 7), 'yyyy-MM-dd'), dateTo: format(now, 'yyyy-MM-dd') };
    }
  })();

  const { data: metrics, isLoading: metricsLoading } = useSalesMetrics({ ...dateFilters, locationId: filterContext?.locationId });
  // Wave 14: Skip location aggregation query when a single location is selected (table is hidden)
  const isAllLocationsSelected = !filterContext?.locationId || filterContext.locationId === 'all';
  const { data: locationData, isLoading: locationLoading } = useSalesByLocation(dateFilters.dateFrom, dateFilters.dateTo, { enabled: isAllLocationsSelected });
  const { data: stylistData, isLoading: stylistLoading } = useSalesByStylist(dateFilters.dateFrom, dateFilters.dateTo, filterContext?.locationId);
  const { data: trendData, isLoading: trendLoading } = useSalesTrend(dateFilters.dateFrom, dateFilters.dateTo, filterContext?.locationId);
  const { data: comparison, isLoading: comparisonLoading } = useSalesComparison(dateFilters.dateFrom, dateFilters.dateTo, filterContext?.locationId);
  // Wave 15: Tomorrow card only shown in closed/no-data states; gate fetch to today range
  const isTodayRange = dateRange === 'today';
  const { data: tomorrowData } = useTomorrowRevenue(filterContext?.locationId, isTodayRange);
  const { goals } = useSalesGoals();
  const { data: locations } = useActiveLocations();
  const rangeIncludesToday = dateFilters.dateTo === format(new Date(), 'yyyy-MM-dd');
  const { data: todayActual, locationActuals, isLoading: todayActualLoading, dataUpdatedAt: todayDataUpdatedAt } = useTodayActualRevenue(dateRange === 'today' || rangeIncludesToday);
  const { data: attachmentData, isLoading: attachmentLoading } = useRetailAttachmentRate({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    locationId: filterContext?.locationId,
  });
  // Retail breakdown — Products / Merch / Extensions (Wave 15: defer until expanded)
  const { data: retailBreakdown } = useRetailBreakdown(
    dateFilters.dateFrom,
    dateFilters.dateTo,
    retailExpanded,
    filterContext?.locationId
  );
  // Service category breakdown — Wave 15: only fetch when service breakdown is expanded
  const { data: serviceCategoryData } = useRevenueByCategoryDrilldown({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    locationId: filterContext?.locationId,
    enabled: servicesExpanded,
  });

  // Wave 15: Defer tips drilldown until the Tips card is expanded.
  // The collapsed-state "Average Tip Rate" stat will show once the user opens it.
  const { byTotalTips: tipsByTotal } = useTipsDrilldown({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
    locationId: filterContext?.locationId,
    enabled: tipsCardExpanded,
  });
  const tipAttachRate = useMemo(() => {
    if (!tipsByTotal?.length) return null;
    const totalAppts = tipsByTotal.reduce((s, st) => s + st.appointmentCount, 0);
    const tippedAppts = tipsByTotal.reduce((s, st) => {
      const noTipCount = Math.round((st.noTipRate * st.appointmentCount) / 100);
      return s + (st.appointmentCount - noTipCount);
    }, 0);
    return totalAppts > 0 ? (tippedAppts / totalAppts) * 100 : null;
  }, [tipsByTotal]);
  const isToday = dateRange === 'today';
  const isPastRange = !isToday && dateRange !== 'todayToEom';

  // For ranges that include today (7d, thisWeek, mtd, ytd, last365), exclude today
  // from the POS query so we don't get stale/missing data for the current day.
  // Today's live POS data is already handled by useTodayActualRevenue.
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const pastRangeIncludesToday = isPastRange && dateFilters.dateTo === todayStr;
  const pastActualDateTo = pastRangeIncludesToday
    ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
    : dateFilters.dateTo;

  // Actual POS revenue for past date ranges (with location filter + pagination)
  const { data: pastActualRaw, isLoading: pastActualLoading } = useActualRevenue(
    dateFilters.dateFrom,
    pastActualDateTo,
    isPastRange,
    filterContext?.locationId
  );

  // When the range includes today, combine historical POS data with today's live POS data
  const pastActual = useMemo(() => {
    if (!isPastRange) return pastActualRaw;
    if (!pastRangeIncludesToday) return pastActualRaw;

    // Get today's data — use location-specific if a location is selected
    const todayData = (() => {
      if (filterContext?.locationId && filterContext.locationId !== 'all' && locationActuals) {
        const locData = locationActuals[filterContext.locationId];
        return locData ? {
          revenue: locData.actualRevenue,
          service: locData.actualServiceRevenue,
          product: locData.actualProductRevenue,
          transactions: locData.actualTransactions,
          hasData: locData.hasActualData,
        } : null;
      }
      return todayActual ? {
        revenue: todayActual.actualRevenue,
        service: todayActual.actualServiceRevenue,
        product: todayActual.actualProductRevenue,
        transactions: todayActual.actualTransactions,
        hasData: todayActual.hasActualData,
      } : null;
    })();

    const hist = pastActualRaw ?? { actualRevenue: 0, actualServiceRevenue: 0, actualProductRevenue: 0, actualTransactions: 0, hasActualData: false };
    const today = todayData ?? { revenue: 0, service: 0, product: 0, transactions: 0, hasData: false };

    const combined = {
      actualRevenue: hist.actualRevenue + today.revenue,
      actualServiceRevenue: hist.actualServiceRevenue + today.service,
      actualProductRevenue: hist.actualProductRevenue + today.product,
      actualTransactions: hist.actualTransactions + today.transactions,
      hasActualData: hist.hasActualData || today.hasData,
    };
    return combined;
  }, [pastActualRaw, pastRangeIncludesToday, isPastRange, todayActual, locationActuals, filterContext?.locationId]);

  // Scheduled revenue — all appointments on the books (cancelled + no-show + completed)
  const { data: scheduledRevenue, isLoading: scheduledLoading } = useScheduledRevenue(
    dateFilters.dateFrom,
    dateFilters.dateTo,
    filterContext?.locationId,
    isPastRange || isToday
  );

  // Adjusted expected revenue (real-time, today only)
  const { data: adjustedExpected } = useAdjustedExpectedRevenue(
    filterContext?.locationId,
    isToday
  );

  // For the today badge: use original scheduled total (what was on the books)
  const todayExpectedDisplay = adjustedExpected?.originalExpected ?? scheduledRevenue ?? 0;

  // Gap analysis — lazy, only fetched when drill-down is open
  const { data: gapAnalysis, isLoading: gapLoading } = useRevenueGapAnalysis(
    dateFilters.dateFrom,
    dateFilters.dateTo,
    isToday ? (scheduledRevenue ?? 0) : (scheduledRevenue ?? 0),
    isToday ? (todayActual?.actualRevenue ?? 0) : (pastActual?.actualRevenue ?? 0),
    (isPastRange || isToday) && activeDrilldown === 'expectedGap' && scheduledRevenue != null,
    filterContext?.locationId
  );

  // Location display logic
  const isAllLocations = !filterContext?.locationId || filterContext.locationId === 'all';
  const [locationRevenueView, setLocationRevenueView] = useState<'expected' | 'actual'>('actual');
  const selectedLocationName = !isAllLocations 
    ? locations?.find(loc => loc.id === filterContext.locationId)?.name 
    : null;

  const isLoading = metricsLoading || locationLoading;

  // Calculate revenue per hour
  const revenuePerHour = (() => {
    const serviceHours = metrics?.totalServiceHours || 0;
    if (serviceHours === 0) return 0;
    return (metrics?.totalRevenue || 0) / serviceHours;
  })();

  // Calculate revenue breakdown percentages
  const totalRevenueSum = (metrics?.serviceRevenue || 0) + (metrics?.productRevenue || 0);
  const servicePercent = totalRevenueSum > 0 
    ? Math.round(((metrics?.serviceRevenue || 0) / totalRevenueSum) * 100) 
    : 0;
  const productPercent = totalRevenueSum > 0 
    ? Math.round(((metrics?.productRevenue || 0) / totalRevenueSum) * 100) 
    : 0;

  // Determine the goal period based on date range (must match what GoalProgressWithOwnRevenue uses)
  const goalPeriodForCard = (dateRange === 'thisWeek' || dateRange === '7d') ? 'weekly' as const : 'monthly' as const;

  // Calculate goal based on goalPeriodForCard, accounting for single-location view
  const currentGoal = (() => {
    let globalTarget: number;
    if (goalPeriodForCard === 'weekly') {
      globalTarget = goals?.weeklyTarget || 12500;
    } else {
      // monthly (covers today, yesterday, mtd, 30d, ytd, etc.)
      globalTarget = goals?.monthlyTarget || 50000;
    }

    // Yearly ranges scale the monthly target
    if (dateRange === 'ytd' || dateRange === 'lastYear' || dateRange === 'last365') {
      globalTarget = (goals?.monthlyTarget || 50000) * 12;
    }

    // When viewing a single location, use location-specific target or divide evenly
    if (!isAllLocations && filterContext?.locationId) {
      const locTargets = goals?.locationTargets?.[filterContext.locationId];
      if (locTargets) {
        return goalPeriodForCard === 'monthly' ? locTargets.monthly : locTargets.weekly;
      }
      // Fallback: divide global target by number of active locations
      const locationCount = locations?.length || 1;
      return Math.round(globalTarget / locationCount);
    }

    return globalTarget;
  })();

  // Get goal label based on goal period
  const goalLabel = (() => {
    if (dateRange === 'ytd' || dateRange === 'lastYear' || dateRange === 'last365') return 'Yearly Goal';
    return goalPeriodForCard === 'monthly' ? 'Monthly Goal' : 'Weekly Goal';
  })();

  // Check if comparison data is available for trend indicators
  const showTrendIndicators = comparison && !['lastYear', 'last365'].includes(dateRange);

  // Get trend data for a specific location
  const getLocationTrend = (locationId: string | null) => {
    if (!trendData || !locationId) return [];
    return trendData.byLocation?.[locationId] || [];
  };

  // Location sort handlers
  const handleLocationSort = (field: LocationSortField) => {
    if (locationSortField === field) {
      setLocationSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setLocationSortField(field);
      setLocationSortDirection('desc');
    }
  };

  const getLocationSortIcon = (field: LocationSortField) => {
    if (locationSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    }
    return locationSortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  // Derive available regions from locations data (use state_province or city)
  const availableRegions = useMemo(() => {
    if (!locations) return [];
    const regions = new Set<string>();
    locations.forEach(loc => {
      const region = loc.state_province || loc.city?.split(',')[1]?.trim().split(' ')[0] || '';
      if (region) regions.add(region);
    });
    return Array.from(regions).sort();
  }, [locations]);

  // Build a map of location_id -> region for filtering
  const locationRegionMap = useMemo(() => {
    const map: Record<string, string> = {};
    locations?.forEach(loc => {
      map[loc.id] = loc.state_province || loc.city?.split(',')[1]?.trim().split(' ')[0] || '';
    });
    return map;
  }, [locations]);

  // Sorted location data
  const sortedLocationData = useMemo(() => {
    if (!locationData) return [];
    return [...locationData].sort((a, b) => {
      let aVal: number, bVal: number;
      if (locationSortField === 'avgTicket') {
        aVal = a.totalTransactions > 0 ? a.totalRevenue / a.totalTransactions : 0;
        bVal = b.totalTransactions > 0 ? b.totalRevenue / b.totalTransactions : 0;
      } else if (locationSortField === 'name') {
        return locationSortDirection === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else {
        aVal = a[locationSortField] ?? 0;
        bVal = b[locationSortField] ?? 0;
      }
      return locationSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [locationData, locationSortField, locationSortDirection]);

  // Filtered location data (by region)
  const filteredLocationData = useMemo(() => {
    if (regionFilter === 'all') return sortedLocationData;
    return sortedLocationData.filter(loc => {
      const region = locationRegionMap[loc.location_id || ''] || '';
      return region === regionFilter;
    });
  }, [sortedLocationData, regionFilter, locationRegionMap]);

  // Visible locations (collapsed = top 5, expanded = all)
  const COLLAPSED_COUNT = 5;
  const visibleLocationData = useMemo(() => {
    if (locationsExpanded || filteredLocationData.length <= COLLAPSED_COUNT) return filteredLocationData;
    return filteredLocationData.slice(0, COLLAPSED_COUNT);
  }, [filteredLocationData, locationsExpanded]);

  // Export CSV
  const handleExportCSV = () => {
    if (!locationData) return;
    
    const headers = ['Location', 'Total Revenue', 'Service Revenue', 'Product Revenue', 'Transactions', 'Avg Ticket'];
    const rows = locationData.map(loc => {
      const avgTicket = loc.totalTransactions > 0 ? loc.totalRevenue / loc.totalTransactions : 0;
      return [
        loc.name,
        loc.totalRevenue.toFixed(2),
        loc.serviceRevenue.toFixed(2),
        loc.productRevenue.toFixed(2),
        loc.totalTransactions,
        avgTicket.toFixed(2),
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-by-location-${dateFilters.dateFrom}-to-${dateFilters.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Navigate to full dashboard
  const handleViewDetails = (locationId?: string) => {
    const params = new URLSearchParams();
    if (locationId) params.set('location', locationId);
    params.set('range', dateRange);
    navigate(`/dashboard/admin/sales?${params.toString()}`);
  };

  // Live session awareness — prevents "all complete" while stylists are still in service
  // Wave 15: only fetch when viewing today (only consumer is allAppointmentsComplete)
  const liveSession = useLiveSessionSnapshot(filterContext?.locationId, isToday);

  // Determine if all revenue is finalized (operating hours passed OR last appointment ended)
  const allAppointmentsComplete = useMemo(() => {
    if (!isToday) return false;

    // If anyone is still in session by time-window, revenue is not finalized
    if (liveSession.inSessionCount > 0) return false;

    // If any appointments are still in a non-terminal status, not complete
    if (adjustedExpected && adjustedExpected.pendingCount > 0) return false;

    const now = new Date();

    // Path 1: All locations are past their closing time
    if (locations && locations.length > 0) {
      const allPastClose = locations.every(loc => {
        const hoursInfo = getLocationHoursForDate(loc.hours_json, loc.holiday_closures, now);
        if (hoursInfo.isClosed) return true; // closed today = no more revenue
        if (!hoursInfo.closeTime) return false; // no hours defined = can't determine
        const [h, m] = hoursInfo.closeTime.split(':').map(Number);
        return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
      });
      if (allPastClose) return true;
    }

    // Path 2: Last appointment has ended (fallback for when hours aren't configured)
    if (todayActual?.lastAppointmentEndTime && todayActual.hasActualData) {
      const [h, m] = todayActual.lastAppointmentEndTime.split(':').map(Number);
      return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
    }

    return false;
  }, [isToday, locations, todayActual, liveSession.inSessionCount, adjustedExpected]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-20 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const displayMetrics = metrics || {
    totalRevenue: 0,
    serviceRevenue: 0,
    productRevenue: 0,
    totalTransactions: 0,
    averageTicket: 0,
  };

  const hasNoData = !metrics || displayMetrics.totalRevenue === 0;

  const isSingleDay = dateRange === 'today' || dateRange === 'yesterday';
  const allLocationsClosed = isSingleDay && hasNoData
    && (locations?.length ?? 0) > 0
    && locations!.every(loc =>
      isClosedOnDate(loc.hours_json, loc.holiday_closures, dateRange === 'yesterday' ? subDays(new Date(), 1) : new Date()).isClosed
    );

  return (
    <Card className="p-6">
      {/* Header: left = title, middle = metadata, right = actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base tracking-wide">{t('sales.sales_overview')}</h2>
          </div>
          {hasNoData && (() => {
            const isSingleDay = dateRange === 'today' || dateRange === 'yesterday';
            const allClosed = isSingleDay && (locations?.length ?? 0) > 0 && locations!.every(loc =>
              isClosedOnDate(loc.hours_json, loc.holiday_closures, dateRange === 'yesterday' ? subDays(new Date(), 1) : new Date()).isClosed
            );
            const label = allClosed ? 'Closed' : isSingleDay ? 'No sales yet' : 'No data';
            return (
              <Badge variant="outline" className="text-muted-foreground font-sans">
                {label}
              </Badge>
            );
          })()}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Metadata: filter context + sync */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterContext && (
              <AnalyticsFilterBadge 
                locationId={filterContext.locationId} 
                dateRange={filterContext.dateRange as any} 
              />
            )}
            {!hideInternalFilter && (
              <Select value={dateRange} onValueChange={(v: DateRange) => setInternalDateRange(v)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{tc('date_range.today')}</SelectItem>
                  <SelectItem value="yesterday">{tc('date_range.yesterday')}</SelectItem>
                  <SelectItem value="thisWeek">{tc('date_range.this_week')}</SelectItem>
                  <SelectItem value="7d">{tc('date_range.last_7_days')}</SelectItem>
                  <SelectItem value="30d">{tc('date_range.last_30_days')}</SelectItem>
                  <SelectItem value="mtd">{tc('date_range.month_to_date')}</SelectItem>
                  <SelectItem value="ytd">{tc('date_range.year_to_date')}</SelectItem>
                  <SelectItem value="lastYear">{tc('date_range.last_year')}</SelectItem>
                  <SelectItem value="last365">{tc('date_range.last_365_days')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Actions: export + info */}
          <div className="flex items-center gap-1 border-l border-border/60 pl-2 sm:pl-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size={tokens.button.inline} className="h-8" onClick={handleExportCSV}>
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t('sales.export_data')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full hover:bg-primary/10"
                  onClick={() => handleViewDetails()}
                >
                  <Info className="w-4 h-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {t('sales.view_full_analytics')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {allLocationsClosed ? (
        <div className="bg-card-inner rounded-xl border border-border/40 py-4 px-5 space-y-2">
          <div className="flex items-center gap-3">
            <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              No sales activity — all {locations?.length ?? 0} locations
              {dateRange === 'yesterday' ? ' were closed yesterday' : ' are closed today'}.
            </p>
          </div>
          {tomorrowData && tomorrowData.revenue > 0 && (
            <div className="flex items-center gap-3 pl-7">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                Tomorrow:{' '}
                <BlurredAmount disableTooltip>
                  <span className="text-foreground font-medium">{formatCurrency(tomorrowData.revenue)}</span>
                </BlurredAmount>
                {' '}expected across {tomorrowData.appointmentCount} appointment{tomorrowData.appointmentCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Main Content Grid */}
      <div className="grid xl:grid-cols-3 gap-6 mb-6">
        {/* KPIs with Trends */}
        <div className="xl:col-span-2 flex flex-col h-full">
          {/* Hero: Total Revenue with Breakdown */}
           <div className="bg-card-inner rounded-xl p-4 sm:p-6 border border-border/40">
            {/* Header row: location label left, sync status right */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
                <span>{isAllLocations ? t('sales.all_locations') : selectedLocationName || tc('loading')}</span>
                {/* Closed locations summary — single-day views only */}
                {isAllLocations && (dateRange === 'today' || dateRange === 'yesterday') && (() => {
                  const viewDate = dateRange === 'yesterday' ? subDays(new Date(), 1) : new Date();
                  const closedCount = (locations ?? []).filter(loc =>
                    isClosedOnDate(loc.hours_json, loc.holiday_closures, viewDate).isClosed
                  ).length;
                  const totalCount = locations?.length ?? 0;
                  if (closedCount === 0 || totalCount === 0) return null;
                  return (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="flex items-center gap-1 text-muted-foreground/70">
                        <Moon className="w-3 h-3" />
                        {closedCount === totalCount
                          ? `All ${totalCount} locations closed ${dateRange === 'yesterday' ? 'yesterday' : 'today'}`
                          : `${closedCount} of ${totalCount} locations closed ${dateRange === 'yesterday' ? 'yesterday' : 'today'}`}
                      </span>
                    </>
                  );
                })()}
              </p>
              {isToday && !todayActual?.hasActualData && (
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <LastSyncIndicator syncType="sales" showAutoRefresh />
                </div>
              )}
            </div>
            {/* Total Revenue - Hero */}
            <div
              className="text-center mb-4 sm:mb-6 rounded-xl p-4 sm:p-6"
            >
              <AnimatedBlurredAmount
                value={isToday ? (todayActual?.actualRevenue ?? 0) : (isPastRange && pastActual?.hasActualData ? pastActual.actualRevenue : displayMetrics.totalRevenue)}
                currency={currency}
                className="text-3xl sm:text-4xl md:text-5xl font-display tabular-nums"
                animationKey="cc-hero-revenue"
              />
              <div className="flex flex-col items-center mt-2">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    {isToday 
                      ? (allAppointmentsComplete ? 'Final Revenue Today' : 'Revenue So Far Today')
                      : t('sales.total_revenue')}
                  </p>
                  <MetricInfoTooltip description={isToday
                    ? (allAppointmentsComplete 
                        ? "All scheduled appointments have concluded. This is today's final revenue figure. Tips and gratuities are tracked separately."
                        : "Revenue from completed/checked-out transactions today. Updates every 5 minutes. Tips and gratuities are tracked separately.")
                    : "Combined net revenue from services and retail product sales for the selected period. Tips and gratuities are tracked separately and not included in this total."
                  } />
                </div>
                <p className="text-xs text-muted-foreground/50">Excludes Tips · {taxLabel}</p>
              </div>

              {/* Expected Service Revenue — collapsible summary (today only) */}
              {isToday && (todayExpectedDisplay > 0 || (scheduledRevenue != null && scheduledRevenue > 0)) && (
                <div className="mt-4 mx-auto max-w-sm space-y-2">
                  {(() => {
                    const displayExpected = todayExpectedDisplay;
                    const remainingExpected = adjustedExpected 
                      ? adjustedExpected.pendingExpectedRevenue + (adjustedExpected.awaitingCheckoutRevenue ?? 0)
                      : displayExpected;
                    
                    const completedScheduled = adjustedExpected?.completedScheduledRevenue ?? 0;
                    const completedActual = adjustedExpected?.completedActualRevenue ?? 0;
                    const serviceDelta = completedActual - completedScheduled;
                    const hasResolvedAppts = (adjustedExpected?.resolvedCount ?? 0) > 0;

                    const totalAppts = adjustedExpected 
                      ? adjustedExpected.resolvedCount + adjustedExpected.pendingCount + adjustedExpected.cancelledCount + adjustedExpected.noShowCount 
                      : 0;
                    const resolvedCount = adjustedExpected?.resolvedCount ?? 0;
                    const serviceRevenue = completedActual;
                    const exceededTotal = displayExpected > 0 && serviceRevenue > displayExpected;
                    const earnedPct = displayExpected > 0 
                      ? Math.min(Math.round((serviceRevenue / displayExpected) * 100), 100) 
                      : 0;
                    const projectedFinish = (adjustedExpected?.completedActualRevenue ?? 0) + (adjustedExpected?.awaitingCheckoutRevenue ?? 0) + (adjustedExpected?.pendingExpectedRevenue ?? 0);

                    // Compact summary line
                    const compactParts: string[] = [];
                    if (totalAppts > 0) compactParts.push(`${resolvedCount}/${totalAppts} appts`);
                    if (remainingExpected > 0) compactParts.push(`${formatCurrency(remainingExpected)} remaining`);
                    else if (allAppointmentsComplete) compactParts.push('All complete');
                    if (!allAppointmentsComplete && projectedFinish > 0) compactParts.push(`on track for ${formatCurrency(projectedFinish)}`);
                    else if (exceededTotal) compactParts.push(`exceeded by ${formatCurrency(serviceRevenue - displayExpected)}`);
                    
                    return (
                      <>
                        {/* Compact progress bar — always visible */}
                        {todayActual?.hasActualData && displayExpected > 0 && (
                          <Progress 
                            value={Math.min((serviceRevenue / displayExpected) * 100, 100)}
                            className="h-1.5 mx-auto"
                            indicatorClassName={exceededTotal ? "bg-success-foreground" : undefined}
                          />
                        )}

                        {/* Styled summary toggle button */}
                        <div className="flex items-center justify-center">
                          <button 
                            className="flex items-center gap-2 border border-border/60 rounded-full px-3 py-1.5 cursor-pointer group transition-all duration-200 hover:bg-muted/50 hover:border-border"
                            onClick={() => setTodaySummaryExpanded(prev => !prev)}
                          >
                            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                              {compactParts.join(' · ')}
                            </span>
                            <ChevronDown className={cn(
                              "w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-all duration-200",
                              todaySummaryExpanded && "rotate-180"
                            )} />
                          </button>
                        </div>

                        {/* Expanded detail section */}
                        <AnimatePresence initial={false}>
                          {todaySummaryExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-3 pt-1">
                                {/* Line 1: Scheduled Services Today total */}
                                <div className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => toggleDrilldown('expectedGap')}>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Scheduled Services Today:</span>
                                    <BlurredAmount disableTooltip>
                                      <span className="text-foreground font-medium">{formatCurrency(displayExpected)}</span>
                                    </BlurredAmount>
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                                        {adjustedExpected ? (
                                        <div className="space-y-1">
                                          <p>Total service revenue originally booked for today. Completed appointments show actual POS totals; pending appointments use their scheduled price.</p>
                                          <p>{adjustedExpected.resolvedCount} completed ({formatCurrency(adjustedExpected.completedActualRevenue)} actual vs {formatCurrency(adjustedExpected.completedScheduledRevenue)} scheduled) · {adjustedExpected.pendingCount} pending ({formatCurrency(adjustedExpected.pendingScheduledRevenue)} scheduled)</p>
                                          {(adjustedExpected.cancelledCount > 0 || adjustedExpected.noShowCount > 0) && (
                                            <p className="text-muted-foreground/70">{adjustedExpected.cancelledCount} cancelled, {adjustedExpected.noShowCount} no-shows included in total</p>
                                          )}
                                        </div>
                                      ) : (
                                        'Total service revenue scheduled for today based on appointment bookings.'
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>

                                {/* Operational details: awaiting checkout, discounts */}
                                {adjustedExpected && (
                                  <p className="text-[11px] text-muted-foreground/60 text-center">
                                    {(adjustedExpected.awaitingCheckoutCount ?? 0) > 0 && (
                                      <span>{adjustedExpected.awaitingCheckoutCount} awaiting checkout</span>
                                    )}
                                    {(adjustedExpected.awaitingCheckoutCount ?? 0) > 0 && adjustedExpected.discountedAppointmentCount > 0 && ' · '}
                                    {adjustedExpected.discountedAppointmentCount > 0 && (
                                      <span>{adjustedExpected.discountedAppointmentCount} discount{adjustedExpected.discountedAppointmentCount !== 1 ? 's' : ''} applied</span>
                                    )}
                                  </p>
                                )}

                                {/* Estimated final transaction time */}
                                {!allAppointmentsComplete && todayActual?.lastAppointmentEndTime && (
                                  <p className="text-xs text-muted-foreground/70 text-center">
                                    {t('sales.estimated_final_at')}{' '}
                                    <span className="font-medium text-foreground/70">
                                      {formatEndTime(todayActual.lastAppointmentEndTime)}
                                    </span>
                                  </p>
                                )}

                                {/* Gap analysis drill-down trigger */}
                                <div 
                                  className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors"
                                  onClick={() => toggleDrilldown('expectedGap')}
                                >
                                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", activeDrilldown === 'expectedGap' && "rotate-180")} />
                                  <span>{activeDrilldown === 'expectedGap' ? 'Hide' : 'View'} gap analysis</span>
                                </div>

                                {/* Gap analysis drill-down (today) */}
                                <RevenueGapDrilldown
                                  isOpen={activeDrilldown === 'expectedGap'}
                                  data={gapAnalysis}
                                  isLoading={gapLoading}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Last updated timestamp — always visible */}
                        {todayDataUpdatedAt && (
                          <p className="text-[10px] text-muted-foreground/50 text-center">
                            Updated {(() => {
                              const diffMs = Date.now() - todayDataUpdatedAt;
                              const diffMin = Math.round(diffMs / 60000);
                              if (diffMin < 1) return 'just now';
                              if (diffMin === 1) return '1 min ago';
                              return `${diffMin} min ago`;
                            })()}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Expected Revenue badge for past date ranges */}
              {isPastRange && pastActual?.hasActualData && scheduledRevenue != null && scheduledRevenue > 0 && (
                <div className="mt-4 mx-auto max-w-sm space-y-3">
                  {(() => {
                    const exceededScheduled = pastActual.actualRevenue >= scheduledRevenue;
                    return (
                      <>
                        <div
                          className="flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); toggleDrilldown('expectedGap'); }}
                        >
                          <Badge variant="outline" className={cn(
                            "text-sm font-normal gap-1 px-3 py-1.5 transition-colors",
                            exceededScheduled
                              ? "bg-success/10 text-success-foreground border-success/30"
                              : "bg-warning/10 text-warning border-warning/30",
                            activeDrilldown === 'expectedGap' && "ring-1 ring-primary/30"
                          )}>
                            <Clock className="w-4 h-4" />
                            <BlurredAmount>
                              <span>{formatCurrency(scheduledRevenue)}</span>
                            </BlurredAmount>
                            <span>{exceededScheduled ? 'Scheduled · Exceeded' : 'Scheduled'}</span>
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                              Total revenue from all originally-booked appointments — before cancellations, no-shows, and POS discrepancies. Click to see gap analysis.
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Progress bar: actual vs scheduled */}
                        <div className="space-y-1.5">
                          <Progress
                            value={scheduledRevenue > 0
                              ? Math.min((pastActual.actualRevenue / scheduledRevenue) * 100, 100)
                              : 0
                            }
                            className="h-1.5"
                            indicatorClassName={exceededScheduled ? "bg-success-foreground" : undefined}
                          />
                          {exceededScheduled && (
                            <div className="flex items-center justify-center gap-1 text-xs text-success-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Exceeded</span>
                            </div>
                          )}
                        </div>

                        {/* Gap analysis drill-down */}
                        <RevenueGapDrilldown
                          isOpen={activeDrilldown === 'expectedGap'}
                          data={gapAnalysis}
                          isLoading={gapLoading}
                          showDates={dateRange !== 'yesterday'}
                        />
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Expected revenue badge for todayToEom (non-today future) */}
              {dateRange === 'todayToEom' && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-sm font-normal px-3 py-1.5 bg-warning/10 text-warning border-warning/30">
                    <Clock className="w-4 h-4 mr-1" />
                    {t('sales.expected_revenue')}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                      Based on scheduled appointments. Final revenue may differ as appointments are completed, cancelled, or added.
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {showTrendIndicators && (!isToday || allAppointmentsComplete) && (
                <div className="mt-2 flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <SalesTrendIndicator 
                          current={comparison.current.totalRevenue}
                          previous={comparison.previous.totalRevenue} 
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                      Trend based on completed transactions (checked-out sales). May differ slightly from scheduled appointment totals shown above.
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
            
            {/* Services & Retail Sub-cards */}
            {(() => {
              // When today + actual data, show actual breakdown; for past ranges with POS data, use POS; otherwise show expected
              const usePastActual = isPastRange && pastActual?.hasActualData;
              const svcRevenue = isToday
                ? (todayActual?.hasActualData ? todayActual.actualServiceRevenue : 0)
                : usePastActual ? pastActual.actualServiceRevenue
                : displayMetrics.serviceRevenue;
              const rawProdRevenue = isToday
                ? (todayActual?.hasActualData ? todayActual.actualProductRevenue : 0)
                : usePastActual ? pastActual.actualProductRevenue
                : displayMetrics.productRevenue;
              // Retail breakdown sub-categories
              const rb = retailBreakdown;
              const retailDisplayRevenue = rb?.totalRetailRevenue ?? rawProdRevenue;
              const totalBrkdn = svcRevenue + retailDisplayRevenue;
              const svcPct = totalBrkdn > 0 ? Math.round((svcRevenue / totalBrkdn) * 100) : 0;
              const prodPct = totalBrkdn > 0 ? Math.round((retailDisplayRevenue / totalBrkdn) * 100) : 0;
              const retailTotal = rb?.totalRetailRevenue ?? rawProdRevenue;
              const subCategories = [
                { label: 'Products', icon: Package, amount: rb?.productRevenue ?? rawProdRevenue, count: rb?.productCount ?? 0 },
                { label: 'Merch', icon: Shirt, amount: rb?.merchRevenue ?? 0, count: rb?.merchCount ?? 0 },
                { label: 'Gift Cards', icon: Gift, amount: rb?.giftCardRevenue ?? 0, count: rb?.giftCardCount ?? 0 },
                { label: 'Extensions', icon: GemIcon, amount: rb?.extensionRevenue ?? 0, count: rb?.extensionCount ?? 0 },
                { label: 'Fees & Deposits', icon: Receipt, amount: rb?.feesRevenue ?? 0, count: rb?.feesCount ?? 0 },
               ].sort((a, b) => b.amount - a.amount);

              return (
                <div className="grid grid-cols-2 gap-6">
                  {/* Services (with expandable category breakdown) */}
                  <div className={cn(
                    "text-center p-3 sm:p-4 bg-card-inner-deep rounded-lg border transition-all cursor-pointer",
                    activeDrilldown === 'revenue'
                      ? "ring-1 ring-primary/20 bg-primary/5 border-primary/30"
                      : "border-border/40 hover:border-border/80 dark:hover:border-border/60"
                  )} onClick={() => toggleDrilldown('revenue')}>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <Scissors className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">{t('sales.services')}</span>
                        <MetricInfoTooltip description="Revenue from booked services. Tips are tracked separately." />
                      </div>
                      <AnimatedBlurredAmount 
                        value={svcRevenue}
                        currency={currency}
                        className="text-xl sm:text-2xl font-display tabular-nums"
                        animationKey="cc-services-revenue"
                      />
                      <p className="text-xs text-muted-foreground/70 mt-1">{svcPct}%</p>
                    </div>
                    {/* Breakdown toggle */}
                    {serviceCategoryData && serviceCategoryData.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); const next = !servicesExpanded; setServicesExpanded(next); setRetailExpanded(next); }}
                        className="mt-2 mx-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Breakdown</span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", servicesExpanded && "rotate-180")} />
                      </button>
                    )}
                    {/* Expanded service category breakdown */}
                    <AnimatePresence>
                      {servicesExpanded && serviceCategoryData && serviceCategoryData.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-border/40 space-y-1 text-left">
                            {serviceCategoryData.slice(0, 4).map((cat, index) => (
                              <div
                                key={cat.category}
                                className="flex items-center gap-2 w-full text-left rounded-lg px-2 py-2.5 hover:bg-muted/40 transition-colors"
                              >
                                <span className="text-[10px] text-muted-foreground/50 w-3 tabular-nums">{index + 1}</span>
                                
                                <span className="text-[11px] text-muted-foreground flex-1">{cat.category}</span>
                                <BlurredAmount>
                                  <span className="text-[11px] tabular-nums font-medium">{formatCurrencyWhole(cat.revenue)}</span>
                                </BlurredAmount>
                                <span className="text-[10px] text-muted-foreground/60 w-8 text-right">{cat.sharePercent}%</span>
                              </div>
                            ))}
                            {serviceCategoryData.length > 4 && (
                              <p className="text-[10px] text-muted-foreground/40 text-center pt-1 italic">Top 4 categories shown</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Retail (with expandable breakdown) */}
                  <div className="text-center p-3 sm:p-4 bg-card-inner-deep rounded-lg border border-border/40 transition-all hover:border-border/80 dark:hover:border-border/60">
                    <div 
                      className="cursor-pointer"
                      onClick={() => setDrilldownMode('products')}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">{t('sales.products')}</span>
                        <MetricInfoTooltip description="Total retail revenue including products, merch, and extensions. Expand to see breakdown." />
                      </div>
                      <AnimatedBlurredAmount 
                        value={retailDisplayRevenue}
                        currency={currency}
                        className="text-xl sm:text-2xl font-display tabular-nums"
                        animationKey="cc-retail-revenue"
                      />
                      <p className="text-xs text-muted-foreground/70 mt-1">{prodPct}%</p>
                    </div>
                    {/* Chevron toggle for breakdown */}
                    {subCategories.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); const next = !retailExpanded; setRetailExpanded(next); setServicesExpanded(next); }}
                        className="mt-2 mx-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Breakdown</span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", retailExpanded && "rotate-180")} />
                      </button>
                    )}
                    {/* Expanded breakdown rows */}
                    <AnimatePresence>
                      {retailExpanded && subCategories.length > 1 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-border/40 space-y-1 text-left">
                            {subCategories.map(({ label, icon: Icon, amount }, index) => {
                              const pct = retailTotal > 0 ? Math.round((amount / retailTotal) * 100) : 0;
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  className="flex items-center gap-2 w-full text-left rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  onClick={(e) => { e.stopPropagation(); setRetailCategoryDrilldown(label as any); }}
                                >
                                  <span className="text-[10px] text-muted-foreground/50 w-3 tabular-nums">{index + 1}</span>
                                  
                                  <span className="text-[11px] text-muted-foreground flex-1">{label}</span>
                                  <BlurredAmount>
                                    <span className="text-[11px] tabular-nums font-medium">{formatCurrencyWhole(amount)}</span>
                                  </BlurredAmount>
                                  <span className="text-[10px] text-muted-foreground/60 w-8 text-right">{pct}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}

            {/* Revenue by Category Drill-Down */}
            <RevenueByCategoryPanel
              isOpen={activeDrilldown === 'revenue'}
              dateFrom={dateFilters.dateFrom}
              dateTo={dateFilters.dateTo}
              locationId={filterContext?.locationId}
            />
          </div>
          
          {/* Secondary KPIs Row */}
          {(() => {
            const showDailyAvg = dateRange !== 'today' && dateRange !== 'yesterday';
            const workingDays = metrics?.daysWithSales ?? 0;
            const pastActualActive = isPastRange && pastActual?.hasActualData;
            const dailyAvgRevenue = pastActualActive ? pastActual.actualRevenue : displayMetrics.totalRevenue;
            const dailyAverage = workingDays > 0 ? dailyAvgRevenue / workingDays : 0;

            if (!showDailyAvg) {
              // 4 cards: single row
              return (
                <div className="mt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div 
                      className={cn(
                        "text-center p-3 sm:p-4 bg-card-inner rounded-lg border transition-all cursor-pointer group",
                        activeDrilldown === 'transactions'
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-primary/30 hover:bg-muted/50"
                      )}
                      onClick={() => toggleDrilldown('transactions')}
                    >
                      <div className="flex justify-center mb-2">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <AnimatedBlurredAmount animationKey="cc-today-transactions" value={isToday ? (todayActual?.hasActualData ? todayActual.actualTransactions : 0) : pastActualActive ? pastActual.actualTransactions : displayMetrics.totalTransactions} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                      <div className="flex items-center gap-1 justify-center mt-1">
                        <p className="text-xs text-muted-foreground">{t('sales.transactions')}</p>
                        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", activeDrilldown === 'transactions' && "rotate-180")} />
                        <MetricInfoTooltip description="Total number of completed sales transactions. Click for hourly breakdown." />
                      </div>
                    </div>
                    <div 
                      className={cn(
                        "text-center p-3 sm:p-4 bg-card-inner rounded-lg border transition-all cursor-pointer group",
                        activeDrilldown === 'avgTicket'
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-primary/30 hover:bg-muted/50"
                      )}
                      onClick={() => toggleDrilldown('avgTicket')}
                    >
                      <div className="flex justify-center mb-2">
                        <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <AnimatedBlurredAmount animationKey="cc-today-avg-ticket" value={Math.round(isToday ? (todayActual?.hasActualData ? todayActual.actualAverageTicket : 0) : pastActualActive ? (pastActual.actualTransactions > 0 ? pastActual.actualRevenue / pastActual.actualTransactions : 0) : displayMetrics.averageTicket)} currency={currency} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                      <div className="flex items-center gap-1 justify-center mt-1">
                        <p className="text-xs text-muted-foreground">{t('sales.avg_ticket')}</p>
                        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", activeDrilldown === 'avgTicket' && "rotate-180")} />
                        <MetricInfoTooltip description="Total Revenue (excluding tips) ÷ Transactions. Click for distribution." />
                      </div>
                    </div>
                    <div 
                      className={cn(
                        "text-center p-3 sm:p-4 bg-card-inner rounded-lg border transition-all cursor-pointer group",
                        activeDrilldown === 'revPerHour'
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-primary/30 hover:bg-muted/50"
                      )}
                      onClick={() => toggleDrilldown('revPerHour')}
                    >
                      <div className="flex justify-center mb-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <AnimatedBlurredAmount animationKey="cc-today-rev-per-hour" value={Math.round(isToday ? (() => { const hours = todayActual?.actualServiceHours > 0 ? todayActual.actualServiceHours : (metrics?.totalServiceHours || 0); const rev = todayActual?.hasActualData ? todayActual.actualRevenue : (metrics?.totalRevenue || 0); return hours > 0 ? rev / hours : 0; })() : pastActualActive ? (metrics?.totalServiceHours && metrics.totalServiceHours > 0 ? pastActual.actualRevenue / metrics.totalServiceHours : 0) : revenuePerHour)} currency={currency} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                      <div className="flex items-center gap-1 justify-center mt-1">
                        <p className="text-xs text-muted-foreground">{t('sales.rev_per_hour')}</p>
                        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", activeDrilldown === 'revPerHour' && "rotate-180")} />
                        <MetricInfoTooltip description="Total Revenue (excluding tips) ÷ Service Hours. Click for stylist breakdown." />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="mt-6 space-y-3">
                <div>
                  <div className="text-center p-3 sm:p-4 bg-card-inner rounded-lg border border-border/40">
                    <div className="flex justify-center mb-2">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <AnimatedBlurredAmount value={Math.round(dailyAverage)} currency={currency} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                    <div className="flex items-center gap-1 justify-center mt-1">
                      <p className="text-xs text-muted-foreground">{t('sales.daily_avg')}</p>
                      <MetricInfoTooltip description="Average daily revenue across days with recorded sales." />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div 
                    className={cn(
                        "text-center p-3 sm:p-4 bg-card-inner rounded-lg border transition-all cursor-pointer group",
                        activeDrilldown === 'transactions'
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-primary/30 hover:bg-muted/50"
                    )}
                    onClick={() => toggleDrilldown('transactions')}
                  >
                    <div className="flex justify-center mb-2">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <AnimatedBlurredAmount value={isToday ? (todayActual?.hasActualData ? todayActual.actualTransactions : 0) : pastActualActive ? pastActual.actualTransactions : displayMetrics.totalTransactions} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                    <div className="flex items-center gap-1 justify-center mt-1">
                      <p className="text-xs text-muted-foreground">{t('sales.transactions')}</p>
                      <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", activeDrilldown === 'transactions' && "rotate-180")} />
                      <MetricInfoTooltip description="Total number of completed sales transactions. Click for hourly breakdown." />
                    </div>
                  </div>
                  <div 
                    className={cn(
                        "text-center p-3 sm:p-4 bg-card-inner rounded-lg border transition-all cursor-pointer group",
                        activeDrilldown === 'avgTicket'
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-primary/30 hover:bg-muted/50"
                    )}
                    onClick={() => toggleDrilldown('avgTicket')}
                  >
                    <div className="flex justify-center mb-2">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <AnimatedBlurredAmount value={Math.round(isToday ? (todayActual?.hasActualData ? todayActual.actualAverageTicket : 0) : pastActualActive ? (pastActual.actualTransactions > 0 ? pastActual.actualRevenue / pastActual.actualTransactions : 0) : displayMetrics.averageTicket)} currency={currency} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                    <div className="flex items-center gap-1 justify-center mt-1">
                      <p className="text-xs text-muted-foreground">{t('sales.avg_ticket')}</p>
                      <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", activeDrilldown === 'avgTicket' && "rotate-180")} />
                      <MetricInfoTooltip description="Total Revenue (excluding tips) ÷ Transactions. Click for distribution." />
                    </div>
                  </div>
                  <div 
                    className={cn(
                        "text-center p-3 sm:p-4 bg-card-inner rounded-lg border transition-all cursor-pointer group col-span-2 sm:col-span-1",
                        activeDrilldown === 'revPerHour'
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-primary/30 hover:bg-muted/50"
                    )}
                    onClick={() => toggleDrilldown('revPerHour')}
                  >
                    <div className="flex justify-center mb-2">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <AnimatedBlurredAmount value={Math.round(isToday ? (() => { const hours = todayActual?.actualServiceHours > 0 ? todayActual.actualServiceHours : (metrics?.totalServiceHours || 0); const rev = todayActual?.hasActualData ? todayActual.actualRevenue : (metrics?.totalRevenue || 0); return hours > 0 ? rev / hours : 0; })() : pastActualActive ? (metrics?.totalServiceHours && metrics.totalServiceHours > 0 ? pastActual.actualRevenue / metrics.totalServiceHours : 0) : revenuePerHour)} currency={currency} className="text-lg sm:text-xl md:text-2xl font-display tabular-nums" />
                    <div className="flex items-center gap-1 justify-center mt-1">
                      <p className="text-xs text-muted-foreground">{t('sales.rev_per_hour')}</p>
                      <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", activeDrilldown === 'revPerHour' && "rotate-180")} />
                      <MetricInfoTooltip description="Total Revenue (excluding tips) ÷ Service Hours. Click for stylist breakdown." />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Transactions by Hour Drill-Down */}
          <TransactionsByHourPanel
            isOpen={activeDrilldown === 'transactions'}
            dateFrom={dateFilters.dateFrom}
            dateTo={dateFilters.dateTo}
            locationId={filterContext?.locationId}
          />
          {/* Client Type Split → Rebooking (Level 2) */}
          <ClientTypeSplitPanel
            isOpen={activeDrilldown === 'transactions'}
            dateFrom={dateFilters.dateFrom}
            dateTo={dateFilters.dateTo}
            locationId={filterContext?.locationId}
          />

          {/* Ticket Distribution Drill-Down */}
          <TicketDistributionPanel
            isOpen={activeDrilldown === 'avgTicket'}
            dateFrom={dateFilters.dateFrom}
            dateTo={dateFilters.dateTo}
            locationId={filterContext?.locationId}
          />
          {/* Avg Ticket by Stylist → Service Mix (Level 2) */}
          <AvgTicketByStylistPanel
            isOpen={activeDrilldown === 'avgTicket'}
            dateFrom={dateFilters.dateFrom}
            dateTo={dateFilters.dateTo}
            locationId={filterContext?.locationId}
          />

          {/* Rev/Hour by Stylist Drill-Down */}
          <RevPerHourByStylistPanel
            isOpen={activeDrilldown === 'revPerHour'}
            stylistData={stylistData}
            totalServiceHours={metrics?.totalServiceHours || 0}
            isLoading={stylistLoading}
          />

          {/* Goal Progress */}
          <div className="mt-auto mb-auto pt-6">
           {(() => {
              const selectedLoc = !isAllLocations
                ? locations?.find(loc => loc.id === filterContext?.locationId)
                : null;

              // Merged hours for "All Locations": a day is closed only if ALL locations are closed
              const mergedHoursJson = isAllLocations && locations?.length
                ? (() => {
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                    const merged: Record<string, { closed?: boolean; open?: string; close?: string }> = {};
                    for (const day of days) {
                      const allClosed = locations.every(loc => {
                        const hj = loc.hours_json as Record<string, any> | null;
                        return hj?.[day]?.closed === true;
                      });
                      merged[day] = allClosed ? { closed: true } : { closed: false };
                    }
                    return merged;
                  })()
                : undefined;

              // Merged holidays: a date is a holiday only if ALL locations list it
              const mergedHolidays = isAllLocations && locations?.length
                ? (() => {
                    const allSets = locations.map(loc =>
                      new Set((loc.holiday_closures as Array<{ date: string }> || []).map(h => h.date))
                    );
                    if (allSets.length === 0) return undefined;
                    const intersection = [...allSets[0]].filter(d => allSets.every(s => s.has(d)));
                    return intersection.map(date => ({ date }));
                  })()
                : undefined;

              return (
                <>
                  <GoalProgressWithOwnRevenue
                    goalPeriod={goalPeriodForCard}
                    locationId={filterContext?.locationId}
                    target={currentGoal}
                    label={goalLabel}
                    hoursJson={selectedLoc?.hours_json ?? mergedHoursJson}
                    holidayClosures={selectedLoc?.holiday_closures ?? mergedHolidays}
                    onClick={() => toggleDrilldown('goals')}
                    isExpanded={activeDrilldown === 'goals'}
                  />
                  <GoalLocationsDrilldown
                    isOpen={activeDrilldown === 'goals'}
                    period={goalPeriodForCard}
                  />
                </>
              );
            })()}
          </div>
        </div>

        {/* Sidebar - Top Performers & Donut */}
        <div className="flex flex-col gap-6 min-w-0 order-last xl:order-none">
          <TopPerformersCard 
            performers={stylistData || []} 
            isLoading={stylistLoading}
            showInfoTooltip
          />
          <RevenueDonutChart
            serviceRevenue={isToday ? (todayActual?.hasActualData ? todayActual.actualServiceRevenue : 0) : displayMetrics.serviceRevenue} 
            productRevenue={isToday ? (todayActual?.hasActualData ? todayActual.actualProductRevenue : 0) : displayMetrics.productRevenue}
            size={64}
            retailAttachmentRate={attachmentData?.attachmentRate}
            retailAttachmentLoading={attachmentLoading}
            retailBreakdown={retailBreakdown ? {
              productOnlyRevenue: retailBreakdown.productRevenue,
              extensionRevenue: retailBreakdown.extensionRevenue,
              merchRevenue: retailBreakdown.merchRevenue,
              giftCardRevenue: retailBreakdown.giftCardRevenue,
              feesRevenue: retailBreakdown.feesRevenue,
            } : undefined}
          />

          {/* Tips Summary Card */}
          <Card className="relative bg-card/80 backdrop-blur-xl border-border/40">
            <MetricInfoTooltip
              description="Total gratuities (staff tips) recorded across all completed appointments. Not included in total revenue. Click for stylist breakdown."
              className="absolute top-3 right-3 z-10"
            />
            <CardHeader className={cn("px-4", tipsCardExpanded ? "py-3" : "py-3")}>
              <div className="flex items-center justify-between gap-2 pr-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-muted flex items-center justify-center rounded-lg shrink-0">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="font-display text-base tracking-wide">TIPS</CardTitle>
                </div>
                <div
                  className="flex items-center gap-2 cursor-pointer select-none min-w-0"
                  onClick={handleTipsCardToggle}
                >
                  {!tipsCardExpanded && (
                    <span className="flex items-center gap-2 text-sm min-w-0">
                      <span className="font-sans text-muted-foreground hidden xl:inline whitespace-nowrap">Average Tip Rate</span>
                      <span className="font-sans text-muted-foreground hidden md:inline xl:hidden whitespace-nowrap">Avg. Rate</span>
                      <span className="font-display tabular-nums text-foreground">
                        {(() => {
                          const tipDenominator = isToday && todayActual?.hasActualData
                            ? todayActual.actualRevenue
                            : displayMetrics.totalRevenue;
                          const tips = metrics?.totalTips ?? 0;
                          return tipDenominator > 0 && tips > 0
                            ? `${(tips / tipDenominator * 100).toFixed(1)}%`
                            : '—';
                        })()}
                      </span>
                    </span>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", tipsCardExpanded && "rotate-180")} />
                </div>
              </div>
            </CardHeader>
            {tipsCardExpanded && (
              <CardContent>
                <div
                  className={cn(
                    "text-center p-4 bg-card-inner rounded-lg border transition-all cursor-pointer",
                    tipsDrilldownOpen
                      ? "border-primary/50 ring-1 ring-primary/20"
                      : "border-border/70 dark:border-border/40 hover:border-primary/30 hover:bg-muted/50"
                  )}
                  onClick={handleTipsToggle}
                >
                  <AnimatedBlurredAmount value={metrics?.totalTips ?? 0} currency={currency} className="text-2xl md:text-3xl font-display tabular-nums" />
                  <p className="text-xs text-muted-foreground mt-1">Total Tips</p>
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/40">
                    <div className="pr-4 border-r border-border/40">
                      <p className="text-sm font-display tabular-nums">
                        {(() => {
                          const tipDenominator = isToday && todayActual?.hasActualData
                            ? todayActual.actualRevenue
                            : displayMetrics.totalRevenue;
                          const tips = metrics?.totalTips ?? 0;
                          return tipDenominator > 0 && tips > 0
                            ? `${(tips / tipDenominator * 100).toFixed(1)}%`
                            : '—';
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Tip Rate</p>
                    </div>
                    <div>
                      <p className="text-sm font-display tabular-nums">
                        {tipAttachRate !== null ? `${tipAttachRate.toFixed(0)}%` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Tip Attach</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-3">
                    <p className="text-xs text-muted-foreground">Click for breakdown</p>
                    <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", tipsDrilldownOpen && "rotate-180")} />
                  </div>
                </div>

                <TipsDrilldownPanel
                  isOpen={tipsDrilldownOpen}
                  parentLocationId={filterContext?.locationId}
                  dateFrom={dateFilters.dateFrom}
                  dateTo={dateFilters.dateTo}
                />
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* By Location - Expandable Rows */}
      {isAllLocations && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-display text-xs tracking-wide text-muted-foreground">{t('sales.by_location')}</h3>
            </div>
            <div className="flex items-center gap-2">
              {isToday && (
                <Tabs value={locationRevenueView} onValueChange={(v) => setLocationRevenueView(v as 'actual' | 'expected')}>
                  <FilterTabsList>
                    <FilterTabsTrigger value="actual">Actual</FilterTabsTrigger>
                    <FilterTabsTrigger value="expected">Expected</FilterTabsTrigger>
                  </FilterTabsList>
                </Tabs>
              )}
              {availableRegions.length >= 2 && (
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[140px] h-7 text-xs">
                    <SelectValue placeholder={t('sales.all_regions')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('sales.all_regions')}</SelectItem>
                    {availableRegions.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={locationSortField} onValueChange={(v) => handleLocationSort(v as LocationSortField)}>
                <SelectTrigger className="w-[130px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalRevenue">{t('sales.revenue')}</SelectItem>
                  <SelectItem value="name">{t('sales.name')}</SelectItem>
                  <SelectItem value="serviceRevenue">{t('sales.services')}</SelectItem>
                  <SelectItem value="productRevenue">{t('sales.products')}</SelectItem>
                  <SelectItem value="totalTransactions">{t('sales.transactions')}</SelectItem>
                  <SelectItem value="avgTicket">{t('sales.avg_ticket')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLocationSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {locationSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
          
          {filteredLocationData && filteredLocationData.length > 0 ? (
            <>
              <div className="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
                {visibleLocationData.map((location, idx) => {
                  const avgTicket = location.totalTransactions > 0 
                    ? location.totalRevenue / location.totalTransactions 
                    : 0;
                  const isExpanded = expandedLocationId === (location.location_id || String(idx));
                  const locKey = location.location_id || String(idx);
                  
                  return (
                    <div key={locKey}>
                      {/* Collapsed row */}
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => setExpandedLocationId(isExpanded ? null : locKey)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{location.name}</span>
                          {(dateRange === 'today' || dateRange === 'yesterday') && (() => {
                            const viewDate = dateRange === 'yesterday' ? subDays(new Date(), 1) : new Date();
                            const locObj = locations?.find(l => l.id === location.location_id);
                            if (!locObj) return null;
                            const closed = isClosedOnDate(locObj.hours_json, locObj.holiday_closures, viewDate);
                            if (!closed.isClosed) return null;
                            return <ClosedBadge reason={closed.reason} />;
                          })()}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-display tabular-nums">
                            <BlurredAmount>
                              {(() => {
                                const locActual = isToday ? locationActuals[location.location_id || ''] : null;
                                const useActualView = isToday && locationRevenueView === 'actual';
                                
                                if (locationSortField === 'totalTransactions') {
                                  if (useActualView) return (locActual?.actualTransactions ?? 0).toLocaleString();
                                  return location.totalTransactions.toLocaleString();
                                }
                                if (locationSortField === 'avgTicket') {
                                  if (useActualView) {
                                    const actTx = locActual?.actualTransactions ?? 0;
                                    const actAvg = actTx > 0 ? (locActual?.actualRevenue ?? 0) / actTx : 0;
                                    return formatCurrency(Math.round(actAvg));
                                  }
                                  return formatCurrency(avgTicket);
                                }
                                if (locationSortField === 'serviceRevenue') {
                                  return useActualView ? formatCurrency(locActual?.actualServiceRevenue ?? 0) : formatCurrency(location.serviceRevenue);
                                }
                                if (locationSortField === 'productRevenue') {
                                  return useActualView ? formatCurrency(locActual?.actualProductRevenue ?? 0) : formatCurrency(location.productRevenue);
                                }
                                // totalRevenue or name
                                return useActualView ? formatCurrency(locActual?.actualRevenue ?? 0) : formatCurrency(location.totalRevenue);
                              })()}
                            </BlurredAmount>
                          </span>
                          {(() => {
                            const totalAllLocs = (filteredLocationData || []).reduce((sum, l) => sum + l.totalRevenue, 0) || 1;
                            const pct = Math.round((location.totalRevenue / totalAllLocs) * 100);
                            return (
                              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                                {pct}%
                              </span>
                            );
                          })()}
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-3">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {/* Services */}
                                <button
                                  type="button"
                                  onClick={(e) => handleLocationMetricClick(e, 'services', location)}
                                  disabled={!location.location_id}
                                  className={cn(
                                    'bg-muted/30 rounded-lg border border-border/40 p-3 text-left transition-colors',
                                    location.location_id && 'cursor-pointer hover:bg-muted/50 hover:border-primary/30'
                                  )}
                                  aria-label={t('sales.services')}
                                >
                                  {(() => {
                                    const locActual = isToday ? locationActuals[location.location_id || ''] : null;
                                    const useAct = isToday && locationRevenueView === 'actual';
                                    return (
                                      <>
                                        <p className="text-xs text-muted-foreground mb-1">{t('sales.services')}</p>
                                        <p className="text-sm font-display tabular-nums">
                                          <BlurredAmount>{formatCurrency(useAct ? (locActual?.actualServiceRevenue ?? 0) : location.serviceRevenue)}</BlurredAmount>
                                        </p>
                                      </>
                                    );
                                  })()}
                                </button>
                                {/* Products */}
                                <button
                                  type="button"
                                  onClick={(e) => handleLocationMetricClick(e, 'products', location)}
                                  disabled={!location.location_id}
                                  className={cn(
                                    'bg-muted/30 rounded-lg border border-border/40 p-3 text-left transition-colors',
                                    location.location_id && 'cursor-pointer hover:bg-muted/50 hover:border-primary/30'
                                  )}
                                  aria-label={t('sales.products')}
                                >
                                  {(() => {
                                    const locActual = isToday ? locationActuals[location.location_id || ''] : null;
                                    const useAct = isToday && locationRevenueView === 'actual';
                                    return (
                                      <>
                                        <p className="text-xs text-muted-foreground mb-1">{t('sales.products')}</p>
                                        <p className="text-sm font-display tabular-nums">
                                          <BlurredAmount>{formatCurrency(useAct ? (locActual?.actualProductRevenue ?? 0) : location.productRevenue)}</BlurredAmount>
                                        </p>
                                      </>
                                    );
                                  })()}
                                </button>
                                {/* Transactions */}
                                <button
                                  type="button"
                                  onClick={(e) => handleLocationMetricClick(e, 'transactions', location)}
                                  disabled={!location.location_id}
                                  className={cn(
                                    'bg-muted/30 rounded-lg border border-border/40 p-3 text-left transition-colors',
                                    location.location_id && 'cursor-pointer hover:bg-muted/50 hover:border-primary/30'
                                  )}
                                  aria-label={t('sales.transactions')}
                                >
                                  {(() => {
                                    const locActual = isToday ? locationActuals[location.location_id || ''] : null;
                                    const useAct = isToday && locationRevenueView === 'actual';
                                    return (
                                      <>
                                        <p className="text-xs text-muted-foreground mb-1">{t('sales.transactions')}</p>
                                        <p className="text-sm font-display tabular-nums">
                                          <BlurredAmount>{useAct ? (locActual?.actualTransactions ?? 0) : location.totalTransactions}</BlurredAmount>
                                        </p>
                                      </>
                                    );
                                  })()}
                                </button>
                                {/* Avg Ticket */}
                                <button
                                  type="button"
                                  onClick={(e) => handleLocationMetricClick(e, 'avgTicket', location)}
                                  disabled={!location.location_id}
                                  className={cn(
                                    'bg-muted/30 rounded-lg border border-border/40 p-3 text-left transition-colors',
                                    location.location_id && 'cursor-pointer hover:bg-muted/50 hover:border-primary/30'
                                  )}
                                  aria-label={t('sales.avg_ticket')}
                                >
                                  {(() => {
                                    const locActual = isToday ? locationActuals[location.location_id || ''] : null;
                                    const useAct = isToday && locationRevenueView === 'actual';
                                    const txVal = useAct ? (locActual?.actualTransactions ?? 0) : location.totalTransactions;
                                    const revVal = useAct ? (locActual?.actualRevenue ?? 0) : location.totalRevenue;
                                    const avgVal = txVal > 0 ? revVal / txVal : 0;
                                    return (
                                      <>
                                        <p className="text-xs text-muted-foreground mb-1">{t('sales.avg_ticket')}</p>
                                        <p className="text-sm font-display tabular-nums">
                                          <BlurredAmount>{formatCurrency(isFinite(avgVal) ? Math.round(avgVal) : 0)}</BlurredAmount>
                                        </p>
                                      </>
                                    );
                                  })()}
                                </button>
                                {/* Trend */}
                                <button
                                  type="button"
                                  onClick={(e) => handleLocationMetricClick(e, 'trend', location)}
                                  disabled={!location.location_id}
                                  className={cn(
                                    'bg-muted/30 rounded-lg border border-border/40 p-3 text-left transition-colors',
                                    location.location_id && 'cursor-pointer hover:bg-muted/50 hover:border-primary/30'
                                  )}
                                  aria-label={t('sales.trend')}
                                >
                                  <p className="text-xs text-muted-foreground mb-1">{t('sales.trend')}</p>
                                  {!hideNumbers ? (
                                    <TrendSparkline 
                                      data={getLocationTrend(location.location_id).map(d => d.value)} 
                                      width={80}
                                      height={24}
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </button>
                                {/* Status (Today only) */}
                                {isToday && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleLocationMetricClick(e, 'status', location)}
                                    disabled={!location.location_id}
                                    className={cn(
                                      'bg-muted/30 rounded-lg border border-border/40 p-3 text-left transition-colors',
                                      location.location_id && 'cursor-pointer hover:bg-muted/50 hover:border-primary/30'
                                    )}
                                    aria-label={t('sales.status')}
                                  >
                                    <p className="text-xs text-muted-foreground mb-1">{t('sales.status')}</p>
                                    {(() => {
                                      const locActual = locationActuals[location.location_id || ''];
                                      const expectedRevenue = location.totalRevenue;
                                      if (!locActual || !locActual.hasActualData) {
                                        return <span className="text-xs text-muted-foreground/70">{t('sales.pending')}</span>;
                                      }
                                      if (locActual.actualRevenue >= expectedRevenue && expectedRevenue > 0) {
                                        return (
                                          <div className="space-y-0.5">
                                            <Badge variant="outline" className="text-[10px] font-normal bg-primary/10 text-primary border-primary/30">
                                              <Check className="w-3 h-3 mr-1" />
                                              {t('sales.checked_out')}
                                            </Badge>
                                            {locActual.lastEndTime && (
                                              <p className="text-[10px] text-muted-foreground/60">
                                                Last: {formatEndTime(locActual.lastEndTime)}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="space-y-0.5">
                                          <BlurredAmount>
                                            <span className="text-xs text-muted-foreground">
                                              {formatCurrency(locActual.actualRevenue)} / {formatCurrency(expectedRevenue)}
                                            </span>
                                          </BlurredAmount>
                                          {locActual.lastEndTime && (
                                            <p className="text-[10px] text-muted-foreground/60">
                                              Last: {formatEndTime(locActual.lastEndTime)}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </button>
                                )}
                              </div>
                              {/* View details link */}
                              <button
                                className="mt-3 text-xs text-primary hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(location.location_id);
                                }}
                              >
                                {t('sales.view_full_details')} →
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              {filteredLocationData.length > COLLAPSED_COUNT && (
                <div className="flex justify-center mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setLocationsExpanded(prev => !prev)}
                  >
                    {locationsExpanded 
                      ? tc('show_less') 
                      : t('sales.show_all_locations', { count: filteredLocationData.length })
                    }
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('sales.no_location_data')}</p>
              <p className="text-xs mt-1">{t('sales.sync_to_see')}</p>
            </div>
          )}
        </div>
      )}
      </>
      )}
      {/* Service/Product Drilldown Dialog */}
      <ServiceProductDrilldown
        mode={drilldownMode}
        onClose={() => {
          setDrilldownMode(null);
          setLocationDrilldownTarget(null);
        }}
        dateFrom={dateFilters.dateFrom}
        dateTo={dateFilters.dateTo}
        parentLocationId={locationDrilldownTarget ?? filterContext?.locationId}
        
      />
      {/* Retail Category Drilldown Dialog */}
      <RetailCategoryDrilldown
        category={retailCategoryDrilldown}
        onClose={() => setRetailCategoryDrilldown(null)}
        dateFrom={dateFilters.dateFrom}
        dateTo={dateFilters.dateTo}
        locationId={filterContext?.locationId}
      />
      <LocationMetricDrilldownSheet
        open={!!locationDrilldown}
        onOpenChange={(open) => !open && setLocationDrilldown(null)}
        type={locationDrilldown?.type ?? 'transactions'}
        locationId={locationDrilldown?.locationId ?? ''}
        locationName={locationDrilldown?.locationName ?? ''}
        dateFrom={dateFilters.dateFrom}
        dateTo={dateFilters.dateTo}
      />
    </Card>
  );
}
