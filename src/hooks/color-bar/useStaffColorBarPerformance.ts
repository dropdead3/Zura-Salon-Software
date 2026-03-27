/**
 * useStaffColorBarPerformance — Read pre-computed staff color bar analytics.
 * Projection is updated daily by edge function.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface StaffColorBarPerformance {
  id: string;
  organization_id: string;
  staff_id: string;
  location_id: string | null;
  period_start: string;
  period_end: string;
  mix_session_count: number;
  manual_override_rate: number;
  reweigh_compliance_rate: number;
  avg_usage_variance: number;
  waste_rate: number;
  total_dispensed_weight: number;
  total_product_cost: number;
  last_calculated_at: string;
}

export function useStaffColorBarPerformance(
  periodStart: string,
  periodEnd: string,
  locationId?: string,
  staffId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['staff-backroom-performance', orgId, periodStart, periodEnd, locationId, staffId],
    queryFn: async (): Promise<StaffColorBarPerformance[]> => {
      let query = supabase
        .from('staff_backroom_performance')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd);

      if (locationId) query = query.eq('location_id', locationId);
      if (staffId) query = query.eq('staff_id', staffId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as StaffColorBarPerformance[];
    },
    enabled: !!orgId && !!periodStart && !!periodEnd,
    staleTime: 5 * 60_000,
  });
}
