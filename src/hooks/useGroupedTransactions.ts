import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface TransactionLineItem {
  id: string;
  itemName: string;
  itemType: string;
  itemCategory: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxAmount: number;
  discount: number;
  tipAmount: number;
  promotionId: string | null;
  promotionName?: string | null;
  promoCode?: string | null;
  saleClassification: string | null;
}

export interface GroupedTransaction {
  transactionId: string;
  transactionDate: string;
  clientName: string | null;
  phorestClientId: string | null;
  stylistName: string | null;
  paymentMethod: string | null;
  locationId: string | null;
  branchName: string | null;
  items: TransactionLineItem[];
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  refundStatus: string | null;
  refundType: string | null;
  refundAmount: number | null;
  isVoided: boolean;
  voidReason: string | null;
}

export interface GroupedTransactionFilters {
  date: string; // YYYY-MM-DD
  locationId?: string;
  paymentMethod?: string;
  clientSearch?: string;
}

export function useGroupedTransactions(filters: GroupedTransactionFilters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['grouped-transactions', filters, orgId],
    queryFn: async () => {
      // Fetch all items for the selected date
      let query = supabase
        .from('phorest_transaction_items')
        .select('*')
        .gte('transaction_date', `${filters.date}T00:00:00`)
        .lte('transaction_date', `${filters.date}T23:59:59`)
        .order('transaction_date', { ascending: false });

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.ilike('payment_method', `%${filters.paymentMethod}%`);
      }
      if (filters.clientSearch) {
        query = query.ilike('client_name', `%${filters.clientSearch}%`);
      }

      const { data: items, error } = await query;
      if (error) throw error;
      if (!items || items.length === 0) return [] as GroupedTransaction[];

      // Fetch refund records
      const transactionIds = [...new Set(items.map(t => t.transaction_id))];
      let refundMap: Record<string, { status: string; type: string; amount: number }> = {};
      if (transactionIds.length > 0) {
        const { data: refunds } = await supabase
          .from('refund_records')
          .select('original_transaction_id, status, refund_type, refund_amount')
          .in('original_transaction_id', transactionIds);
        refunds?.forEach(r => {
          refundMap[r.original_transaction_id] = {
            status: r.status,
            type: r.refund_type,
            amount: Number(r.refund_amount) || 0,
          };
        });
      }

      // Fetch void records
      let voidMap: Record<string, string> = {};
      if (orgId && transactionIds.length > 0) {
        const { data: voids } = await supabase
          .from('voided_transactions')
          .select('transaction_id, void_reason')
          .eq('organization_id', orgId)
          .in('transaction_id', transactionIds);
        voids?.forEach(v => {
          voidMap[v.transaction_id] = v.void_reason || '';
        });
      }

      // Group items by transaction_id
      const grouped = new Map<string, typeof items>();
      items.forEach(item => {
        const existing = grouped.get(item.transaction_id) || [];
        existing.push(item);
        grouped.set(item.transaction_id, existing);
      });

      // Build grouped transactions
      const result: GroupedTransaction[] = [];
      grouped.forEach((txnItems, transactionId) => {
        const first = txnItems[0];
        const subtotal = txnItems.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
        const taxAmount = txnItems.reduce((sum, i) => sum + (Number(i.tax_amount) || 0), 0);
        const tipAmount = txnItems.reduce((sum, i) => sum + (Number(i.tip_amount) || 0), 0);
        const discountAmount = txnItems.reduce((sum, i) => sum + (Number(i.discount) || 0), 0);

        result.push({
          transactionId,
          transactionDate: first.transaction_date,
          clientName: first.client_name,
          phorestClientId: first.phorest_client_id,
          stylistName: first.stylist_name,
          paymentMethod: first.payment_method,
          locationId: first.location_id,
          branchName: first.branch_name,
          items: txnItems.map(i => ({
            id: i.id,
            itemName: i.item_name,
            itemType: i.item_type,
            itemCategory: i.item_category,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unit_price) || 0,
            totalAmount: Number(i.total_amount) || 0,
            taxAmount: Number(i.tax_amount) || 0,
            discount: Number(i.discount) || 0,
            tipAmount: Number(i.tip_amount) || 0,
            promotionId: i.promotion_id,
            saleClassification: i.sale_classification,
          })),
          subtotal,
          taxAmount,
          tipAmount,
          discountAmount,
          totalAmount: subtotal + taxAmount,
          refundStatus: refundMap[transactionId]?.status || null,
          refundType: refundMap[transactionId]?.type || null,
          refundAmount: refundMap[transactionId]?.amount || null,
          isVoided: transactionId in voidMap,
          voidReason: voidMap[transactionId] || null,
        });
      });

      // Sort by date descending
      result.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      return result;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}
