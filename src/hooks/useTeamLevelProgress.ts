import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from './useLevelPromotionCriteria';
import { useStylistLevels, type StylistLevel } from './useStylistLevels';
import { subDays, format } from 'date-fns';
import type { CriterionProgress } from './useLevelProgress';

export type GraduationStatus = 'ready' | 'in_progress' | 'needs_attention' | 'at_top_level' | 'no_criteria';

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
}

export function useTeamLevelProgress() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: allLevels = [] } = useStylistLevels();
  const { data: allCriteria = [] } = useLevelPromotionCriteria();

  // Fetch all active employee profiles with stylist levels
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['team-profiles-for-graduation', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, photo_url, stylist_level, hire_date, is_active')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .not('stylist_level', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Determine the max evaluation window needed
  const maxWindowDays = useMemo(() => {
    if (allCriteria.length === 0) return 90;
    return Math.max(...allCriteria.map(c => c.evaluation_window_days), 30);
  }, [allCriteria]);

  const windowEnd = new Date();
  const windowStart = subDays(windowEnd, maxWindowDays);
  const startStr = format(windowStart, 'yyyy-MM-dd');
  const endStr = format(windowEnd, 'yyyy-MM-dd');

  const userIds = useMemo(() => profiles.map(p => p.user_id), [profiles]);

  // Batch fetch sales data for all team members
  const { data: allSalesData = [], isLoading: loadingSales } = useQuery({
    queryKey: ['team-graduation-sales', orgId, startStr, endStr, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('user_id, service_revenue, product_revenue, summary_date')
        .in('user_id', userIds)
        .gte('summary_date', startStr)
        .lte('summary_date', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && userIds.length > 0,
  });

  // Batch fetch appointment data for all team members
  const { data: allApptData = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['team-graduation-appts', orgId, startStr, endStr, userIds.length],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('staff_user_id, total_price, rebooked_at_checkout, appointment_date')
        .in('staff_user_id', userIds)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && userIds.length > 0,
  });

  const isLoading = loadingProfiles || loadingSales || loadingAppts;

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

      if (isTopLevel) {
        return {
          userId: profile.user_id,
          fullName: profile.full_name || 'Unknown',
          photoUrl: profile.photo_url,
          hireDate: profile.hire_date,
          currentLevel,
          currentLevelIndex: idx,
          nextLevel: null,
          criteria: null,
          criteriaProgress: [],
          compositeScore: 100,
          isFullyQualified: false,
          requiresApproval: false,
          evaluationWindowDays: 0,
          status: 'at_top_level' as GraduationStatus,
        };
      }

      if (!criteria || !nextLevel) {
        return {
          userId: profile.user_id,
          fullName: profile.full_name || 'Unknown',
          photoUrl: profile.photo_url,
          hireDate: profile.hire_date,
          currentLevel,
          currentLevelIndex: idx,
          nextLevel,
          criteria: null,
          criteriaProgress: [],
          compositeScore: 0,
          isFullyQualified: false,
          requiresApproval: false,
          evaluationWindowDays: 0,
          status: 'no_criteria' as GraduationStatus,
        };
      }

      // Filter data to this user's evaluation window
      const evalDays = criteria.evaluation_window_days || 30;
      const evalStart = format(subDays(new Date(), evalDays), 'yyyy-MM-dd');

      const userSales = allSalesData.filter(
        s => s.user_id === profile.user_id && s.summary_date >= evalStart
      );
      const userAppts = allApptData.filter(
        a => a.staff_user_id === profile.user_id && a.appointment_date >= evalStart
      );

      const totalServiceRevenue = userSales.reduce((s, r) => s + (Number(r.service_revenue) || 0), 0);
      const totalProductRevenue = userSales.reduce((s, r) => s + (Number(r.product_revenue) || 0), 0);
      const totalRevenue = totalServiceRevenue + totalProductRevenue;
      const monthlyRevenue = evalDays > 0 ? (totalRevenue / evalDays) * 30 : 0;
      const retailPct = totalRevenue > 0 ? (totalProductRevenue / totalRevenue) * 100 : 0;
      const totalApptCount = userAppts.length;
      const rebooked = userAppts.filter(a => a.rebooked_at_checkout).length;
      const rebookingPct = totalApptCount > 0 ? (rebooked / totalApptCount) * 100 : 0;
      const avgTicket = totalApptCount > 0
        ? userAppts.reduce((s, a) => s + (Number(a.total_price) || 0), 0) / totalApptCount
        : 0;
      const tenureDays = profile.hire_date
        ? Math.max(0, Math.floor((Date.now() - new Date(profile.hire_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      const progress: CriterionProgress[] = [];

      if (criteria.revenue_enabled) {
        const target = criteria.revenue_threshold;
        progress.push({
          key: 'revenue', label: 'Service Revenue', enabled: true,
          current: Math.round(monthlyRevenue), target,
          percent: target > 0 ? Math.min(100, (monthlyRevenue / target) * 100) : 0,
          weight: criteria.revenue_weight, unit: '/mo',
          gap: Math.max(0, target - monthlyRevenue),
        });
      }
      if (criteria.retail_enabled) {
        const target = criteria.retail_pct_threshold;
        progress.push({
          key: 'retail', label: 'Retail Attachment', enabled: true,
          current: Math.round(retailPct * 10) / 10, target,
          percent: target > 0 ? Math.min(100, (retailPct / target) * 100) : 0,
          weight: criteria.retail_weight, unit: '%',
          gap: Math.max(0, target - retailPct),
        });
      }
      if (criteria.rebooking_enabled) {
        const target = criteria.rebooking_pct_threshold;
        progress.push({
          key: 'rebooking', label: 'Rebooking Rate', enabled: true,
          current: Math.round(rebookingPct * 10) / 10, target,
          percent: target > 0 ? Math.min(100, (rebookingPct / target) * 100) : 0,
          weight: criteria.rebooking_weight, unit: '%',
          gap: Math.max(0, target - rebookingPct),
        });
      }
      if (criteria.avg_ticket_enabled) {
        const target = criteria.avg_ticket_threshold;
        progress.push({
          key: 'avg_ticket', label: 'Average Ticket', enabled: true,
          current: Math.round(avgTicket), target,
          percent: target > 0 ? Math.min(100, (avgTicket / target) * 100) : 0,
          weight: criteria.avg_ticket_weight, unit: '$',
          gap: Math.max(0, target - avgTicket),
        });
      }
      if (criteria.tenure_enabled) {
        const target = criteria.tenure_days;
        progress.push({
          key: 'tenure', label: 'Tenure', enabled: true,
          current: tenureDays, target,
          percent: target > 0 ? Math.min(100, (tenureDays / target) * 100) : 0,
          weight: 0, unit: 'd',
          gap: Math.max(0, target - tenureDays),
        });
      }

      const weightedCriteria = progress.filter(p => p.weight > 0);
      const totalWeight = weightedCriteria.reduce((s, p) => s + p.weight, 0);
      const compositeScore = totalWeight > 0
        ? weightedCriteria.reduce((s, p) => s + (p.percent * p.weight) / totalWeight, 0)
        : 0;
      const tenurePasses = !criteria.tenure_enabled || tenureDays >= criteria.tenure_days;
      const isFullyQualified = compositeScore >= 100 && tenurePasses;

      const score = Math.min(100, Math.round(compositeScore));
      let status: GraduationStatus = 'in_progress';
      if (isFullyQualified) status = 'ready';
      else if (score < 25) status = 'needs_attention';

      return {
        userId: profile.user_id,
        fullName: profile.full_name || 'Unknown',
        photoUrl: profile.photo_url,
        hireDate: profile.hire_date,
        currentLevel,
        currentLevelIndex: idx,
        nextLevel,
        criteria,
        criteriaProgress: progress,
        compositeScore: score,
        isFullyQualified,
        requiresApproval: criteria.requires_manual_approval,
        evaluationWindowDays: evalDays,
        status,
      };
    }).sort((a, b) => {
      // Ready first, then by score descending
      const statusOrder: Record<GraduationStatus, number> = {
        ready: 0, in_progress: 1, needs_attention: 2, no_criteria: 3, at_top_level: 4,
      };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return b.compositeScore - a.compositeScore;
    });
  }, [profiles, allLevels, allCriteria, allSalesData, allApptData]);

  const counts = useMemo(() => {
    const ready = teamProgress.filter(t => t.status === 'ready').length;
    const inProgress = teamProgress.filter(t => t.status === 'in_progress').length;
    const needsAttention = teamProgress.filter(t => t.status === 'needs_attention').length;
    const atTopLevel = teamProgress.filter(t => t.status === 'at_top_level').length;
    const noCriteria = teamProgress.filter(t => t.status === 'no_criteria').length;
    return { ready, inProgress, needsAttention, atTopLevel, noCriteria, total: teamProgress.length };
  }, [teamProgress]);

  return { teamProgress, counts, isLoading };
}
