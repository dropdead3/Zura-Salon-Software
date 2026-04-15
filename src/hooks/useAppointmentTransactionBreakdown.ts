import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isVishServiceCharge } from '@/utils/serviceCategorization';

export interface TransactionLineItem {
  id: string;
  transactionId: string;
  itemName: string;
  itemType: string;
  itemCategory: string | null;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  taxAmount: number;
  quantity: number;
  paymentMethod: string | null;
  stylistName: string | null;
}

export interface TransactionSummary {
  servicesTotal: number;
  productsTotal: number;
  feesTotal: number;
  depositsTotal: number;
  otherTotal: number;
  subtotalBeforeDiscount: number;
  discountTotal: number;
  taxTotal: number;
  tip: number;
  grandTotal: number;
  paymentMethods: string[];
}

export interface ExistingRefund {
  id: string;
  originalTransactionId: string;
  originalItemName: string | null;
  refundAmount: number;
  refundType: string;
  status: string;
  reason: string | null;
  createdAt: string | null;
}

export interface TransactionBreakdown {
  items: TransactionLineItem[];
  services: TransactionLineItem[];
  products: TransactionLineItem[];
  fees: TransactionLineItem[];
  deposits: TransactionLineItem[];
  other: TransactionLineItem[];
  summary: TransactionSummary;
  refunds: ExistingRefund[];
  hasTransaction: boolean;
}

function categorize(item: TransactionLineItem) {
  const t = item.itemType?.toLowerCase() || '';
  if (t === 'service' || t === 'special_offer_item') return 'service';
  if (t === 'product') {
    // Vish chemical charges are service overage fees, not retail
    if (isVishServiceCharge(item.itemName, item.itemType)) return 'fee';
    return 'product';
  }
  if (t === 'sale_fee') return 'fee';
  if (t === 'appointment_deposit' || t === 'outstanding_balance_pmt') return 'deposit';
  return 'other';
}

export function useAppointmentTransactionBreakdown(
  phorestClientId: string | null | undefined,
  appointmentDate: string | null | undefined,
) {
  return useQuery<TransactionBreakdown>({
    queryKey: ['appointment-transaction-breakdown', phorestClientId, appointmentDate],
    queryFn: async () => {
      if (!phorestClientId || !appointmentDate) {
        return emptyBreakdown();
      }

      // Fetch all transaction items for this client + date
      const { data: rawItems, error } = await supabase
        .from('v_all_transaction_items')
        .select('id, transaction_id, item_name, item_type, item_category, unit_price, discount, total_amount, tax_amount, tip_amount, quantity, payment_method, staff_name')
        .eq('external_client_id', phorestClientId)
        .eq('transaction_date', appointmentDate);

      if (error) throw error;
      if (!rawItems || rawItems.length === 0) return emptyBreakdown();

      // Deduplicate tip: take MAX across all items
      const tip = Math.max(0, ...rawItems.map((r) => Number(r.tip_amount) || 0));

      // Map to structured items
      const items: TransactionLineItem[] = rawItems.map((r) => ({
        id: r.id,
        transactionId: r.transaction_id,
        itemName: r.item_name,
        itemType: r.item_type,
        itemCategory: r.item_category,
        unitPrice: Number(r.unit_price) || 0,
        discount: Number(r.discount) || 0,
        totalAmount: Number(r.total_amount) || 0,
        taxAmount: Number(r.tax_amount) || 0,
        quantity: Number(r.quantity) || 1,
        paymentMethod: r.payment_method,
        stylistName: r.staff_name,
      }));

      const services = items.filter((i) => categorize(i) === 'service');
      const products = items.filter((i) => categorize(i) === 'product');
      const fees = items.filter((i) => categorize(i) === 'fee');
      const deposits = items.filter((i) => categorize(i) === 'deposit');
      const other = items.filter((i) => categorize(i) === 'other');

      const sum = (arr: TransactionLineItem[], key: keyof TransactionLineItem) =>
        arr.reduce((s, i) => s + (Number(i[key]) || 0), 0);

      const servicesTotal = sum(services, 'totalAmount');
      const productsTotal = sum(products, 'totalAmount');
      const feesTotal = sum(fees, 'totalAmount');
      const depositsTotal = sum(deposits, 'totalAmount');
      const otherTotal = sum(other, 'totalAmount');

      const subtotalBeforeDiscount = items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
      const discountTotal = items.reduce((s, i) => s + i.discount, 0);
      const taxTotal = items.reduce((s, i) => s + i.taxAmount, 0);
      const itemsTotal = items.reduce((s, i) => s + i.totalAmount, 0);
      const grandTotal = itemsTotal + taxTotal + tip;

      const paymentMethods = [...new Set(items.map((i) => i.paymentMethod).filter(Boolean) as string[])];

      // Fetch existing refunds for these transaction IDs
      const transactionIds = [...new Set(items.map((i) => i.transactionId))];
      let refunds: ExistingRefund[] = [];
      if (transactionIds.length > 0) {
        const { data: refundData } = await supabase
          .from('refund_records')
          .select('id, original_transaction_id, original_item_name, refund_amount, refund_type, status, reason, created_at')
          .in('original_transaction_id', transactionIds);

        refunds = (refundData || []).map((r) => ({
          id: r.id,
          originalTransactionId: r.original_transaction_id,
          originalItemName: r.original_item_name,
          refundAmount: Number(r.refund_amount),
          refundType: r.refund_type,
          status: r.status,
          reason: r.reason,
          createdAt: r.created_at,
        }));
      }

      return {
        items,
        services,
        products,
        fees,
        deposits,
        other,
        summary: {
          servicesTotal,
          productsTotal,
          feesTotal,
          depositsTotal,
          otherTotal,
          subtotalBeforeDiscount,
          discountTotal,
          taxTotal,
          tip,
          grandTotal,
          paymentMethods,
        },
        refunds,
        hasTransaction: true,
      };
    },
    enabled: !!phorestClientId && !!appointmentDate,
    staleTime: 2 * 60 * 1000,
  });
}

function emptyBreakdown(): TransactionBreakdown {
  return {
    items: [],
    services: [],
    products: [],
    fees: [],
    deposits: [],
    other: [],
    summary: {
      servicesTotal: 0,
      productsTotal: 0,
      feesTotal: 0,
      depositsTotal: 0,
      otherTotal: 0,
      subtotalBeforeDiscount: 0,
      discountTotal: 0,
      taxTotal: 0,
      tip: 0,
      grandTotal: 0,
      paymentMethods: [],
    },
    refunds: [],
    hasTransaction: false,
  };
}
