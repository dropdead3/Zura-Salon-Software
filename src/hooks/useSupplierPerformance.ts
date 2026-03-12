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
  grade: 'A' | 'B' | 'C' | 'D';
}

function computeGrade(fillRate: number, leadTimeAccuracy: number | null): 'A' | 'B' | 'C' | 'D' {
  const ltScore = leadTimeAccuracy ?? 80;
  const combined = (fillRate * 0.6) + (ltScore * 0.4);
  if (combined >= 90) return 'A';
  if (combined >= 75) return 'B';
  if (combined >= 60) return 'C';
  return 'D';
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

      // Also get supplier lead time data from product_suppliers
      const { data: suppliers } = await supabase
        .from('product_suppliers')
        .select('supplier_name, lead_time_days, avg_delivery_days, delivery_count')
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
          // 100% = delivered exactly on time. Lower = late.
          leadTimeAccuracy = Math.min(100, Math.round((promisedLeadTimeDays / avgLeadTimeDays) * 100));
        }

        metrics.push({
          supplierName: name,
          totalOrders,
          receivedOrders,
          fillRate: Math.round(fillRate),
          avgLeadTimeDays,
          promisedLeadTimeDays,
          leadTimeAccuracy,
          totalSpend,
          grade: computeGrade(fillRate, leadTimeAccuracy),
        });
      }

      metrics.sort((a, b) => b.totalOrders - a.totalOrders);
      return metrics;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
