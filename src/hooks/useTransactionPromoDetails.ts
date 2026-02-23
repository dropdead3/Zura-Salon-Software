import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoRedemption {
  id: string;
  promotion_id: string;
  promotion_name: string;
  promo_code: string | null;
  client_name: string | null;
  discount_applied: number;
  original_amount: number | null;
  final_amount: number | null;
  transaction_id: string | null;
  redeemed_at: string;
}

interface PromoFilters {
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export function useTransactionPromoDetails(filters: PromoFilters) {
  return useQuery({
    queryKey: ['transaction-promo-details', filters],
    queryFn: async () => {
      if (!filters.organizationId) return [];

      let query = supabase
        .from('promotion_redemptions' as any)
        .select('*, promotions:promotion_id(name, promo_code)')
        .eq('organization_id', filters.organizationId)
        .order('redeemed_at', { ascending: false });

      if (filters.startDate) {
        query = query.gte('redeemed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('redeemed_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        promotion_id: r.promotion_id,
        promotion_name: r.promotions?.name || 'Unknown',
        promo_code: r.promo_code_used || r.promotions?.promo_code || null,
        client_name: r.client_name || null,
        discount_applied: Number(r.discount_applied) || 0,
        original_amount: r.original_amount != null ? Number(r.original_amount) : null,
        final_amount: r.final_amount != null ? Number(r.final_amount) : null,
        transaction_id: r.transaction_id || null,
        redeemed_at: r.redeemed_at,
      })) as PromoRedemption[];
    },
    enabled: !!filters.organizationId,
    staleTime: 2 * 60 * 1000,
  });
}
