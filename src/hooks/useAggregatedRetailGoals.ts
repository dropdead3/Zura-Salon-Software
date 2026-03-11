import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useCurrentRetailGoals } from '@/hooks/useRetailGoals';

export interface StaffRetailGoal {
  userId: string;
  name: string;
  photoUrl: string | null;
  retailMonthlyTarget: number;
  retailWeeklyTarget: number;
  currentRetailRevenue: number;
  progressPct: number;
}

export interface AggregatedRetailGoals {
  totalMonthlyCommitment: number;
  totalWeeklyCommitment: number;
  staffBreakdown: StaffRetailGoal[];
  orgTopDownTarget: number | null;
  gap: number | null;
  staffWithoutGoals: number;
  totalStaff: number;
}

export function useAggregatedRetailGoals(currentRetailRevenue: number = 0) {
  const { data: profile } = useEmployeeProfile();
  const orgId = profile?.organization_id;
  const { data: currentGoals } = useCurrentRetailGoals();

  return useQuery({
    queryKey: ['aggregated-retail-goals', orgId],
    queryFn: async (): Promise<AggregatedRetailGoals> => {
      if (!orgId) throw new Error('No org');

      // Fetch all personal goals joined with employee profiles for the org
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (empError) throw empError;

      const userIds = (employees || []).map(e => e.user_id);

      // Fetch all personal goals for these users
      const { data: goals, error: goalsError } = await supabase
        .from('stylist_personal_goals')
        .select('*')
        .in('user_id', userIds);

      if (goalsError) throw goalsError;

      const goalsMap = new Map((goals || []).map(g => [g.user_id, g]));

      const staffBreakdown: StaffRetailGoal[] = (employees || []).map(e => {
        const goal = goalsMap.get(e.user_id) as any;
        const retailMonthlyTarget = goal?.retail_monthly_target ?? 0;
        const retailWeeklyTarget = goal?.retail_weekly_target ?? 0;
        return {
          userId: e.user_id,
          name: e.display_name || e.full_name || 'Unknown',
          photoUrl: e.photo_url,
          retailMonthlyTarget,
          retailWeeklyTarget,
          currentRetailRevenue: 0, // Will be enriched when per-staff retail data is available
          progressPct: retailMonthlyTarget > 0 ? 0 : 0,
        };
      });

      const totalMonthlyCommitment = staffBreakdown.reduce((s, r) => s + r.retailMonthlyTarget, 0);
      const totalWeeklyCommitment = staffBreakdown.reduce((s, r) => s + r.retailWeeklyTarget, 0);
      const staffWithoutGoals = staffBreakdown.filter(s => s.retailMonthlyTarget === 0).length;

      // Check for top-down org goal
      const orgGoal = currentGoals?.monthly?.find((g: any) => !g.location_id);
      const orgTopDownTarget = orgGoal ? (orgGoal as any).target_revenue : null;
      const gap = orgTopDownTarget !== null ? orgTopDownTarget - totalMonthlyCommitment : null;

      return {
        totalMonthlyCommitment,
        totalWeeklyCommitment,
        staffBreakdown: staffBreakdown.sort((a, b) => b.retailMonthlyTarget - a.retailMonthlyTarget),
        orgTopDownTarget,
        gap,
        staffWithoutGoals,
        totalStaff: staffBreakdown.length,
      };
    },
    enabled: !!orgId,
  });
}
