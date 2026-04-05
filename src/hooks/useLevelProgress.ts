import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from './useLevelPromotionCriteria';
import { useLevelRetentionCriteria, type LevelRetentionCriteria } from './useLevelRetentionCriteria';
import { useStylistLevels } from './useStylistLevels';
import { subDays, format } from 'date-fns';

export interface CriterionProgress {
  key: string;
  label: string;
  enabled: boolean;
  current: number;
  target: number;
  percent: number; // 0-100
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
  nextLevelLabel: string | null;
  nextLevelId: string | null;
  criteria: LevelPromotionCriteria | null;
  criteriaProgress: CriterionProgress[];
  compositeScore: number; // weighted 0-100
  isFullyQualified: boolean;
  requiresApproval: boolean;
  evaluationWindowDays: number;
  retention: RetentionStatus;
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

  // Fetch employee profile to get current level slug
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-level', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level, hire_date')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
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
  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, maxEvalDays);
  const startStr = format(windowStart, 'yyyy-MM-dd');
  const endStr = format(windowEnd, 'yyyy-MM-dd');

  const { data: salesData } = useQuery({
    queryKey: ['level-progress-sales', userId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('service_revenue, product_revenue, summary_date')
        .eq('user_id', userId!)
        .gte('summary_date', startStr)
        .lte('summary_date', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!(nextCriteria || retentionCriteria),
  });

  const { data: apptData } = useQuery({
    queryKey: ['level-progress-appointments', userId, startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, total_price, rebooked_at_checkout, appointment_date')
        .eq('staff_user_id', userId!)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!(nextCriteria || retentionCriteria),
  });

  const result = useMemo<LevelProgressResult | null>(() => {
    if (!currentLevel) return null;

    // Helper: compute metrics for a given window
    const computeMetrics = (evalDays: number) => {
      const evalStart = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');
      const filteredSales = (salesData || []).filter(s => s.summary_date >= evalStart);
      const filteredAppts = (apptData || []).filter(a => a.appointment_date >= evalStart);

      const totalServiceRevenue = filteredSales.reduce((sum, r) => sum + (Number(r.service_revenue) || 0), 0);
      const totalProductRevenue = filteredSales.reduce((sum, r) => sum + (Number(r.product_revenue) || 0), 0);
      const totalRevenue = totalServiceRevenue + totalProductRevenue;
      const monthlyRevenue = evalDays > 0 ? (totalRevenue / evalDays) * 30 : 0;
      const retailPct = totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0;
      const totalAppts = filteredAppts.length;
      const rebooked = filteredAppts.filter(a => a.rebooked_at_checkout).length;
      const rebookingPct = totalAppts > 0 ? (rebooked / totalAppts) * 100 : 0;
      const avgTicket = totalAppts > 0
        ? filteredAppts.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0) / totalAppts
        : 0;

      return { monthlyRevenue, retailPct, rebookingPct, avgTicket };
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
      const retMetrics = computeMetrics(retentionCriteria.evaluation_window_days);
      const failures: RetentionStatus['failures'] = [];

      if (retentionCriteria.revenue_enabled && retMetrics.monthlyRevenue < retentionCriteria.revenue_minimum) {
        failures.push({ key: 'revenue', label: 'Service Revenue', current: Math.round(retMetrics.monthlyRevenue), minimum: retentionCriteria.revenue_minimum, unit: '/mo' });
      }
      if (retentionCriteria.retail_enabled && retMetrics.retailPct < retentionCriteria.retail_pct_minimum) {
        failures.push({ key: 'retail', label: 'Retail Attachment', current: Math.round(retMetrics.retailPct * 10) / 10, minimum: retentionCriteria.retail_pct_minimum, unit: '%' });
      }
      if (retentionCriteria.rebooking_enabled && retMetrics.rebookingPct < retentionCriteria.rebooking_pct_minimum) {
        failures.push({ key: 'rebooking', label: 'Rebooking Rate', current: Math.round(retMetrics.rebookingPct * 10) / 10, minimum: retentionCriteria.rebooking_pct_minimum, unit: '%' });
      }
      if (retentionCriteria.avg_ticket_enabled && retMetrics.avgTicket < retentionCriteria.avg_ticket_minimum) {
        failures.push({ key: 'avg_ticket', label: 'Average Ticket', current: Math.round(retMetrics.avgTicket), minimum: retentionCriteria.avg_ticket_minimum, unit: '$' });
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
        nextLevelLabel: null,
        nextLevelId: null,
        criteria: null,
        criteriaProgress: [],
        compositeScore: 100,
        isFullyQualified: false,
        requiresApproval: false,
        evaluationWindowDays: 0,
        retention,
      };
    }

    // Compute promotion progress
    const promoMetrics = computeMetrics(promoEvalDays);
    const tenureDays = profile?.hire_date
      ? Math.max(0, Math.floor((Date.now() - new Date(profile.hire_date).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const progress: CriterionProgress[] = [];

    if (nextCriteria.revenue_enabled) {
      const target = nextCriteria.revenue_threshold;
      progress.push({
        key: 'revenue', label: 'Service Revenue', enabled: true,
        current: Math.round(promoMetrics.monthlyRevenue), target,
        percent: target > 0 ? Math.min(100, (promoMetrics.monthlyRevenue / target) * 100) : 0,
        weight: nextCriteria.revenue_weight, unit: '/mo',
        gap: Math.max(0, target - promoMetrics.monthlyRevenue),
      });
    }
    if (nextCriteria.retail_enabled) {
      const target = nextCriteria.retail_pct_threshold;
      progress.push({
        key: 'retail', label: 'Retail Attachment', enabled: true,
        current: Math.round(promoMetrics.retailPct * 10) / 10, target,
        percent: target > 0 ? Math.min(100, (promoMetrics.retailPct / target) * 100) : 0,
        weight: nextCriteria.retail_weight, unit: '%',
        gap: Math.max(0, target - promoMetrics.retailPct),
      });
    }
    if (nextCriteria.rebooking_enabled) {
      const target = nextCriteria.rebooking_pct_threshold;
      progress.push({
        key: 'rebooking', label: 'Rebooking Rate', enabled: true,
        current: Math.round(promoMetrics.rebookingPct * 10) / 10, target,
        percent: target > 0 ? Math.min(100, (promoMetrics.rebookingPct / target) * 100) : 0,
        weight: nextCriteria.rebooking_weight, unit: '%',
        gap: Math.max(0, target - promoMetrics.rebookingPct),
      });
    }
    if (nextCriteria.avg_ticket_enabled) {
      const target = nextCriteria.avg_ticket_threshold;
      progress.push({
        key: 'avg_ticket', label: 'Average Ticket', enabled: true,
        current: Math.round(promoMetrics.avgTicket), target,
        percent: target > 0 ? Math.min(100, (promoMetrics.avgTicket / target) * 100) : 0,
        weight: nextCriteria.avg_ticket_weight, unit: '$',
        gap: Math.max(0, target - promoMetrics.avgTicket),
      });
    }
    if (nextCriteria.tenure_enabled) {
      const target = nextCriteria.tenure_days;
      progress.push({
        key: 'tenure', label: 'Tenure', enabled: true,
        current: tenureDays, target,
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
      nextLevelLabel: nextLevel.label,
      nextLevelId: nextLevel.id,
      criteria: nextCriteria,
      criteriaProgress: progress,
      compositeScore: Math.min(100, Math.round(compositeScore)),
      isFullyQualified,
      requiresApproval: nextCriteria.requires_manual_approval,
      evaluationWindowDays: promoEvalDays,
      retention,
    };
  }, [currentLevel, nextLevel, nextCriteria, retentionCriteria, salesData, apptData, profile, promoEvalDays]);

  return result;
}
