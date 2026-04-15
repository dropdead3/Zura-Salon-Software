import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TransactionItem {
  id: string;
  transaction_id: string;
  transaction_date: string;
  phorest_client_id: string | null;
  client_name: string | null;
  item_type: string;
  item_name: string;
  item_category: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_amount: number | null;
  tax_amount: number | null;
  discount: number | null;
  phorest_staff_id: string | null;
  location_id: string | null;
  branch_name: string | null;
  promotion_id: string | null;
  promotion_name?: string | null;
  promo_code?: string | null;
  refund_status?: string | null;
  refund_type?: string | null;
  refund_amount?: number | null;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  itemType?: string;
  clientSearch?: string;
  limit?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('v_all_transaction_items' as any)
        .select('*')
        .order('transaction_date', { ascending: false });

      // Apply filters
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters.itemType && filters.itemType !== 'all') {
        query = query.eq('item_type', filters.itemType);
      }
      if (filters.clientSearch) {
        query = query.ilike('client_name', `%${filters.clientSearch}%`);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch refund status for each transaction
      const transactionIds = [...new Set(((data || []) as any[]).map((t: any) => t.transaction_id) || [])];
      
      let refundMap: Record<string, { status: string; type: string; amount: number }> = {};
      if (transactionIds.length > 0) {
        const { data: refunds } = await supabase
          .from('refund_records')
          .select('original_transaction_id, status, refund_type, refund_amount')
          .in('original_transaction_id', transactionIds);
        
        ((refunds || []) as any[]).forEach((r: any) => {
          refundMap[r.original_transaction_id] = {
            status: r.status,
            type: r.refund_type,
            amount: Number(r.refund_amount) || 0
          };
        });
      }

      // Fetch promotion details for items with promotion_id
      const promoIds = [...new Set(((data || []) as any[]).filter((t: any) => t.promotion_id).map(t => t.promotion_id!))];
      let promoMap: Record<string, { name: string; code: string | null }> = {};
      if (promoIds.length > 0) {
        const { data: promos } = await supabase
          .from('promotions' as any)
          .select('id, name, promo_code')
          .in('id', promoIds);
        
        (promos || []).forEach((p: any) => {
          promoMap[p.id] = { name: p.name, code: p.promo_code };
        });
      }

      // Merge refund + promo info
      return ((data || []) as any[]).map((item: any) => ({
        ...item,
        promotion_name: item.promotion_id ? promoMap[item.promotion_id]?.name || null : null,
        promo_code: item.promotion_id ? promoMap[item.promotion_id]?.code || null : null,
        refund_status: refundMap[item.transaction_id]?.status || null,
        refund_type: refundMap[item.transaction_id]?.type || null,
        refund_amount: refundMap[item.transaction_id]?.amount || null,
      })) as TransactionItem[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useTransactionsByClient(clientId: string | null) {
  return useQuery({
    queryKey: ['client-transactions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('v_all_transaction_items' as any)
        .select('*')
        .eq('phorest_client_id', clientId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Fetch refund records for these transactions
      const transactionIds = [...new Set(((data || []) as any[]).map((t: any) => t.transaction_id) || [])];
      let refundMap: Record<string, { status: string; type: string; amount: number }> = {};
      
      if (transactionIds.length > 0) {
        const { data: refunds } = await supabase
          .from('refund_records')
          .select('original_transaction_id, status, refund_type, refund_amount')
          .in('original_transaction_id', transactionIds);
        
        ((refunds || []) as any[]).forEach((r: any) => {
          refundMap[r.original_transaction_id] = {
            status: r.status,
            type: r.refund_type,
            amount: Number(r.refund_amount) || 0
          };
        });
      }

      return ((data || []) as any[]).map((item: any) => ({
        ...item,
        refund_status: refundMap[item.transaction_id]?.status || null,
        refund_type: refundMap[item.transaction_id]?.type || null,
        refund_amount: refundMap[item.transaction_id]?.amount || null,
      })) as TransactionItem[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
