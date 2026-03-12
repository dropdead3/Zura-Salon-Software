import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface SupplierMetrics {
  supplierName: string;
  totalOrders: number;
  receivedOrders: number;
  fillRate: number; // percentage
  avgLeadTimeDays: number | null;
  promisedLeadTimeDays: number | null;
  leadTimeAccuracy: number | null; // percentage (100 = perfect)
  totalSpend: number;
  priceConsistency: number | null; // 0–100%, higher = more stable
  priceChanges: number;
  grade: 'A' | 'B' | 'C' | 'D';
  riskLevel: 'none' | 'warning' | 'critical';
}

function computeGrade(fillRate: number, leadTimeAccuracy: number | null, priceConsistency: number | null): 'A' | 'B' | 'C' | 'D' {
  const ltScore = leadTimeAccuracy ?? 80;
  const pcScore = priceConsistency ?? 80;
  // Fill 50%, Lead Time 30%, Price Consistency 20%
  const combined = (fillRate * 0.5) + (ltScore * 0.3) + (pcScore * 0.2);
  if (combined >= 90) return 'A';
  if (combined >= 75) return 'B';
  if (combined >= 60) return 'C';
  return 'D';
}

function computeRiskLevel(grade: 'A' | 'B' | 'C' | 'D'): 'none' | 'warning' | 'critical' {
  if (grade === 'D') return 'critical';
  if (grade === 'C') return 'warning';
  return 'none';
}

/**
 * Compute coefficient of variation as a "consistency" score.
 * CV = stddev / mean. Low CV → high consistency.
 * Map to 0–100 where 0% CV = 100% consistency, 50%+ CV = 0% consistency.
 */
function computePriceConsistency(prices: number[]): number | null {
  if (prices.length < 2) return null;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  if (mean === 0) return null;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;
  // Map: 0 CV → 100%, 0.5+ CV → 0%
  return Math.max(0, Math.round((1 - Math.min(cv / 0.5, 1)) * 100));
}

export function useSupplierPerformance() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['supplier-performance', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('supplier_name, status, received_at, sent_at, created_at, expected_delivery_date, total_cost, quantity, items_received_count')
        .eq('organization_id', orgId!);

      if (error) throw error;

      // Get supplier lead time data from product_suppliers
      const { data: suppliers } = await supabase
        .from('product_suppliers')
        .select('supplier_name, lead_time_days, avg_delivery_days, delivery_count')
        .eq('organization_id', orgId!);

      // Get cost history for price consistency analysis
      const { data: costHistory } = await supabase
        .from('product_cost_history')
        .select('supplier_name, cost_price')
        .eq('organization_id', orgId!);

      // Group POs by supplier
      const supplierMap = new Map<string, typeof data>();
      for (const po of (data || [])) {
        const name = po.supplier_name || 'Unknown';
        if (!supplierMap.has(name)) supplierMap.set(name, []);
        supplierMap.get(name)!.push(po);
      }

      // Build supplier lead time lookup
      const supplierLeadTimes = new Map<string, { promised: number | null; actual: number | null }>();
      for (const s of (suppliers || [])) {
        const name = s.supplier_name || 'Unknown';
        if (!supplierLeadTimes.has(name)) {
          supplierLeadTimes.set(name, { promised: s.lead_time_days, actual: s.avg_delivery_days });
        }
      }

      // Build price consistency lookup by supplier
      const supplierPrices = new Map<string, number[]>();
      for (const ch of (costHistory || [])) {
        const name = ch.supplier_name || 'Unknown';
        if (!supplierPrices.has(name)) supplierPrices.set(name, []);
        supplierPrices.get(name)!.push(Number(ch.cost_price));
      }

      const metrics: SupplierMetrics[] = [];
      for (const [name, orders] of supplierMap) {
        const totalOrders = orders.length;
        const receivedOrders = orders.filter(o => o.status === 'received').length;
        const fillRate = totalOrders > 0 ? (receivedOrders / totalOrders) * 100 : 0;
        const totalSpend = orders.reduce((s, o) => s + (o.total_cost || 0), 0);

        // Lead time from received orders
        const leadTimes: number[] = [];
        for (const o of orders) {
          if (o.received_at && (o.sent_at || o.created_at)) {
            const start = new Date(o.sent_at || o.created_at);
            const end = new Date(o.received_at);
            const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (days >= 0) leadTimes.push(days);
          }
        }

        const avgLeadTimeDays = leadTimes.length > 0
          ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10
          : (supplierLeadTimes.get(name)?.actual ?? null);

        const promisedLeadTimeDays = supplierLeadTimes.get(name)?.promised ?? null;

        let leadTimeAccuracy: number | null = null;
        if (avgLeadTimeDays != null && promisedLeadTimeDays != null && promisedLeadTimeDays > 0) {
          leadTimeAccuracy = Math.min(100, Math.round((promisedLeadTimeDays / avgLeadTimeDays) * 100));
        }

        // Price consistency
        const prices = supplierPrices.get(name) ?? [];
        const priceConsistency = computePriceConsistency(prices);
        const priceChanges = Math.max(0, prices.length - 1);

        const grade = computeGrade(fillRate, leadTimeAccuracy, priceConsistency);

        metrics.push({
          supplierName: name,
          totalOrders,
          receivedOrders,
          fillRate: Math.round(fillRate),
          avgLeadTimeDays,
          promisedLeadTimeDays,
          leadTimeAccuracy,
          totalSpend,
          priceConsistency,
          priceChanges,
          grade,
          riskLevel: computeRiskLevel(grade),
        });
      }

      metrics.sort((a, b) => b.totalOrders - a.totalOrders);
      return metrics;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
