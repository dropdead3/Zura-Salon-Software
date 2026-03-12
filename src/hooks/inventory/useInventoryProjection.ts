/**
 * useInventoryProjection — Read derived inventory balances from inventory_projections.
 * Projection is maintained automatically by the ledger trigger.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface InventoryProjection {
  id: string;
  organization_id: string;
  product_id: string;
  location_id: string | null;
  on_hand: number;
  allocated: number;
  on_order: number;
  available: number;
  last_calculated_at: string;
}

export function useInventoryProjection(productId: string | null, locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-projection', orgId, productId, locationId],
    queryFn: async (): Promise<InventoryProjection | null> => {
      let query = supabase
        .from('inventory_projections')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('product_id', productId!);

      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as unknown as InventoryProjection | null;
    },
    enabled: !!orgId && !!productId,
    staleTime: 30_000,
  });
}

export function useInventoryProjections(productIds?: string[]) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-projections', orgId, productIds],
    queryFn: async (): Promise<InventoryProjection[]> => {
      let query = supabase
        .from('inventory_projections')
        .select('*')
        .eq('organization_id', orgId!);

      if (productIds?.length) {
        query = query.in('product_id', productIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as InventoryProjection[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
