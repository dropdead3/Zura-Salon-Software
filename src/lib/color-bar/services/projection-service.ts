/**
 * ProjectionService — Read model rebuild and access.
 *
 * Owns projection rebuild functions and read-only projection queries.
 * Must never contain business logic — only event→projection transforms.
 * Must never write to source-of-truth tables.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Rebuild the inventory projection for a specific product+location.
 * Calls the DB function which sums all stock_movements.
 */
export async function rebuildInventoryProjection(
  orgId: string,
  productId: string,
  locationId?: string | null
): Promise<void> {
  const { error } = await supabase.rpc('rebuild_inventory_projection', {
    p_org_id: orgId,
    p_product_id: productId,
    p_location_id: locationId ?? null,
  });

  if (error) throw error;
}

/**
 * Rebuild the mix session projection by replaying events.
 * Calls the DB function which truncates and replays.
 */
export async function rebuildMixSessionProjection(
  sessionId: string
): Promise<void> {
  const { error } = await supabase.rpc('rebuild_mix_session_projection' as any, {
    p_session_id: sessionId,
  });

  if (error) throw error;
}

/**
 * Read the current inventory projection for a product+location.
 */
export async function getInventoryProjection(
  orgId: string,
  productId: string,
  locationId?: string | null
) {
  const query = supabase
    .from('inventory_projections' as any)
    .select('*')
    .eq('organization_id', orgId)
    .eq('product_id', productId);

  if (locationId) {
    query.eq('location_id', locationId);
  } else {
    query.is('location_id', null);
  }

  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
