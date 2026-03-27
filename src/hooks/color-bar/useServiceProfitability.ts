/**
 * useServiceProfitability — Read pre-computed service profitability snapshots.
 * Projection is updated daily by edge function.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ServiceProfitabilitySnapshot {
  id: string;
  organization_id: string;
  location_id: string | null;
  appointment_id: string | null;
  appointment_service_id: string | null;
  staff_id: string | null;
  service_name: string | null;
  service_revenue: number;
  product_cost: number;
  overage_revenue: number;
  waste_cost: number;
  contribution_margin: number;
  created_at: string;
}

export function useServiceProfitabilitySnapshots(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-profitability', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<ServiceProfitabilitySnapshot[]> => {
      let query = supabase
        .from('service_profitability_snapshots')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ServiceProfitabilitySnapshot[];
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
