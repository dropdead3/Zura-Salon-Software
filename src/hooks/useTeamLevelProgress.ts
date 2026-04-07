import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from './useLevelPromotionCriteria';
import { useLevelRetentionCriteria, type LevelRetentionCriteria } from './useLevelRetentionCriteria';
import { useLevelCriteriaOverrides, resolveCriteriaValue } from './useLevelCriteriaOverrides';
import { useStylistLevels, type StylistLevel } from './useStylistLevels';
import { subDays, format } from 'date-fns';
import { buildTimeOffSet, isUserOffOnDate } from '@/lib/time-off-utils';
import type { CriterionProgress } from './useLevelProgress';

export type GraduationStatus = 'ready' | 'in_progress' | 'needs_attention' | 'at_top_level' | 'no_criteria' | 'at_risk' | 'below_standard';

export interface RetentionFailure {
  key: string;
  label: string;
  current: number;
  minimum: number;
  unit: string;
}

export interface TeamMemberProgress {
  userId: string;
  fullName: string;
  photoUrl: string | null;
  hireDate: string | null;
  currentLevel: StylistLevel | null;
  currentLevelIndex: number;
  nextLevel: StylistLevel | null;
  criteria: LevelPromotionCriteria | null;
  criteriaProgress: CriterionProgress[];
  compositeScore: number;
  isFullyQualified: boolean;
  requiresApproval: boolean;
  evaluationWindowDays: number;
  status: GraduationStatus;
  // Retention fields
  retentionCriteria: LevelRetentionCriteria | null;
  retentionFailures: RetentionFailure[];
  retentionActionType: 'coaching_flag' | 'demotion_eligible' | null;
  retentionGracePeriodDays: number;
  // Informational context
  noShowRate: number | null;
  // Time at current level
  timeAtLevelDays: number;
  levelSince: string | null;
}

