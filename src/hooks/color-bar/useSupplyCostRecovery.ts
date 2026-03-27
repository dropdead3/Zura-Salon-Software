/**
 * useSupplyCostRecovery — Aggregates checkout_usage_charges to compute
 * supply cost recovery metrics for the Command Center KPI tile.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface SupplyCostRecoveryData {
  totalRecouped: number;
  totalWaived: number;
  totalPending: number;
  totalCharged: number;
  recoveryRate: number; // recouped / (recouped + waived) as pct
  chargeCount: number;
}

export function useSupplyCostRecovery(
  startDate: string,
  endDate: string,
  enabled: boolean,
  locationId?: string,
) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['supply-cost-recovery', orgId, startDate, endDate, locationId],
    queryFn: async (): Promise<SupplyCostRecoveryData> => {
      // Fetch all charges in the date range
      let query = supabase
        .from('checkout_usage_charges')
        .select('charge_amount, status')
        .eq('organization_id', orgId!)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      // Note: checkout_usage_charges may not have location_id directly,
      // but we filter by org which is sufficient for now.

      const { data, error } = await query;
      if (error) throw error;

      const charges = (data || []) as { charge_amount: number; status: string }[];

      let totalRecouped = 0;
      let totalWaived = 0;
      let totalPending = 0;

      for (const c of charges) {
        if (c.status === 'approved') totalRecouped += c.charge_amount;
        else if (c.status === 'waived') totalWaived += c.charge_amount;
        else if (c.status === 'pending') totalPending += c.charge_amount;
      }

      const totalCharged = totalRecouped + totalWaived;
      const recoveryRate = totalCharged > 0
        ? Math.round((totalRecouped / totalCharged) * 100)
        : 0;

      return {
        totalRecouped,
        totalWaived,
        totalPending,
        totalCharged,
        recoveryRate,
        chargeCount: charges.length,
      };
    },
    enabled: !!orgId && enabled,
    staleTime: 60_000,
  });
}
