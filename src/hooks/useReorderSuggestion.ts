import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReorderSuggestion {
  suggested_quantity: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  sales_velocity: number;
  trend: string;
  total_sold_90d: number;
}

export function useReorderSuggestion(productId: string | undefined, organizationId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ['reorder-suggestion', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-reorder-quantity', {
        body: { product_id: productId, organization_id: organizationId },
      });
      if (error) throw error;
      return data as unknown as ReorderSuggestion;
    },
    enabled: !!productId && !!organizationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
