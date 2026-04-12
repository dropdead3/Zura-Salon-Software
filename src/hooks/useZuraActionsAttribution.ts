import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserContext } from '@/hooks/useEffectiveUser';
import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Tracks monthly revenue attributed to Zura-recommended actions.
 * Sums estimated_revenue_impact_cents for completed tasks where source = 'zura' or 'seo_engine'.
 */
export function useZuraActionsAttribution() {
  const { effectiveUserId } = useEffectiveUserContext();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['zura-attribution', effectiveUserId, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('estimated_revenue_impact_cents, completed_at, source')
        .eq('user_id', effectiveUserId!)
        .eq('is_completed', true)
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd)
        .in('source', ['zura', 'seo_engine'] as any);

      if (error) throw error;

      const totalCents = (data || []).reduce(
        (sum, t: any) => sum + (t.estimated_revenue_impact_cents || 0),
        0
      );
      const taskCount = (data || []).length;

      return { totalCents, taskCount };
    },
    enabled: !!effectiveUserId,
  });
}
