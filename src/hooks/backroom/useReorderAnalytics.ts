/**
 * useReorderAnalytics — Aggregates 6 months of PO data for analytics dashboard.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { subMonths, format, differenceInDays } from 'date-fns';

export interface ReorderAnalyticsData {
  totalPOs: number;
  totalSpend: number;
  avgOrderValue: number;
  avgLeadTimeDays: number | null;
  monthlySpendBySupplier: { month: string; supplier: string; spend: number }[];
  topProducts: {
    productId: string;
    productName: string;
    orderCount: number;
    totalUnits: number;
    totalSpend: number;
    avgUnitCost: number;
  }[];
  supplierPerformance: {
    supplierName: string;
    poCount: number;
    avgLeadTimeDays: number | null;
    onTimePct: number;
    totalSpend: number;
  }[];
}

export function useReorderAnalytics() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['reorder-analytics', orgId],
    queryFn: async (): Promise<ReorderAnalyticsData> => {
      const cutoff = subMonths(new Date(), 6).toISOString();

      // Fetch POs from last 6 months
      const { data: orders = [] } = await supabase
        .from('purchase_orders')
        .select('id, supplier_name, quantity, total_cost, unit_cost, status, created_at, sent_at, received_at, expected_delivery_date, product_id')
        .eq('organization_id', orgId!)
        .gte('created_at', cutoff)
        .neq('status', 'cancelled');

      // Fetch PO lines
      const poIds = orders.map(o => o.id);
      let lines: any[] = [];
      if (poIds.length > 0) {
        const { data } = await supabase
          .from('purchase_order_lines')
          .select('purchase_order_id, product_id, quantity_ordered, unit_cost, line_total')
          .in('purchase_order_id', poIds);
        lines = data || [];
      }

      // Fetch product names
      const allProductIds = new Set<string>();
      orders.forEach(o => allProductIds.add(o.product_id));
      lines.forEach(l => allProductIds.add(l.product_id));
      
      let productMap = new Map<string, string>();
      if (allProductIds.size > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', [...allProductIds]);
        productMap = new Map((products || []).map(p => [p.id, p.name]));
      }

      // KPIs
      const totalPOs = orders.length;
      const totalSpend = orders.reduce((s, o) => s + (Number(o.total_cost) || 0), 0);
      const avgOrderValue = totalPOs > 0 ? totalSpend / totalPOs : 0;

      // Lead time (sent -> received)
      const leadTimes: number[] = [];
      for (const o of orders) {
        if (o.received_at && (o.sent_at || o.created_at)) {
          const days = differenceInDays(new Date(o.received_at), new Date(o.sent_at || o.created_at));
          if (days >= 0) leadTimes.push(days);
        }
      }
      const avgLeadTimeDays = leadTimes.length > 0
        ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10
        : null;

      // Monthly spend by supplier
      const monthlyMap = new Map<string, number>();
      const monthlySpendBySupplier: ReorderAnalyticsData['monthlySpendBySupplier'] = [];
      for (const o of orders) {
        const month = format(new Date(o.created_at), 'yyyy-MM');
        const supplier = o.supplier_name || 'Unknown';
        const key = `${month}|${supplier}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + (Number(o.total_cost) || 0));
      }
      for (const [key, spend] of monthlyMap) {
        const [month, supplier] = key.split('|');
        monthlySpendBySupplier.push({ month, supplier, spend });
      }
      monthlySpendBySupplier.sort((a, b) => a.month.localeCompare(b.month));

      // Top products (from lines + single-product POs)
      const productAgg = new Map<string, { orderCount: number; totalUnits: number; totalSpend: number; totalCostEntries: number }>();
      
      // From PO lines
      for (const l of lines) {
        const existing = productAgg.get(l.product_id) || { orderCount: 0, totalUnits: 0, totalSpend: 0, totalCostEntries: 0 };
        existing.orderCount++;
        existing.totalUnits += Number(l.quantity_ordered) || 0;
        existing.totalSpend += Number(l.line_total) || 0;
        if (l.unit_cost) existing.totalCostEntries++;
        productAgg.set(l.product_id, existing);
      }

      // From single-product POs (those without lines)
      const posWithLines = new Set(lines.map(l => l.purchase_order_id));
      for (const o of orders) {
        if (posWithLines.has(o.id)) continue;
        const existing = productAgg.get(o.product_id) || { orderCount: 0, totalUnits: 0, totalSpend: 0, totalCostEntries: 0 };
        existing.orderCount++;
        existing.totalUnits += Number(o.quantity) || 0;
        existing.totalSpend += Number(o.total_cost) || 0;
        if (o.unit_cost) existing.totalCostEntries++;
        productAgg.set(o.product_id, existing);
      }

      const topProducts = [...productAgg.entries()]
        .map(([pid, agg]) => ({
          productId: pid,
          productName: productMap.get(pid) || pid.slice(0, 8),
          orderCount: agg.orderCount,
          totalUnits: agg.totalUnits,
          totalSpend: agg.totalSpend,
          avgUnitCost: agg.totalUnits > 0 ? agg.totalSpend / agg.totalUnits : 0,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 20);

      // Supplier performance
      const supplierAgg = new Map<string, { poCount: number; totalSpend: number; leadTimes: number[]; onTimeCount: number; deliveryCount: number }>();
      for (const o of orders) {
        const name = o.supplier_name || 'Unknown';
        const existing = supplierAgg.get(name) || { poCount: 0, totalSpend: 0, leadTimes: [], onTimeCount: 0, deliveryCount: 0 };
        existing.poCount++;
        existing.totalSpend += Number(o.total_cost) || 0;
        if (o.received_at && (o.sent_at || o.created_at)) {
          const days = differenceInDays(new Date(o.received_at), new Date(o.sent_at || o.created_at));
          if (days >= 0) existing.leadTimes.push(days);
          existing.deliveryCount++;
          if (o.expected_delivery_date && new Date(o.received_at) <= new Date(o.expected_delivery_date)) {
            existing.onTimeCount++;
          }
        }
        supplierAgg.set(name, existing);
      }

      const supplierPerformance = [...supplierAgg.entries()]
        .map(([name, agg]) => ({
          supplierName: name,
          poCount: agg.poCount,
          avgLeadTimeDays: agg.leadTimes.length > 0
            ? Math.round((agg.leadTimes.reduce((a, b) => a + b, 0) / agg.leadTimes.length) * 10) / 10
            : null,
          onTimePct: agg.deliveryCount > 0
            ? Math.round((agg.onTimeCount / agg.deliveryCount) * 100)
            : 0,
          totalSpend: agg.totalSpend,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend);

      return {
        totalPOs,
        totalSpend,
        avgOrderValue,
        avgLeadTimeDays,
        monthlySpendBySupplier,
        topProducts,
        supplierPerformance,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
