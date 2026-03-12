/**
 * useUsageVariance — Compares actual bowl line usage vs service recipe baselines.
 * Returns per-product variance with status flags.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface UsageVariance {
  product_id: string;
  product_name: string;
  expected_quantity: number;
  actual_quantity: number;
  variance: number;
  variance_pct: number;
  status: 'under' | 'over' | 'within_tolerance' | 'unplanned' | 'missing';
}

const TOLERANCE_PCT = 10; // ±10%

export function useUsageVariance(
  sessionId: string | null,
  serviceId: string | null
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['usage-variance', orgId, sessionId, serviceId],
    queryFn: async (): Promise<UsageVariance[]> => {
      // 1. Get baselines for this service
      const { data: baselines, error: bErr } = await supabase
        .from('service_recipe_baselines')
        .select('product_id, expected_quantity')
        .eq('organization_id', orgId!)
        .eq('service_id', serviceId!);

      if (bErr) throw bErr;

      // 2. Get non-discarded bowls for session
      const { data: bowls, error: bowlErr } = await supabase
        .from('mix_bowls')
        .select('id')
        .eq('mix_session_id', sessionId!)
        .neq('status', 'discarded');

      if (bowlErr) throw bowlErr;
      if (!bowls?.length) return [];

      const bowlIds = (bowls as any[]).map((b) => b.id);

      // 3. Get all lines
      const { data: lines, error: lineErr } = await supabase
        .from('mix_bowl_lines')
        .select('product_id, product_name_snapshot, dispensed_quantity')
        .in('bowl_id', bowlIds);

      if (lineErr) throw lineErr;

      // 4. Aggregate actual usage by product
      const actualMap = new Map<string, { qty: number; name: string }>();
      for (const line of (lines ?? []) as any[]) {
        if (!line.product_id) continue;
        const existing = actualMap.get(line.product_id);
        if (existing) {
          existing.qty += line.dispensed_quantity;
        } else {
          actualMap.set(line.product_id, {
            qty: line.dispensed_quantity,
            name: line.product_name_snapshot,
          });
        }
      }

      // 5. Build variance list
      const baselineMap = new Map(
        ((baselines ?? []) as any[]).map((b) => [b.product_id, b.expected_quantity as number])
      );

      const results: UsageVariance[] = [];

      // Check baseline products
      for (const [productId, expected] of baselineMap) {
        const actual = actualMap.get(productId);
        const actualQty = actual?.qty ?? 0;
        const variance = actualQty - expected;
        const variancePct = expected > 0 ? (variance / expected) * 100 : 0;

        let status: UsageVariance['status'];
        if (actualQty === 0) {
          status = 'missing';
        } else if (Math.abs(variancePct) <= TOLERANCE_PCT) {
          status = 'within_tolerance';
        } else if (variance > 0) {
          status = 'over';
        } else {
          status = 'under';
        }

        results.push({
          product_id: productId,
          product_name: actual?.name ?? productId,
          expected_quantity: expected,
          actual_quantity: actualQty,
          variance: Math.round(variance * 100) / 100,
          variance_pct: Math.round(variancePct * 10) / 10,
          status,
        });
      }

      // Check unplanned products (used but not in baseline)
      for (const [productId, { qty, name }] of actualMap) {
        if (!baselineMap.has(productId)) {
          results.push({
            product_id: productId,
            product_name: name,
            expected_quantity: 0,
            actual_quantity: qty,
            variance: qty,
            variance_pct: 100,
            status: 'unplanned',
          });
        }
      }

      return results;
    },
    enabled: !!orgId && !!sessionId && !!serviceId,
    staleTime: 60_000,
  });
}
