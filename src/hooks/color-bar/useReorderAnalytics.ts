/**
 * useReorderAnalytics — Aggregates 6 months of PO data for analytics dashboard.
 * useProcurementBudget — Read/update per-org procurement budget targets.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useColorBarOrgId } from './useColorBarOrgId';
import { subMonths, addMonths, format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export interface ReorderAnalyticsData {
  totalPOs: number;
  totalSpend: number;
  avgOrderValue: number;
  avgLeadTimeDays: number | null;
  monthlySpendBySupplier: { month: string; supplier: string; spend: number }[];
  monthlyTotals: { month: string; spend: number }[];
  projectedNextMonth: number;
  projected3Months: { month: string; projected: number }[];
  trendPct: number;
  currentMonthSpend: number;
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

/** Weighted moving average: recent months weighted heavier (3x, 2x, 1x). */
function weightedMovingAvg(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const recent = values.slice(-3);
  const weights = recent.length === 3 ? [1, 2, 3] : recent.length === 2 ? [1, 2] : [1];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  return recent.reduce((sum, v, i) => sum + v * weights[i], 0) / weightSum;
}

export function useReorderAnalytics() {
  const orgId = useColorBarOrgId();

  return useQuery({
    queryKey: ['reorder-analytics', orgId],
    queryFn: async (): Promise<ReorderAnalyticsData> => {
      const cutoff = subMonths(new Date(), 6).toISOString();
      const currentMonth = format(new Date(), 'yyyy-MM');

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

      // Monthly totals (aggregate across suppliers)
      const monthTotalMap = new Map<string, number>();
      for (const entry of monthlySpendBySupplier) {
        monthTotalMap.set(entry.month, (monthTotalMap.get(entry.month) || 0) + entry.spend);
      }
      const monthlyTotals = [...monthTotalMap.entries()]
        .map(([month, spend]) => ({ month, spend }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Current month spend
      const currentMonthSpend = monthTotalMap.get(currentMonth) || 0;

      // Projections — weighted moving average
      const spendValues = monthlyTotals.map(m => m.spend);
      const projectedNextMonth = weightedMovingAvg(spendValues);

      // Project 3 months out
      const projected3Months: ReorderAnalyticsData['projected3Months'] = [];
      const projectionValues = [...spendValues];
      for (let i = 1; i <= 3; i++) {
        const projected = weightedMovingAvg(projectionValues);
        const monthLabel = format(addMonths(new Date(), i), 'yyyy-MM');
        projected3Months.push({ month: monthLabel, projected });
        projectionValues.push(projected);
      }

      // Trend % (month-over-month)
      let trendPct = 0;
      if (spendValues.length >= 2) {
        const prev = spendValues[spendValues.length - 2];
        const curr = spendValues[spendValues.length - 1];
        trendPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      }

      // Top products (from lines + single-product POs)
      const productAgg = new Map<string, { orderCount: number; totalUnits: number; totalSpend: number; totalCostEntries: number }>();
      
      for (const l of lines) {
        const existing = productAgg.get(l.product_id) || { orderCount: 0, totalUnits: 0, totalSpend: 0, totalCostEntries: 0 };
        existing.orderCount++;
        existing.totalUnits += Number(l.quantity_ordered) || 0;
        existing.totalSpend += Number(l.line_total) || 0;
        if (l.unit_cost) existing.totalCostEntries++;
        productAgg.set(l.product_id, existing);
      }

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
        monthlyTotals,
        projectedNextMonth,
        projected3Months,
        trendPct,
        currentMonthSpend,
        topProducts,
        supplierPerformance,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}

/* ── Procurement Budget Hook ── */

export interface ProcurementBudget {
  id: string;
  organization_id: string;
  monthly_budget: number;
  alert_threshold_pct: number;
  updated_at: string;
}

export function useProcurementBudget() {
  const orgId = useColorBarOrgId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['procurement-budget', orgId],
    queryFn: async (): Promise<ProcurementBudget | null> => {
      const { data, error } = await supabase
        .from('procurement_budgets')
        .select('*')
        .eq('organization_id', orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProcurementBudget | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: { monthly_budget: number; alert_threshold_pct: number }) => {
      const { data, error } = await supabase
        .from('procurement_budgets')
        .upsert({
          organization_id: orgId!,
          monthly_budget: input.monthly_budget,
          alert_threshold_pct: input.alert_threshold_pct,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-budget', orgId] });
      toast.success('Budget target updated');
    },
    onError: (err) => {
      toast.error('Failed to update budget: ' + err.message);
    },
  });

  return {
    budget: query.data,
    isLoading: query.isLoading,
    upsertBudget: upsertMutation.mutate,
    isUpdating: upsertMutation.isPending,
  };
}
