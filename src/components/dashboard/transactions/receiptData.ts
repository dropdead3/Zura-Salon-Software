import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';

export interface ReceiptLineItem {
  name: string;
  amount: number;
  quantity: number;
  category?: 'service' | 'addon' | 'retail' | 'overage' | 'product_cost' | 'surcharge';
}

export interface ReceiptUsageCharge {
  name: string;
  quantity: number;
  amount: number;
  chargeType: string;
}

export interface ReceiptData {
  clientName: string;
  stylistName: string | null;
  date: string;
  receiptNumber: string;
  items: ReceiptLineItem[];
  usageCharges: ReceiptUsageCharge[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  taxAmount: number;
  tipAmount: number;
  usageChargeTotal: number;
  grandTotal: number;
  paymentMethod?: string | null;
}

/**
 * Map a GroupedTransaction (Transactions page) → ReceiptData
 */
export function groupedTransactionToReceiptData(txn: GroupedTransaction, afterpaySurchargeAmount?: number | null): ReceiptData {
  const usageCharges = (txn.usageCharges || []).map((c) => ({
    name: c.serviceName || (c.chargeType === 'product_cost' ? 'Product Cost' : 'Overage'),
    quantity: c.overageQty,
    amount: c.chargeAmount,
    chargeType: c.chargeType,
  }));
  const usageChargeTotal = usageCharges.reduce((s, c) => s + c.amount, 0);

  const items: ReceiptLineItem[] = txn.items.map((item) => ({
    name: item.itemName,
    amount: item.totalAmount,
    quantity: item.quantity,
    category: 'service' as const,
  }));

  // Add surcharge line item if present
  if (afterpaySurchargeAmount && afterpaySurchargeAmount > 0) {
    items.push({
      name: 'Afterpay Processing Fee',
      amount: afterpaySurchargeAmount / 100,
      quantity: 1,
      category: 'surcharge',
    });
  }

  return {
    clientName: txn.clientName || 'Walk-in',
    stylistName: txn.stylistName,
    date: txn.transactionDate,
    receiptNumber: txn.transactionId,
    items,
    usageCharges,
    subtotal: txn.subtotal,
    discount: txn.discountAmount,
    taxAmount: txn.taxAmount,
    tipAmount: txn.tipAmount,
    usageChargeTotal,
    grandTotal: txn.grandTotal,
    paymentMethod: txn.paymentMethod,
  };
}

/**
 * Map checkout data (Scheduler checkout) → ReceiptData
 */
export function checkoutToReceiptData(opts: {
  appointment: {
    id: string;
    client_name?: string | null;
    service_name?: string | null;
    total_price?: number | null;
    appointment_date: string;
  };
  stylistName: string;
  addonEvents: { addon_name: string; addon_price: number }[];
  productCostCharges: { service_name?: string | null; charge_amount: number; charge_type: string }[];
  overageCharges: { service_name?: string | null; charge_amount: number; overage_qty?: number; charge_type: string }[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  taxAmount: number;
  tipAmount: number;
  grandTotal: number;
  paymentMethod?: string;
}): ReceiptData {
  const items: ReceiptLineItem[] = [
    {
      name: opts.appointment.service_name || 'Service',
      amount: opts.appointment.total_price || 0,
      quantity: 1,
      category: 'service',
    },
    ...opts.addonEvents.map((e) => ({
      name: e.addon_name,
      amount: e.addon_price,
      quantity: 1,
      category: 'addon' as const,
    })),
  ];

  const usageCharges: ReceiptUsageCharge[] = [
    ...opts.productCostCharges.map((c) => ({
      name: c.service_name ?? 'Product',
      quantity: 1,
      amount: c.charge_amount,
      chargeType: c.charge_type,
    })),
    ...opts.overageCharges.map((c) => ({
      name: c.service_name ?? 'Overage',
      quantity: c.overage_qty ?? 1,
      amount: c.charge_amount,
      chargeType: c.charge_type,
    })),
  ];
  const usageChargeTotal = usageCharges.reduce((s, c) => s + c.amount, 0);

  return {
    clientName: opts.appointment.client_name || 'Walk-in',
    stylistName: opts.stylistName,
    date: opts.appointment.appointment_date,
    receiptNumber: opts.appointment.id,
    items,
    usageCharges,
    subtotal: opts.subtotal,
    discount: opts.discount,
    discountLabel: opts.discountLabel,
    taxAmount: opts.taxAmount,
    tipAmount: opts.tipAmount,
    usageChargeTotal,
    grandTotal: opts.grandTotal,
    paymentMethod: opts.paymentMethod,
  };
}
