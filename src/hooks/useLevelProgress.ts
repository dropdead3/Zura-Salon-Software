import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from './useLevelPromotionCriteria';
import { useLevelRetentionCriteria, type LevelRetentionCriteria } from './useLevelRetentionCriteria';
import { useLevelCriteriaOverrides, resolveCriteriaValue } from './useLevelCriteriaOverrides';
import { useStylistLevels } from './useStylistLevels';
import { subDays, format } from 'date-fns';
import { buildTimeOffSet, isUserOffOnDate } from '@/lib/time-off-utils';

export interface CriterionProgress {
  key: string;
  label: string;
  enabled: boolean;
  current: number;
  priorCurrent: number; // value from prior eval window for PoP trend
  target: number;
  percent: number; // 0-100+ (uncapped; over-performance flows into weighted composite)
  weight: number;
  unit: string;
  gap: number;
}

export interface RetentionStatus {
  isAtRisk: boolean;
  failures: Array<{
    key: string;
    label: string;
    current: number;
    minimum: number;
    unit: string;
  }>;
  actionType: 'coaching_flag' | 'demotion_eligible' | null;
  gracePeriodDays: number;
  evaluationWindowDays: number;
}

export interface LevelProgressResult {
  currentLevelLabel: string;
  currentLevelSlug: string;
  currentLevelId: string;
  nextLevelLabel: string | null;
  nextLevelId: string | null;
  criteria: LevelPromotionCriteria | null;
  criteriaProgress: CriterionProgress[];
  compositeScore: number; // weighted 0-100
  isFullyQualified: boolean;
  requiresApproval: boolean;
  evaluationWindowDays: number;
  retention: RetentionStatus;
  timeAtLevelDays: number;
  levelSince: string | null;
}

/**
 * Computes a stylist's real-time graduation progress against their next level's criteria,
 * plus retention status against their current level's minimums.
 */