export function useTeamLevelProgress() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: allLevels = [] } = useStylistLevels();
  const { data: allCriteria = [] } = useLevelPromotionCriteria();
  const { data: allRetention = [] } = useLevelRetentionCriteria();
  const { data: criteriaOverrides = [] } = useLevelCriteriaOverrides();

  // Fetch all active employee profiles with stylist levels + location
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['team-profiles-for-graduation', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, photo_url, stylist_level, hire_date, is_active, location_id, stylist_level_since')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .not('stylist_level', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch location → group mappings for override resolution
  const { data: locationGroupMap = {} } = useQuery({
    queryKey: ['location-group-map', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, location_group_id')
        .eq('organization_id', orgId!);
      if (error) return {};
      const map: Record<string, string | null> = {};
      (data || []).forEach((l: any) => { map[l.id] = l.location_group_id; });
      return map;
    },
    enabled: !!orgId,
  });

  // Determine the max evaluation window needed (from both promotion and retention)
  const maxWindowDays = useMemo(() => {
    const promoWindows = allCriteria.map(c => c.evaluation_window_days);
    const retWindows = allRetention.map(c => c.evaluation_window_days);
    const all = [...promoWindows, ...retWindows];
    if (all.length === 0) return 90;
    return Math.max(...all, 30);
  }, [allCriteria, allRetention]);

  // Double the window so true retention has a full prior-period comparison
  const fetchWindowDays = maxWindowDays * 2;
  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, fetchWindowDays);
  const startStr = format(windowStart, 'yyyy-MM-dd');
  const endStr = format(windowEnd, 'yyyy-MM-dd');

  const userIds = useMemo(() => profiles.map(p => p.user_id), [profiles]);

  // Batch fetch sales data for all team members
  const { data: allSalesData = [], isLoading: loadingSales } = useQuery({
    queryKey: ['team-graduation-sales', orgId, startStr, endStr, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_daily_sales_summary')
          .select('user_id, service_revenue, product_revenue, summary_date')
          .in('user_id', userIds)
          .gte('summary_date', startStr)
          .lte('summary_date', endStr)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      return allData;
    },
    enabled: !!orgId && userIds.length > 0,
  });

  // Batch fetch appointment data for all team members
  const { data: allApptData = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['team-graduation-appts', orgId, startStr, endStr, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('appointments')
          .select('staff_user_id, total_price, rebooked_at_checkout, appointment_date, status, is_new_client, duration_minutes, client_id')
          .in('staff_user_id', userIds)
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr)
          .neq('status', 'cancelled')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      return allData;
    },
    enabled: !!orgId && userIds.length > 0,
  });

  // Batch fetch shift data for utilization calculation
  const { data: allShiftData = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['team-graduation-shifts', orgId, startStr, endStr, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('user_id, shift_date, start_time, end_time')
        .in('user_id', userIds)
        .gte('shift_date', startStr)
        .lte('shift_date', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && userIds.length > 0,
  });
  // Batch fetch latest level_promotions per user for time-at-level
  const { data: allLevelPromotions = [] } = useQuery({
    queryKey: ['team-graduation-level-promotions', orgId, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('level_promotions')
        .select('user_id, promoted_at')
        .eq('organization_id', orgId!)
        .in('user_id', userIds)
        .order('promoted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && userIds.length > 0,
  });

  // Batch fetch approved time-off requests for all team members
  const { data: allTimeOffData = [] } = useQuery({
    queryKey: ['team-graduation-timeoff', orgId, startStr, endStr, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('user_id, start_date, end_date, is_full_day')
        .eq('organization_id', orgId!)
        .eq('status', 'approved')
        .in('user_id', userIds)
        .lte('start_date', endStr)
        .gte('end_date', startStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && userIds.length > 0,
  });

  const isLoading = loadingProfiles || loadingSales || loadingAppts || loadingShifts;

  const teamProgress = useMemo<TeamMemberProgress[]>(() => {
    if (profiles.length === 0 || allLevels.length === 0) return [];

    const sortedLevels = [...allLevels].sort((a, b) => a.display_order - b.display_order);

    return profiles.map(profile => {
      const idx = sortedLevels.findIndex(l => l.slug === profile.stylist_level);
      const currentLevel = idx >= 0 ? sortedLevels[idx] : null;
      const isTopLevel = idx >= 0 && idx >= sortedLevels.length - 1;
      const nextLevel = !isTopLevel && idx >= 0 ? sortedLevels[idx + 1] : null;
      const criteria = nextLevel
        ? allCriteria.find(c => c.stylist_level_id === nextLevel.id && c.is_active) || null
        : null;

      // Find retention criteria for CURRENT level
      const retCriteria = currentLevel
        ? allRetention.find(c => c.stylist_level_id === currentLevel.id && c.is_active && c.retention_enabled) || null
        : null;

      // Helper to compute performance metrics for a given window
      const computeMetrics = (evalDays: number) => {
        const evalStart = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');
        const userSales = allSalesData.filter(
          s => s.user_id === profile.user_id && s.summary_date >= evalStart
        );
        const userAppts = allApptData.filter(
          a => a.staff_user_id === profile.user_id && a.appointment_date >= evalStart
        );

        const totalServiceRevenue = userSales.reduce((s: number, r: any) => s + (Number(r.service_revenue) || 0), 0);
        const totalProductRevenue = userSales.reduce((s: number, r: any) => s + (Number(r.product_revenue) || 0), 0);
        const totalRevenue = totalServiceRevenue + totalProductRevenue;
        const monthlyRevenue = evalDays > 0 ? (totalRevenue / evalDays) * 30 : 0;
        const retailPct = totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0;
        const completedAppts = userAppts.filter((a: any) => a.status !== 'no_show');
        const totalApptCount = completedAppts.length;
        const rebooked = completedAppts.filter((a: any) => a.rebooked_at_checkout).length;
        const rebookingPct = totalApptCount > 0 ? (rebooked / totalApptCount) * 100 : 0;
        const avgTicket = totalApptCount > 0
          ? completedAppts.reduce((s: number, a: any) => s + (Number(a.total_price) || 0), 0) / totalApptCount
          : 0;
        // New clients count (normalized to monthly)
        const newClients = completedAppts.filter((a: any) => a.is_new_client === true).length;
        const newClientsMonthly = evalDays > 0 ? (newClients / evalDays) * 30 : 0;
        // True client retention rate: compare unique clients in prior window vs current window
        const priorStart = format(subDays(new Date(), evalDays * 2), 'yyyy-MM-dd');
        const allUserApptsFull = allApptData.filter(
          (a: any) => a.staff_user_id === profile.user_id && a.status !== 'no_show' && a.status !== 'cancelled'
        );
        const priorClients = new Set(
          allUserApptsFull
            .filter((a: any) => a.appointment_date >= priorStart && a.appointment_date < evalStart && a.client_id)
            .map((a: any) => a.client_id)
        );
        const currentClients = new Set(
          allUserApptsFull
            .filter((a: any) => a.appointment_date >= evalStart && a.client_id)
            .map((a: any) => a.client_id)
        );
        const returningCount = [...currentClients].filter(id => priorClients.has(id)).length;
        const retentionRate = priorClients.size > 0 ? (returningCount / priorClients.size) * 100 : 0;

        // Utilization calculation — exclude approved time-off days
        const timeOffSet = buildTimeOffSet(allTimeOffData);
        const userShifts = allShiftData.filter(
          (s: any) => s.user_id === profile.user_id && s.shift_date >= evalStart
            && !isUserOffOnDate(timeOffSet, profile.user_id, s.shift_date)
        );
        let utilization = 0;
        if (userShifts.length > 0) {
          // Shift-based: booked hours / shift hours (time-off days excluded)
          const totalShiftMinutes = userShifts.reduce((sum: number, s: any) => {
            const start = new Date(`${s.shift_date}T${s.start_time}`);
            const end = new Date(`${s.shift_date}T${s.end_time}`);
            return sum + Math.max(0, (end.getTime() - start.getTime()) / 60000);
          }, 0);
          const totalBookedMinutes = completedAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
          utilization = totalShiftMinutes > 0 ? (totalBookedMinutes / totalShiftMinutes) * 100 : 0;
        } else {
          // Fallback: booking density — exclude time-off days from active day count
          const activeDaysSet = new Set(completedAppts.map((a: any) => a.appointment_date));
          const activeDays = [...activeDaysSet].filter(d => !isUserOffOnDate(timeOffSet, profile.user_id, d)).length;
          if (activeDays > 0) {
            const totalBookedMinutes = completedAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
            const avgMinutesPerDay = totalBookedMinutes / activeDays;
            utilization = Math.min(100, (avgMinutesPerDay / 480) * 100); // 480 = 8h workday
          }
        }
        // Revenue per hour calculation
        const totalBookedMinutes = completedAppts.reduce((sum: number, a: any) => sum + (Number(a.duration_minutes) || 60), 0);
        const totalApptRevenue = completedAppts.reduce((s: number, a: any) => s + (Number(a.total_price) || 0), 0);
        const revPerHour = totalBookedMinutes > 0 ? (totalApptRevenue / totalBookedMinutes) * 60 : 0;

        return { monthlyRevenue, retailPct, rebookingPct, avgTicket, newClientsMonthly, retentionRate, utilization, revPerHour };
      };

      // Compute time at current level
      const latestPromo = allLevelPromotions.find((p: any) => p.user_id === profile.user_id);
      const levelSince = (profile as any)?.stylist_level_since || latestPromo?.promoted_at || profile.hire_date || null;
      const timeAtLevelDays = levelSince
        ? Math.max(0, Math.floor((Date.now() - new Date(levelSince).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      // Compute no-show rate (informational, uses full window)
      const allUserAppts = allApptData.filter(a => a.staff_user_id === profile.user_id);
      const noShowCount = allUserAppts.filter((a: any) => a.status === 'no_show').length;
      const noShowRate = allUserAppts.length > 0 ? (noShowCount / allUserAppts.length) * 100 : null;

      // Evaluate retention failures
      let retentionFailures: RetentionFailure[] = [];
      if (retCriteria) {
        const retMetrics = computeMetrics(retCriteria.evaluation_window_days);
        const userLocId = profile.location_id;
        const userGroupId = userLocId ? (locationGroupMap as Record<string, string | null>)[userLocId] ?? null : null;

        const resolveRet = (field: string, orgDefault: number): number => {
          if (!currentLevel) return orgDefault;
          return resolveCriteriaValue(orgDefault, criteriaOverrides, currentLevel.id, 'retention', field, userLocId, userGroupId).value;
        };

        if (retCriteria.revenue_enabled) { const min = resolveRet('revenue_minimum', retCriteria.revenue_minimum); if (retMetrics.monthlyRevenue < min) retentionFailures.push({ key: 'revenue', label: 'Service Revenue', current: Math.round(retMetrics.monthlyRevenue), minimum: min, unit: '/mo' }); }
        if (retCriteria.retail_enabled) { const min = resolveRet('retail_pct_minimum', retCriteria.retail_pct_minimum); if (retMetrics.retailPct < min) retentionFailures.push({ key: 'retail', label: 'Retail Attachment', current: Math.round(retMetrics.retailPct * 10) / 10, minimum: min, unit: '%' }); }
        if (retCriteria.rebooking_enabled) { const min = resolveRet('rebooking_pct_minimum', retCriteria.rebooking_pct_minimum); if (retMetrics.rebookingPct < min) retentionFailures.push({ key: 'rebooking', label: 'Rebooking Rate', current: Math.round(retMetrics.rebookingPct * 10) / 10, minimum: min, unit: '%' }); }
        if (retCriteria.avg_ticket_enabled) { const min = resolveRet('avg_ticket_minimum', retCriteria.avg_ticket_minimum); if (retMetrics.avgTicket < min) retentionFailures.push({ key: 'avg_ticket', label: 'Average Ticket', current: Math.round(retMetrics.avgTicket), minimum: min, unit: '$' }); }
        if (retCriteria.retention_rate_enabled) { const min = resolveRet('retention_rate_minimum', Number(retCriteria.retention_rate_minimum)); if (retMetrics.retentionRate < min) retentionFailures.push({ key: 'retention_rate', label: 'Client Retention', current: Math.round(retMetrics.retentionRate * 10) / 10, minimum: min, unit: '%' }); }
        if (retCriteria.new_clients_enabled) { const min = resolveRet('new_clients_minimum', Number(retCriteria.new_clients_minimum)); if (retMetrics.newClientsMonthly < min) retentionFailures.push({ key: 'new_clients', label: 'New Clients', current: Math.round(retMetrics.newClientsMonthly * 10) / 10, minimum: min, unit: '/mo' }); }
        if (retCriteria.utilization_enabled) { const min = resolveRet('utilization_minimum', Number(retCriteria.utilization_minimum)); if (retMetrics.utilization < min) retentionFailures.push({ key: 'utilization', label: 'Schedule Utilization', current: Math.round(retMetrics.utilization * 10) / 10, minimum: min, unit: '%' }); }
        if (retCriteria.rev_per_hour_enabled) { const min = resolveRet('rev_per_hour_minimum', Number(retCriteria.rev_per_hour_minimum)); if (retMetrics.revPerHour < min) retentionFailures.push({ key: 'rev_per_hour', label: 'Revenue Per Hour', current: Math.round(retMetrics.revPerHour), minimum: min, unit: '$/hr' }); }
      }

      if (isTopLevel) {
        const retStatus = retentionFailures.length > 0
          ? (retCriteria?.action_type === 'demotion_eligible' ? 'below_standard' : 'at_risk')
          : 'at_top_level';
        return {
          userId: profile.user_id, fullName: profile.full_name || 'Unknown',
          photoUrl: profile.photo_url, hireDate: profile.hire_date,
          currentLevel, currentLevelIndex: idx, nextLevel: null,
          criteria: null, criteriaProgress: [], compositeScore: 100,
          isFullyQualified: false, requiresApproval: false, evaluationWindowDays: 0,
          status: retStatus as GraduationStatus,
          retentionCriteria: retCriteria, retentionFailures,
          retentionActionType: retCriteria?.action_type || null,
          retentionGracePeriodDays: retCriteria?.grace_period_days || 0,
          noShowRate,
          timeAtLevelDays, levelSince,
        };
      }

      if (!criteria || !nextLevel) {
        const retStatus = retentionFailures.length > 0
          ? (retCriteria?.action_type === 'demotion_eligible' ? 'below_standard' : 'at_risk')
          : 'no_criteria';
        return {
          userId: profile.user_id, fullName: profile.full_name || 'Unknown',
          photoUrl: profile.photo_url, hireDate: profile.hire_date,
          currentLevel, currentLevelIndex: idx, nextLevel,
          criteria: null, criteriaProgress: [], compositeScore: 0,
          isFullyQualified: false, requiresApproval: false, evaluationWindowDays: 0,
          status: retStatus as GraduationStatus,
          retentionCriteria: retCriteria, retentionFailures,
          retentionActionType: retCriteria?.action_type || null,
          retentionGracePeriodDays: retCriteria?.grace_period_days || 0,
          noShowRate,
          timeAtLevelDays, levelSince,
        };
      }

      // Filter data to this user's evaluation window for promotion
      const evalDays = criteria.evaluation_window_days || 30;
      const promoMetrics = computeMetrics(evalDays);

      const tenureDays = profile.hire_date
        ? Math.max(0, Math.floor((Date.now() - new Date(profile.hire_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      const progress: CriterionProgress[] = [];

      // Resolve promotion thresholds with location/group overrides
      const userLocId = profile.location_id;
      const userGroupId = userLocId ? (locationGroupMap as Record<string, string | null>)[userLocId] ?? null : null;
      const resolvePromo = (field: string, orgDefault: number): number => {
        if (!nextLevel) return orgDefault;
        return resolveCriteriaValue(orgDefault, criteriaOverrides, nextLevel.id, 'promotion', field, userLocId, userGroupId).value;
      };

      if (criteria.revenue_enabled) {
        const target = resolvePromo('revenue_threshold', criteria.revenue_threshold);
        progress.push({ key: 'revenue', label: 'Service Revenue', enabled: true, current: Math.round(promoMetrics.monthlyRevenue), priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.monthlyRevenue / target) * 100 : 0, weight: criteria.revenue_weight, unit: '/mo', gap: Math.max(0, target - promoMetrics.monthlyRevenue) });
      }
      if (criteria.retail_enabled) {
        const target = resolvePromo('retail_pct_threshold', criteria.retail_pct_threshold);
        progress.push({ key: 'retail', label: 'Retail Attachment', enabled: true, current: Math.round(promoMetrics.retailPct * 10) / 10, priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.retailPct / target) * 100 : 0, weight: criteria.retail_weight, unit: '%', gap: Math.max(0, target - promoMetrics.retailPct) });
      }
      if (criteria.rebooking_enabled) {
        const target = resolvePromo('rebooking_pct_threshold', criteria.rebooking_pct_threshold);
        progress.push({ key: 'rebooking', label: 'Rebooking Rate', enabled: true, current: Math.round(promoMetrics.rebookingPct * 10) / 10, priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.rebookingPct / target) * 100 : 0, weight: criteria.rebooking_weight, unit: '%', gap: Math.max(0, target - promoMetrics.rebookingPct) });
      }
      if (criteria.avg_ticket_enabled) {
        const target = resolvePromo('avg_ticket_threshold', criteria.avg_ticket_threshold);
        progress.push({ key: 'avg_ticket', label: 'Average Ticket', enabled: true, current: Math.round(promoMetrics.avgTicket), priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.avgTicket / target) * 100 : 0, weight: criteria.avg_ticket_weight, unit: '$', gap: Math.max(0, target - promoMetrics.avgTicket) });
      }
      if (criteria.retention_rate_enabled) {
        const target = resolvePromo('retention_rate_threshold', Number(criteria.retention_rate_threshold));
        progress.push({ key: 'retention_rate', label: 'Client Retention', enabled: true, current: Math.round(promoMetrics.retentionRate * 10) / 10, priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.retentionRate / target) * 100 : 0, weight: criteria.retention_rate_weight, unit: '%', gap: Math.max(0, target - promoMetrics.retentionRate) });
      }
      if (criteria.new_clients_enabled) {
        const target = resolvePromo('new_clients_threshold', Number(criteria.new_clients_threshold));
        progress.push({ key: 'new_clients', label: 'New Clients', enabled: true, current: Math.round(promoMetrics.newClientsMonthly * 10) / 10, priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.newClientsMonthly / target) * 100 : 0, weight: criteria.new_clients_weight, unit: '/mo', gap: Math.max(0, target - promoMetrics.newClientsMonthly) });
      }
      if (criteria.utilization_enabled) {
        const target = resolvePromo('utilization_threshold', Number(criteria.utilization_threshold));
        progress.push({ key: 'utilization', label: 'Schedule Utilization', enabled: true, current: Math.round(promoMetrics.utilization * 10) / 10, priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.utilization / target) * 100 : 0, weight: criteria.utilization_weight, unit: '%', gap: Math.max(0, target - promoMetrics.utilization) });
      }
      if (criteria.rev_per_hour_enabled) {
        const target = resolvePromo('rev_per_hour_threshold', Number(criteria.rev_per_hour_threshold));
        progress.push({ key: 'rev_per_hour', label: 'Revenue Per Hour', enabled: true, current: Math.round(promoMetrics.revPerHour), priorCurrent: 0, target, percent: target > 0 ? (promoMetrics.revPerHour / target) * 100 : 0, weight: criteria.rev_per_hour_weight, unit: '$/hr', gap: Math.max(0, target - promoMetrics.revPerHour) });
      }
      if (criteria.tenure_enabled) {
        const target = criteria.tenure_days;
        progress.push({ key: 'tenure', label: 'Level Tenure', enabled: true, current: tenureDays, priorCurrent: tenureDays, target, percent: target > 0 ? Math.min(100, (tenureDays / target) * 100) : 0, weight: 0, unit: 'd', gap: Math.max(0, target - tenureDays) });
      }

      const weightedCriteria = progress.filter(p => p.weight > 0);
      const totalWeight = weightedCriteria.reduce((s, p) => s + p.weight, 0);
      const compositeScore = totalWeight > 0
        ? weightedCriteria.reduce((s, p) => s + (p.percent * p.weight) / totalWeight, 0)
        : 0;
      const tenurePasses = !criteria.tenure_enabled || tenureDays >= criteria.tenure_days;
      const isFullyQualified = compositeScore >= 100 && tenurePasses;

      const score = Math.round(compositeScore);

      let status: GraduationStatus = 'in_progress';
      if (retentionFailures.length > 0) {
        status = retCriteria?.action_type === 'demotion_eligible' ? 'below_standard' : 'at_risk';
      } else if (isFullyQualified) {
        status = 'ready';
      } else if (score < 25) {
        status = 'needs_attention';
      }

      return {
        userId: profile.user_id, fullName: profile.full_name || 'Unknown',
        photoUrl: profile.photo_url, hireDate: profile.hire_date,
        currentLevel, currentLevelIndex: idx, nextLevel, criteria,
        criteriaProgress: progress, compositeScore: score, isFullyQualified,
        requiresApproval: criteria.requires_manual_approval, evaluationWindowDays: evalDays,
        status,
        retentionCriteria: retCriteria, retentionFailures,
        retentionActionType: retCriteria?.action_type || null,
        retentionGracePeriodDays: retCriteria?.grace_period_days || 0,
        noShowRate,
        timeAtLevelDays, levelSince,
      };
    }).sort((a, b) => {
      const statusOrder: Record<GraduationStatus, number> = {
        at_risk: 0, below_standard: 1, ready: 2, in_progress: 3, needs_attention: 4, no_criteria: 5, at_top_level: 6,
      };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return b.compositeScore - a.compositeScore;
    });
  }, [profiles, allLevels, allCriteria, allRetention, allSalesData, allApptData, allShiftData, allLevelPromotions, allTimeOffData, criteriaOverrides, locationGroupMap]);

  const counts = useMemo(() => {
    const ready = teamProgress.filter(t => t.status === 'ready').length;
    const inProgress = teamProgress.filter(t => t.status === 'in_progress').length;
    const needsAttention = teamProgress.filter(t => t.status === 'needs_attention').length;
    const atTopLevel = teamProgress.filter(t => t.status === 'at_top_level').length;
    const noCriteria = teamProgress.filter(t => t.status === 'no_criteria').length;
    const atRisk = teamProgress.filter(t => t.status === 'at_risk').length;
    const belowStandard = teamProgress.filter(t => t.status === 'below_standard').length;
    return { ready, inProgress, needsAttention, atTopLevel, noCriteria, atRisk, belowStandard, total: teamProgress.length };
  }, [teamProgress]);

  return { teamProgress, counts, isLoading };
}
