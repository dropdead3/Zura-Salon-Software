import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

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

export interface UsageChargeLineItem {
  id: string;
  serviceName: string | null;
  chargeType: string;
  overageQty: number;
  chargeAmount: number;
  status: string;
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
  appointmentId: string | null;
  items: TransactionLineItem[];
  usageCharges: UsageChargeLineItem[];
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  usageChargeTotal: number;
  grandTotal: number;
  refundStatus: string | null;
  refundType: string | null;
  refundAmount: number | null;
  isVoided: boolean;
  voidReason: string | null;
  afterpaySurchargeAmount?: number | null;
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
      // Use fetchAllBatched to avoid 1000-row silent truncation
      const items = await fetchAllBatched<any>(
        (from, to) => {
          let query = supabase
            .from('v_all_transaction_items')
            .select('*')
            .eq('transaction_date', filters.date)
            .order('transaction_date', { ascending: false })
            .range(from, to);

          if (filters.locationId) {
            query = query.eq('location_id', filters.locationId);
          }
          if (filters.paymentMethod && filters.paymentMethod !== 'all') {
            // Map UI filter values to actual database values
            const dbPattern = filters.paymentMethod === 'card' ? '%Credit%'
              : filters.paymentMethod === 'cash' ? '%Cash%'
              : `%${filters.paymentMethod}%`;
            query = query.ilike('payment_method', dbPattern);
          }
          if (filters.clientSearch) {
            query = query.ilike('client_name', `%${filters.clientSearch}%`);
          }
          return query;
        },
        1000
      );

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
        const totalAmount = subtotal + taxAmount;

        result.push({
          transactionId,
          transactionDate: first.transaction_date,
          clientName: first.client_name,
          phorestClientId: first.phorest_client_id,
          stylistName: first.stylist_name,
          paymentMethod: first.payment_method,
          locationId: first.location_id,
          branchName: first.branch_name,
          appointmentId: first.appointment_id || null,
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
          usageCharges: [],
          subtotal,
          taxAmount,
          tipAmount,
          discountAmount,
          totalAmount,
          usageChargeTotal: 0,
          grandTotal: totalAmount + tipAmount,
          refundStatus: refundMap[transactionId]?.status || null,
          refundType: refundMap[transactionId]?.type || null,
          refundAmount: refundMap[transactionId]?.amount || null,
          isVoided: transactionId in voidMap,
          voidReason: voidMap[transactionId] || null,
        });
      });

      // Fetch usage charges for linked appointments
      const appointmentIds = result
        .map(t => t.appointmentId)
        .filter((id): id is string => !!id);

      if (appointmentIds.length > 0) {
        // Fetch surcharge amounts from appointments
        const { data: apptSurcharges } = await supabase
          .from('appointments')
          .select('id, afterpay_surcharge_amount')
          .in('id', appointmentIds);

        if (apptSurcharges && apptSurcharges.length > 0) {
          const surchargeMap = new Map<string, number | null>();
          apptSurcharges.forEach(a => {
            surchargeMap.set(a.id, a.afterpay_surcharge_amount);
          });
          result.forEach(txn => {
            if (txn.appointmentId && surchargeMap.has(txn.appointmentId)) {
              txn.afterpaySurchargeAmount = surchargeMap.get(txn.appointmentId) ?? null;
            }
          });
        }

        const { data: charges } = await supabase
          .from('checkout_usage_charges')
          .select('id, appointment_id, service_name, charge_type, overage_qty, charge_amount, status')
          .in('appointment_id', appointmentIds)
          .in('status', ['approved', 'pending']);

        if (charges && charges.length > 0) {
          const chargesByAppt = new Map<string, UsageChargeLineItem[]>();
          charges.forEach(c => {
            const list = chargesByAppt.get(c.appointment_id) || [];
            list.push({
              id: c.id,
              serviceName: c.service_name,
              chargeType: c.charge_type,
              overageQty: Number(c.overage_qty) || 0,
              chargeAmount: Number(c.charge_amount) || 0,
              status: c.status,
            });
            chargesByAppt.set(c.appointment_id, list);
          });

          result.forEach(txn => {
            if (txn.appointmentId && chargesByAppt.has(txn.appointmentId)) {
              txn.usageCharges = chargesByAppt.get(txn.appointmentId)!;
              txn.usageChargeTotal = txn.usageCharges.reduce((s, c) => s + c.chargeAmount, 0);
              txn.grandTotal = txn.totalAmount + txn.tipAmount + txn.usageChargeTotal;
            }
          });
        }
      }

      // Sort by client name as fallback since date is the same for all
      result.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
      return result;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}