export function useLevelProgress(userId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: allLevels = [] } = useStylistLevels();
  const { data: allCriteria = [] } = useLevelPromotionCriteria();
  const { data: allRetention = [] } = useLevelRetentionCriteria();
  const { data: criteriaOverrides = [] } = useLevelCriteriaOverrides();

  // Fetch employee profile to get current level slug + location
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-level', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level, hire_date, location_id, stylist_level_since')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch location's group_id for group-level override resolution
  const { data: locationGroup } = useQuery({
    queryKey: ['location-group-for-overrides', profile?.location_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('location_group_id')
        .eq('id', profile!.location_id!)
        .single();
      if (error) return null;
      return data?.location_group_id as string | null;
    },
    enabled: !!profile?.location_id,
  });

  // Determine current + next level + retention criteria
  const { currentLevel, nextLevel, nextCriteria, retentionCriteria } = useMemo(() => {
    if (!profile?.stylist_level || allLevels.length === 0) {
      return { currentLevel: null, nextLevel: null, nextCriteria: null, retentionCriteria: null };
    }
    const sorted = [...allLevels].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex(l => l.slug === profile.stylist_level);
    if (idx === -1) {
      return { currentLevel: null, nextLevel: null, nextCriteria: null, retentionCriteria: null };
    }

    const current = sorted[idx];
    const retCrit = allRetention.find(c => c.stylist_level_id === current.id && c.is_active && c.retention_enabled) || null;

    if (idx >= sorted.length - 1) {
      return { currentLevel: current, nextLevel: null, nextCriteria: null, retentionCriteria: retCrit };
    }
    const next = sorted[idx + 1];
    const criteria = allCriteria.find(c => c.stylist_level_id === next.id && c.is_active) || null;
    return { currentLevel: current, nextLevel: next, nextCriteria: criteria, retentionCriteria: retCrit };
  }, [profile, allLevels, allCriteria, allRetention]);

  // Fetch rolling performance data for the max of promo + retention window
  const promoEvalDays = nextCriteria?.evaluation_window_days || 30;
  const retEvalDays = retentionCriteria?.evaluation_window_days || 90;
  const maxEvalDays = Math.max(promoEvalDays, retEvalDays);
  // Double window for true retention calculation
  const fetchDays = maxEvalDays * 2;
  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, fetchDays);
  const startStr = format(windowStart, 'yyyy-MM-dd');
  const endStr = format(windowEnd, 'yyyy-MM-dd');

  const { data: salesData } = useQuery({
    queryKey: ['level-progress-sales', userId, startStr, endStr],
    queryFn: async () => {
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_transaction_items')
          .select('total_amount, tax_amount, item_type, transaction_date')
          .eq('stylist_user_id', userId!)
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        page++;
      }
      return allData;
    },
    enabled: !!userId && !!(nextCriteria || retentionCriteria),
  });

  const { data: apptData } = useQuery({
    queryKey: ['level-progress-appointments', userId, startStr, endStr],
    queryFn: async () => {
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, total_price, rebooked_at_checkout, appointment_date, status, is_new_client, duration_minutes, client_id')
          .eq('staff_user_id', userId!)
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr)
          .neq('status', 'cancelled')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        page++;
      }
      return allData;
    },
    enabled: !!userId && !!(nextCriteria || retentionCriteria),
  });

  // Fetch shift data for utilization
  const { data: shiftData } = useQuery({
    queryKey: ['level-progress-shifts', userId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('shift_date, start_time, end_time')
        .eq('user_id', userId!)
        .gte('shift_date', startStr)
        .lte('shift_date', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!(nextCriteria || retentionCriteria),
  });

  // Fetch approved time-off requests for this user
  const { data: timeOffData } = useQuery({
    queryKey: ['level-progress-timeoff', userId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('user_id, start_date, end_date, is_full_day')
        .eq('user_id', userId!)
        .eq('status', 'approved')
        .lte('start_date', endStr)
        .gte('end_date', startStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!(nextCriteria || retentionCriteria),
  });

  // Fetch latest level promotion for time-at-level
  const { data: latestPromotion } = useQuery({
    queryKey: ['level-progress-latest-promo', userId, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_promotions')
        .select('promoted_at')
        .eq('user_id', userId!)
        .eq('organization_id', orgId!)
        .order('promoted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!orgId,
  });

  const result = useMemo<LevelProgressResult | null>(() => {
    if (!currentLevel) return null;

    // Time at level
    const levelSince = (profile as any)?.stylist_level_since || latestPromotion?.promoted_at || profile?.hire_date || null;
    const timeAtLevelDays = levelSince
      ? Math.max(0, Math.floor((Date.now() - new Date(levelSince).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Helper: compute metrics for a given window (all 8 criteria)
    const computeMetrics = (evalDays: number) => {
      const evalStart = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');
      const filteredSales = (salesData || []).filter((s: any) => s.transaction_date >= evalStart);
      const filteredAppts = (apptData || []).filter(a => a.appointment_date >= evalStart && a.status !== 'no_show');

      let totalServiceRevenue = 0;
      let totalProductRevenue = 0;
      for (const item of filteredSales) {
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') {
          totalServiceRevenue += amount;
        } else if (itemType === 'product') {
          totalProductRevenue += amount;
        }
      }
      const totalRevenue = totalServiceRevenue + totalProductRevenue;
      const monthlyRevenue = evalDays > 0 ? (totalRevenue / evalDays) * 30 : 0;
      const retailPct = totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0;
      const totalAppts = filteredAppts.length;
      const rebooked = filteredAppts.filter(a => a.rebooked_at_checkout).length;
      const rebookingPct = totalAppts > 0 ? (rebooked / totalAppts) * 100 : 0;
      // Avg Ticket: sales-based revenue / unique client visits (matches POS methodology)
      const uniqueVisits = new Set(
        filteredAppts.filter((a: any) => a.client_id).map((a: any) => `${a.client_id}_${a.appointment_date}`)
      ).size || totalAppts; // fallback to appt count if no client_id data
      const avgTicket = uniqueVisits > 0 ? totalRevenue / uniqueVisits : 0;

      // New clients (monthly normalized)
      const newClients = filteredAppts.filter((a: any) => a.is_new_client === true).length;
      const newClientsMonthly = evalDays > 0 ? (newClients / evalDays) * 30 : 0;

      // True client retention rate
      const priorStart = format(subDays(new Date(), evalDays * 2), 'yyyy-MM-dd');
      const allAppts = (apptData || []).filter((a: any) => a.status !== 'no_show');
      const priorClients = new Set(
        allAppts.filter((a: any) => a.appointment_date >= priorStart && a.appointment_date < evalStart && a.client_id)
          .map((a: any) => a.client_id)
      );
      const currentClients = new Set(
        allAppts.filter((a: any) => a.appointment_date >= evalStart && a.client_id)
          .map((a: any) => a.client_id)
      );
      const returningCount = [...currentClients].filter(id => priorClients.has(id)).length;
      const retentionRate = priorClients.size > 0 ? (returningCount / priorClients.size) * 100 : 0;

      // Utilization — exclude approved time-off days
      const timeOffSet = buildTimeOffSet(timeOffData || []);
      const userShifts = (shiftData || []).filter(
        (s: any) => s.shift_date >= evalStart && !isUserOffOnDate(timeOffSet, userId!, s.shift_date)
      );
      let utilization = 0;
      if (userShifts.length > 0) {
        const totalShiftMinutes = userShifts.reduce((sum: number, s: any) => {
          const start = new Date(`${s.shift_date}T${s.start_time}`);
          const end = new Date(`${s.shift_date}T${s.end_time}`);
          return sum + Math.max(0, (end.getTime() - start.getTime()) / 60000);
        }, 0);
        const totalBookedMinutes = filteredAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
        utilization = totalShiftMinutes > 0 ? (totalBookedMinutes / totalShiftMinutes) * 100 : 0;
      } else {
        // Fallback: exclude time-off days from active day count
        const activeDaysSet = new Set(filteredAppts.map((a: any) => a.appointment_date));
        const activeDays = [...activeDaysSet].filter(d => !isUserOffOnDate(timeOffSet, userId!, d)).length;
        if (activeDays > 0) {
          const totalBookedMinutes = filteredAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
          const avgMinutesPerDay = totalBookedMinutes / activeDays;
          utilization = Math.min(100, (avgMinutesPerDay / 480) * 100);
        }
      }

      // Revenue per hour: sales-based revenue / booked hours (matches POS methodology)
      const totalBookedMinutes = filteredAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
      const revPerHour = totalBookedMinutes > 0 ? (totalRevenue / totalBookedMinutes) * 60 : 0;

      return { monthlyRevenue, retailPct, rebookingPct, avgTicket, newClientsMonthly, retentionRate, utilization, revPerHour };
    };

    // Evaluate retention
    let retention: RetentionStatus = {
      isAtRisk: false,
      failures: [],
      actionType: null,
      gracePeriodDays: 0,
      evaluationWindowDays: 0,
    };

    if (retentionCriteria) {
      // Read KPI thresholds from promotion criteria for the CURRENT level (not next)
      const currentPromoCriteria = allCriteria.find(c => c.stylist_level_id === currentLevel.id && c.is_active) || null;
      const retMetrics = computeMetrics(retentionCriteria.evaluation_window_days);
      const failures: RetentionStatus['failures'] = [];

      // Helper: resolve a retention criteria minimum with location/group overrides
      // Now sources KPI values from promotion criteria
      const resolveRet = (field: string, orgDefault: number): number => {
        if (!currentLevel) return orgDefault;
        return resolveCriteriaValue(
          orgDefault, criteriaOverrides, currentLevel.id, 'retention', field,
          profile?.location_id, locationGroup,
        ).value;
      };

      // Use promotion criteria enabled flags and thresholds as retention minimums
      if (currentPromoCriteria?.revenue_enabled) {
        const min = resolveRet('revenue_minimum', currentPromoCriteria.revenue_threshold);
        if (retMetrics.monthlyRevenue < min) failures.push({ key: 'revenue', label: 'Service Revenue', current: Math.round(retMetrics.monthlyRevenue), minimum: min, unit: '/mo' });
      }
      if (currentPromoCriteria?.retail_enabled) {
        const min = resolveRet('retail_pct_minimum', currentPromoCriteria.retail_pct_threshold);
        if (retMetrics.retailPct < min) failures.push({ key: 'retail', label: 'Retail Attachment', current: Math.round(retMetrics.retailPct * 10) / 10, minimum: min, unit: '%' });
      }
      if (currentPromoCriteria?.rebooking_enabled) {
        const min = resolveRet('rebooking_pct_minimum', currentPromoCriteria.rebooking_pct_threshold);
        if (retMetrics.rebookingPct < min) failures.push({ key: 'rebooking', label: 'Rebooking Rate', current: Math.round(retMetrics.rebookingPct * 10) / 10, minimum: min, unit: '%' });
      }
      if (currentPromoCriteria?.avg_ticket_enabled) {
        const min = resolveRet('avg_ticket_minimum', currentPromoCriteria.avg_ticket_threshold);
        if (retMetrics.avgTicket < min) failures.push({ key: 'avg_ticket', label: 'Average Ticket', current: Math.round(retMetrics.avgTicket), minimum: min, unit: '$' });
      }
      if (currentPromoCriteria?.retention_rate_enabled) {
        const min = resolveRet('retention_rate_minimum', Number(currentPromoCriteria.retention_rate_threshold));
        if (retMetrics.retentionRate < min) failures.push({ key: 'retention_rate', label: 'Client Retention', current: Math.round(retMetrics.retentionRate * 10) / 10, minimum: min, unit: '%' });
      }
      if (currentPromoCriteria?.new_clients_enabled) {
        const min = resolveRet('new_clients_minimum', Number(currentPromoCriteria.new_clients_threshold));
        if (retMetrics.newClientsMonthly < min) failures.push({ key: 'new_clients', label: 'New Clients', current: Math.round(retMetrics.newClientsMonthly * 10) / 10, minimum: min, unit: '/mo' });
      }
      if (currentPromoCriteria?.utilization_enabled) {
        const min = resolveRet('utilization_minimum', Number(currentPromoCriteria.utilization_threshold));
        if (retMetrics.utilization < min) failures.push({ key: 'utilization', label: 'Schedule Utilization', current: Math.round(retMetrics.utilization * 10) / 10, minimum: min, unit: '%' });
      }
      if (currentPromoCriteria?.rev_per_hour_enabled) {
        const min = resolveRet('rev_per_hour_minimum', Number(currentPromoCriteria.rev_per_hour_threshold));
        if (retMetrics.revPerHour < min) failures.push({ key: 'rev_per_hour', label: 'Revenue Per Hour', current: Math.round(retMetrics.revPerHour), minimum: min, unit: '$/hr' });
      }

      retention = {
        isAtRisk: failures.length > 0,
        failures,
        actionType: retentionCriteria.action_type,
        gracePeriodDays: retentionCriteria.grace_period_days,
        evaluationWindowDays: retentionCriteria.evaluation_window_days,
      };
    }

    if (!nextLevel || !nextCriteria) {
      return {
        currentLevelLabel: currentLevel.label,
        currentLevelSlug: currentLevel.slug,
        currentLevelId: currentLevel.id,
        nextLevelLabel: null,
        nextLevelId: null,
        criteria: null,
        criteriaProgress: [],
        compositeScore: 100,
        isFullyQualified: false,
        requiresApproval: false,
        evaluationWindowDays: 0,
        retention,
        timeAtLevelDays,
        levelSince,
      };
    }

    // Compute promotion progress — current and prior windows for trend arrows
    const promoMetrics = computeMetrics(promoEvalDays);
    const priorPromoMetrics = computeMetrics(promoEvalDays * 2); // 2x window gives overall; subtract current for prior
    // To get true "prior window only" metrics, we'd need a separate windowed calc.
    // Simpler approach: compute metrics for the prior window specifically.
    const computePriorMetrics = (evalDays: number) => {
      const evalStart = format(subDays(new Date(), evalDays * 2), 'yyyy-MM-dd');
      const evalEnd = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');
      const filteredSales = (salesData || []).filter((s: any) => s.transaction_date >= evalStart && s.transaction_date < evalEnd);
      const filteredAppts = (apptData || []).filter(a => a.appointment_date >= evalStart && a.appointment_date < evalEnd && a.status !== 'no_show');

      let totalServiceRevenue = 0;
      let totalProductRevenue = 0;
      for (const item of filteredSales) {
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        if (item.item_type === 'service') {
          totalServiceRevenue += amount;
        } else if (item.item_type === 'product') {
          totalProductRevenue += amount;
        }
      }
      const totalRevenue = totalServiceRevenue + totalProductRevenue;
      const monthlyRevenue = evalDays > 0 ? (totalRevenue / evalDays) * 30 : 0;
      const retailPct = totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0;
      const totalAppts = filteredAppts.length;
      const rebooked = filteredAppts.filter(a => a.rebooked_at_checkout).length;
      const rebookingPct = totalAppts > 0 ? (rebooked / totalAppts) * 100 : 0;
      // Avg Ticket: sales-based revenue / unique client visits (matches POS methodology)
      const uniqueVisits = new Set(
        filteredAppts.filter((a: any) => a.client_id).map((a: any) => `${a.client_id}_${a.appointment_date}`)
      ).size || totalAppts;
      const avgTicket = uniqueVisits > 0 ? totalRevenue / uniqueVisits : 0;
      const newClients = filteredAppts.filter((a: any) => a.is_new_client === true).length;
      const newClientsMonthly = evalDays > 0 ? (newClients / evalDays) * 30 : 0;

      // Retention — prior's prior vs prior
      const pp = format(subDays(new Date(), evalDays * 3), 'yyyy-MM-dd');
      const allA = (apptData || []).filter((a: any) => a.status !== 'no_show');
      const ppClients = new Set(allA.filter((a: any) => a.appointment_date >= pp && a.appointment_date < evalStart && a.client_id).map((a: any) => a.client_id));
      const pClients = new Set(allA.filter((a: any) => a.appointment_date >= evalStart && a.appointment_date < evalEnd && a.client_id).map((a: any) => a.client_id));
      const retCount = [...pClients].filter(id => ppClients.has(id)).length;
      const retentionRate = ppClients.size > 0 ? (retCount / ppClients.size) * 100 : 0;

      // Utilization
      const timeOffSet = buildTimeOffSet(timeOffData || []);
      const userShifts = (shiftData || []).filter((s: any) => s.shift_date >= evalStart && s.shift_date < evalEnd && !isUserOffOnDate(timeOffSet, userId!, s.shift_date));
      let utilization = 0;
      if (userShifts.length > 0) {
        const totalShiftMin = userShifts.reduce((sum: number, s: any) => {
          const st = new Date(`${s.shift_date}T${s.start_time}`);
          const en = new Date(`${s.shift_date}T${s.end_time}`);
          return sum + Math.max(0, (en.getTime() - st.getTime()) / 60000);
        }, 0);
        const totalBookMin = filteredAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
        utilization = totalShiftMin > 0 ? (totalBookMin / totalShiftMin) * 100 : 0;
      } else {
        const activeDaysSet = new Set(filteredAppts.map((a: any) => a.appointment_date));
        const activeDays = [...activeDaysSet].filter(d => !isUserOffOnDate(timeOffSet, userId!, d)).length;
        if (activeDays > 0) {
          const totalBookMin = filteredAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
          utilization = Math.min(100, ((totalBookMin / activeDays) / 480) * 100);
        }
      }

      // Revenue per hour: sales-based revenue / booked hours (matches POS methodology)
      const totalBookMin = filteredAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
      const revPerHour = totalBookMin > 0 ? (totalRevenue / totalBookMin) * 60 : 0;

      return { monthlyRevenue, retailPct, rebookingPct, avgTicket, newClientsMonthly, retentionRate, utilization, revPerHour };
    };

    const priorMetrics = computePriorMetrics(promoEvalDays);

    const tenureDays = profile?.hire_date
      ? Math.max(0, Math.floor((Date.now() - new Date(profile.hire_date).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const progress: CriterionProgress[] = [];

    // Helper: resolve a promotion criteria threshold with location/group overrides
    const resolvePromo = (field: string, orgDefault: number): number => {
      if (!nextLevel) return orgDefault;
      return resolveCriteriaValue(
        orgDefault, criteriaOverrides, nextLevel.id, 'promotion', field,
        profile?.location_id, locationGroup,
      ).value;
    };

    if (nextCriteria.revenue_enabled) {
      const target = resolvePromo('revenue_threshold', nextCriteria.revenue_threshold);
      progress.push({
        key: 'revenue', label: 'Service Revenue', enabled: true,
        current: Math.round(promoMetrics.monthlyRevenue), priorCurrent: Math.round(priorMetrics.monthlyRevenue), target,
        percent: target > 0 ? (promoMetrics.monthlyRevenue / target) * 100 : 0,
        weight: nextCriteria.revenue_weight, unit: '/mo',
        gap: Math.max(0, target - promoMetrics.monthlyRevenue),
      });
    }
    if (nextCriteria.retail_enabled) {
      const target = resolvePromo('retail_pct_threshold', nextCriteria.retail_pct_threshold);
      progress.push({
        key: 'retail', label: 'Retail Attachment', enabled: true,
        current: Math.round(promoMetrics.retailPct * 10) / 10, priorCurrent: Math.round(priorMetrics.retailPct * 10) / 10, target,
        percent: target > 0 ? (promoMetrics.retailPct / target) * 100 : 0,
        weight: nextCriteria.retail_weight, unit: '%',
        gap: Math.max(0, target - promoMetrics.retailPct),
      });
    }
    if (nextCriteria.rebooking_enabled) {
      const target = resolvePromo('rebooking_pct_threshold', nextCriteria.rebooking_pct_threshold);
      progress.push({
        key: 'rebooking', label: 'Rebooking Rate', enabled: true,
        current: Math.round(promoMetrics.rebookingPct * 10) / 10, priorCurrent: Math.round(priorMetrics.rebookingPct * 10) / 10, target,
        percent: target > 0 ? (promoMetrics.rebookingPct / target) * 100 : 0,
        weight: nextCriteria.rebooking_weight, unit: '%',
        gap: Math.max(0, target - promoMetrics.rebookingPct),
      });
    }
    if (nextCriteria.avg_ticket_enabled) {
      const target = resolvePromo('avg_ticket_threshold', nextCriteria.avg_ticket_threshold);
      progress.push({
        key: 'avg_ticket', label: 'Average Ticket', enabled: true,
        current: Math.round(promoMetrics.avgTicket), priorCurrent: Math.round(priorMetrics.avgTicket), target,
        percent: target > 0 ? (promoMetrics.avgTicket / target) * 100 : 0,
        weight: nextCriteria.avg_ticket_weight, unit: '$',
        gap: Math.max(0, target - promoMetrics.avgTicket),
      });
    }
    if (nextCriteria.retention_rate_enabled) {
      const target = resolvePromo('retention_rate_threshold', Number(nextCriteria.retention_rate_threshold));
      progress.push({
        key: 'retention_rate', label: 'Client Retention', enabled: true,
        current: Math.round(promoMetrics.retentionRate * 10) / 10, priorCurrent: Math.round(priorMetrics.retentionRate * 10) / 10, target,
        percent: target > 0 ? (promoMetrics.retentionRate / target) * 100 : 0,
        weight: nextCriteria.retention_rate_weight, unit: '%',
        gap: Math.max(0, target - promoMetrics.retentionRate),
      });
    }
    if (nextCriteria.new_clients_enabled) {
      const target = resolvePromo('new_clients_threshold', Number(nextCriteria.new_clients_threshold));
      progress.push({
        key: 'new_clients', label: 'New Clients', enabled: true,
        current: Math.round(promoMetrics.newClientsMonthly * 10) / 10, priorCurrent: Math.round(priorMetrics.newClientsMonthly * 10) / 10, target,
        percent: target > 0 ? (promoMetrics.newClientsMonthly / target) * 100 : 0,
        weight: nextCriteria.new_clients_weight, unit: '/mo',
        gap: Math.max(0, target - promoMetrics.newClientsMonthly),
      });
    }
    if (nextCriteria.utilization_enabled) {
      const target = resolvePromo('utilization_threshold', Number(nextCriteria.utilization_threshold));
      progress.push({
        key: 'utilization', label: 'Schedule Utilization', enabled: true,
        current: Math.round(promoMetrics.utilization * 10) / 10, priorCurrent: Math.round(priorMetrics.utilization * 10) / 10, target,
        percent: target > 0 ? (promoMetrics.utilization / target) * 100 : 0,
        weight: nextCriteria.utilization_weight, unit: '%',
        gap: Math.max(0, target - promoMetrics.utilization),
      });
    }
    if (nextCriteria.rev_per_hour_enabled) {
      const target = resolvePromo('rev_per_hour_threshold', Number(nextCriteria.rev_per_hour_threshold));
      progress.push({
        key: 'rev_per_hour', label: 'Revenue Per Hour', enabled: true,
        current: Math.round(promoMetrics.revPerHour), priorCurrent: Math.round(priorMetrics.revPerHour), target,
        percent: target > 0 ? (promoMetrics.revPerHour / target) * 100 : 0,
        weight: nextCriteria.rev_per_hour_weight, unit: '$/hr',
        gap: Math.max(0, target - promoMetrics.revPerHour),
      });
    }
    if (nextCriteria.tenure_enabled) {
      const target = nextCriteria.tenure_days;
      progress.push({
        key: 'tenure', label: 'Level Tenure', enabled: true,
        current: tenureDays, priorCurrent: tenureDays, target,
        percent: target > 0 ? Math.min(100, (tenureDays / target) * 100) : 0,
        weight: 0, unit: 'd',
        gap: Math.max(0, target - tenureDays),
      });
    }

    const weightedCriteria = progress.filter(p => p.weight > 0);
    const totalWeight = weightedCriteria.reduce((sum, p) => sum + p.weight, 0);
    const compositeScore = totalWeight > 0
      ? weightedCriteria.reduce((sum, p) => sum + (p.percent * p.weight) / totalWeight, 0)
      : 0;
    const tenurePasses = !nextCriteria.tenure_enabled || tenureDays >= nextCriteria.tenure_days;
    const isFullyQualified = compositeScore >= 100 && tenurePasses;

    return {
      currentLevelLabel: currentLevel.label,
      currentLevelSlug: currentLevel.slug,
      currentLevelId: currentLevel.id,
      nextLevelLabel: nextLevel.label,
      nextLevelId: nextLevel.id,
      criteria: nextCriteria,
      criteriaProgress: progress,
      compositeScore: Math.round(compositeScore),
      isFullyQualified,
      requiresApproval: nextCriteria.requires_manual_approval,
      evaluationWindowDays: promoEvalDays,
      retention,
      timeAtLevelDays,
      levelSince,
    };
  }, [currentLevel, nextLevel, nextCriteria, retentionCriteria, salesData, apptData, shiftData, timeOffData, profile, promoEvalDays, latestPromotion, criteriaOverrides, locationGroup]);

  return result;
}
