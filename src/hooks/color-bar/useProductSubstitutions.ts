/**
 * useProductSubstitutions — Suggests substitute products when primary is out of stock.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ProductSubstitution {
  id: string;
  substitute_product_id: string;
  substitute_name: string;
  substitute_brand: string | null;
  substitute_cost_price: number | null;
  substitute_quantity_on_hand: number | null;
  priority: number;
  notes: string | null;
}

export function useProductSubstitutions(productId: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['product-substitutions', orgId, productId],
    queryFn: async (): Promise<ProductSubstitution[]> => {
      const { data, error } = await supabase
        .from('product_substitutions')
        .select('id, substitute_product_id, priority, notes, substitute:substitute_product_id(name, brand, cost_price, quantity_on_hand)')
        .eq('organization_id', orgId!)
        .eq('product_id', productId!)
        .order('priority', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        substitute_product_id: row.substitute_product_id,
        substitute_name: row.substitute?.name ?? 'Unknown',
        substitute_brand: row.substitute?.brand ?? null,
        substitute_cost_price: row.substitute?.cost_price ?? null,
        substitute_quantity_on_hand: row.substitute?.quantity_on_hand ?? null,
        priority: row.priority,
        notes: row.notes,
      }));
    },
    enabled: !!orgId && !!productId,
    staleTime: 60_000,
  });
}
