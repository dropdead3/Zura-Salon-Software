import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface StockMovement {
  id: string;
  organization_id: string;
  product_id: string;
  quantity_change: number;
  quantity_after: number;
  reason: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useStockMovements(productId: string | null, limit = 20) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stock-movements', orgId, productId, limit],
    queryFn: async (): Promise<StockMovement[]> => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('product_id', productId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as StockMovement[];
    },
    enabled: !!orgId && !!productId,
    staleTime: 30_000,
  });
}

export function useLogStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      product_id: string;
      quantity_change: number;
      quantity_after: number;
      reason: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('stock_movements')
        .insert({
          organization_id: params.organization_id,
          product_id: params.product_id,
          quantity_change: params.quantity_change,
          quantity_after: params.quantity_after,
          reason: params.reason,
          notes: params.notes || null,
          created_by: userId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}
