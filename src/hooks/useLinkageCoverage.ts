/**
 * useLinkageCoverage — Visibility Contract for Phorest transaction-item linkage drift.
 *
 * Doctrine: Visibility Contracts (mem://architecture/visibility-contracts).
 * Reads the `v_linkage_coverage_30d` view and returns:
 *   - `null` when coverage_pct >= LINKAGE_HEALTHY_THRESHOLD (silence is valid output)
 *   - an advisory payload `{ coverage_pct, missing_count, location_id, last_sync_at }`
 *     when below threshold.
 *
 * Threshold rationale: 90% — chosen for stability. The Phorest payload shape has
 * changed once before; this gauge gives early warning without flapping in/out of
 * advisory state on small daily fluctuations.
 *
 * Suppression branch reports via `reportVisibilitySuppression('linkage-coverage',
 * 'linkage-coverage-healthy', { coverage_pct })` so the silence-feed devtool can
 * surface the suppression without scrolling logs.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

export const LINKAGE_HEALTHY_THRESHOLD = 90;

export interface LinkageCoverageRow {
  location_id: string;
  service_items: number;
  linked_items: number;
  coverage_pct: number;
  last_sync_at: string | null;
}

export interface LinkageDriftAdvisory {
  location_id: string;
  coverage_pct: number;
  missing_count: number;
  service_items: number;
  last_sync_at: string | null;
}

/**
 * Returns advisory payload only when below threshold; null otherwise.
 * If `locationId` is omitted, returns the worst-coverage location across
 * all locations the caller can see (RLS scoped via security_invoker view).
 */
export function useLinkageCoverage(locationId?: string) {
  return useQuery<LinkageDriftAdvisory | null>({
    queryKey: ['linkage-coverage', locationId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('v_linkage_coverage_30d').select('*');
      if (locationId) query = query.eq('location_id', locationId);

      const { data, error } = await query;
      if (error) {
        // Don't throw — Visibility Contracts must fail silent.
        // eslint-disable-next-line no-console
        console.warn('[useLinkageCoverage] read failed:', error.message);
        return null;
      }

      const rows = (data as LinkageCoverageRow[]) ?? [];
      if (rows.length === 0) return null;

      // Pick the worst coverage row (lowest coverage_pct).
      const worst = rows.reduce((acc, row) => {
        if (acc === null) return row;
        return row.coverage_pct < acc.coverage_pct ? row : acc;
      }, null as LinkageCoverageRow | null);

      if (!worst) return null;

      if (worst.coverage_pct >= LINKAGE_HEALTHY_THRESHOLD) {
        reportVisibilitySuppression('linkage-coverage', 'linkage-coverage-healthy', {
          coverage_pct: worst.coverage_pct,
          location_id: worst.location_id,
          threshold: LINKAGE_HEALTHY_THRESHOLD,
        });
        return null;
      }

      return {
        location_id: worst.location_id,
        coverage_pct: worst.coverage_pct,
        missing_count: worst.service_items - worst.linked_items,
        service_items: worst.service_items,
        last_sync_at: worst.last_sync_at,
      };
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 15,
  });
}
