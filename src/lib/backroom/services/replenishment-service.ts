/**
 * ReplenishmentService — Owns inventory_risk_projections reads.
 *
 * Wraps replenishment calculations and risk projection queries.
 * Must not directly place purchase orders or mutate inventory.
 */

import { supabase } from '@/integrations/supabase/client';

export interface RiskProjection {
  id: string;
  organization_id: string;
  product_id: string;
  location_id: string | null;
  current_on_hand: number;
  avg_daily_usage: number;
  projected_depletion_date: string | null;
  stockout_risk_level: string;
  recommended_order_qty: number;
  open_po_quantity: number;
  last_forecast_at: string;
}

/**
 * Read inventory risk projections for an organization.
 */
export async function getRiskProjections(
  orgId: string,
  riskLevel?: string
): Promise<RiskProjection[]> {
  let query = supabase
    .from('inventory_risk_projections' as any)
    .select('*')
    .eq('organization_id', orgId)
    .order('stockout_risk_level', { ascending: false });

  if (riskLevel && riskLevel !== 'all') {
    query = query.eq('stockout_risk_level', riskLevel);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RiskProjection[];
}
