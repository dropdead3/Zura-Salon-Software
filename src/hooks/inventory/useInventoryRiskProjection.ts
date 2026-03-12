/**
 * useInventoryRiskProjection — Read low-stock alerts and depletion forecasts.
 * Projection is updated daily by edge function.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface InventoryRiskProjection {
  id: string;
  organization_id: string;
  product_id: string;
  location_id: string | null;
  current_on_hand: number;
  avg_daily_usage: number;
  projected_depletion_date: string | null;
  stockout_risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommended_order_qty: number;
  open_po_quantity: number;
  last_forecast_at: string;
}

export function useInventoryRiskProjections(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-risk-projections', orgId, locationId],
    queryFn: async (): Promise<InventoryRiskProjection[]> => {
      let query = supabase
        .from('inventory_risk_projections')
        .select('*')
        .eq('organization_id', orgId!)
        .order('stockout_risk_level', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRiskProjection[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // Eventually consistent — 5 min stale OK
  });
}

export function useHighRiskInventory(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-risk-high', orgId, locationId],
    queryFn: async (): Promise<InventoryRiskProjection[]> => {
      let query = supabase
        .from('inventory_risk_projections')
        .select('*')
        .eq('organization_id', orgId!)
        .in('stockout_risk_level', ['high', 'critical']);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRiskProjection[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
