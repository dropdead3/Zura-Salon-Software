import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from './useLevelPromotionCriteria';
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
}

/**
 * Computes a stylist's real-time graduation progress against their next level's criteria.
 * Inputs: the user's ID. Internally resolves their current level, next level criteria,
 * and rolling performance data from daily sales + appointments.
 */
export function useLevelProgress(userId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: allLevels = [] } = useStylistLevels();
  const { data: allCriteria = [] } = useLevelPromotionCriteria();

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

  // Determine current + next level
  const { currentLevel, nextLevel, nextCriteria } = useMemo(() => {
    if (!profile?.stylist_level || allLevels.length === 0) {
      return { currentLevel: null, nextLevel: null, nextCriteria: null };
    }
    const sorted = [...allLevels].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex(l => l.slug === profile.stylist_level);
    if (idx === -1 || idx >= sorted.length - 1) {
      return {
        currentLevel: sorted[idx] || null,
        nextLevel: null,
        nextCriteria: null,
      };
    }
    const next = sorted[idx + 1];
    const criteria = allCriteria.find(c => c.stylist_level_id === next.id && c.is_active) || null;
    return { currentLevel: sorted[idx], nextLevel: next, nextCriteria: criteria };
  }, [profile, allLevels, allCriteria]);

  // Fetch rolling performance data for evaluation window
  const evalDays = nextCriteria?.evaluation_window_days || 30;
  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, evalDays);
  const startStr = format(windowStart, 'yyyy-MM-dd');
  const endStr = format(windowEnd, 'yyyy-MM-dd');

  // Daily sales summary for revenue + retail
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
    enabled: !!userId && !!nextCriteria,
  });

  // Appointments for rebooking + avg ticket
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
    enabled: !!userId && !!nextCriteria,
  });

  const result = useMemo<LevelProgressResult | null>(() => {
    if (!currentLevel) {
      return null;
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
      };
    }

    // Compute actuals
    const totalServiceRevenue = (salesData || []).reduce(
      (sum, r) => sum + (Number(r.service_revenue) || 0), 0
    );
    const totalProductRevenue = (salesData || []).reduce(
      (sum, r) => sum + (Number(r.product_revenue) || 0), 0
    );
    const totalRevenue = totalServiceRevenue + totalProductRevenue;

    // Monthly revenue: normalize to 30 days
    const monthlyRevenue = evalDays > 0 ? (totalRevenue / evalDays) * 30 : 0;

    // Retail %
    const retailPct = totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0;

    // Rebooking rate
    const totalAppts = (apptData || []).length;
    const rebooked = (apptData || []).filter(a => a.rebooked_at_checkout).length;
    const rebookingPct = totalAppts > 0 ? (rebooked / totalAppts) * 100 : 0;

    // Avg ticket
    const avgTicket = totalAppts > 0
      ? (apptData || []).reduce((sum, a) => sum + (Number(a.total_price) || 0), 0) / totalAppts
      : 0;

    // Tenure (days since hire)
    const tenureDays = profile?.hire_date
      ? Math.max(0, Math.floor((Date.now() - new Date(profile.hire_date).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const progress: CriterionProgress[] = [];

    if (nextCriteria.revenue_enabled) {
      const target = nextCriteria.revenue_threshold;
      progress.push({
        key: 'revenue',
        label: 'Service Revenue',
        enabled: true,
        current: Math.round(monthlyRevenue),
        target,
        percent: target > 0 ? Math.min(100, (monthlyRevenue / target) * 100) : 0,
        weight: nextCriteria.revenue_weight,
        unit: '/mo',
        gap: Math.max(0, target - monthlyRevenue),
      });
    }

    if (nextCriteria.retail_enabled) {
      const target = nextCriteria.retail_pct_threshold;
      progress.push({
        key: 'retail',
        label: 'Retail Attachment',
        enabled: true,
        current: Math.round(retailPct * 10) / 10,
        target,
        percent: target > 0 ? Math.min(100, (retailPct / target) * 100) : 0,
        weight: nextCriteria.retail_weight,
        unit: '%',
        gap: Math.max(0, target - retailPct),
      });
    }

    if (nextCriteria.rebooking_enabled) {
      const target = nextCriteria.rebooking_pct_threshold;
      progress.push({
        key: 'rebooking',
        label: 'Rebooking Rate',
        enabled: true,
        current: Math.round(rebookingPct * 10) / 10,
        target,
        percent: target > 0 ? Math.min(100, (rebookingPct / target) * 100) : 0,
        weight: nextCriteria.rebooking_weight,
        unit: '%',
        gap: Math.max(0, target - rebookingPct),
      });
    }

    if (nextCriteria.avg_ticket_enabled) {
      const target = nextCriteria.avg_ticket_threshold;
      progress.push({
        key: 'avg_ticket',
        label: 'Average Ticket',
        enabled: true,
        current: Math.round(avgTicket),
        target,
        percent: target > 0 ? Math.min(100, (avgTicket / target) * 100) : 0,
        weight: nextCriteria.avg_ticket_weight,
        unit: '$',
        gap: Math.max(0, target - avgTicket),
      });
    }

    if (nextCriteria.tenure_enabled) {
      const target = nextCriteria.tenure_days;
      progress.push({
        key: 'tenure',
        label: 'Tenure',
        enabled: true,
        current: tenureDays,
        target,
        percent: target > 0 ? Math.min(100, (tenureDays / target) * 100) : 0,
        weight: 0, // tenure isn't weighted
        unit: 'd',
        gap: Math.max(0, target - tenureDays),
      });
    }

    // Compute weighted composite score (exclude tenure from weighted calc)
    const weightedCriteria = progress.filter(p => p.weight > 0);
    const totalWeight = weightedCriteria.reduce((sum, p) => sum + p.weight, 0);
    const compositeScore = totalWeight > 0
      ? weightedCriteria.reduce((sum, p) => sum + (p.percent * p.weight) / totalWeight, 0)
      : 0;

    // Tenure must also pass for full qualification
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
      evaluationWindowDays: evalDays,
    };
  }, [currentLevel, nextLevel, nextCriteria, salesData, apptData, profile, evalDays]);

  return result;
}
