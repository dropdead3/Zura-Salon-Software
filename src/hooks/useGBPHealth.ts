/**
 * useGBPHealth — Aggregates per-location Google Business Profile connection
 * health for the current org. Drives the OAuth grace banner.
 *
 * Returns counts of expired/revoked/error rows so the banner can render
 * "X of Y locations need Google reconnect".
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface GBPHealth {
  total: number;
  active: number;
  needsReconnect: number;
  unmapped: number; // legacy org-scoped rows (location_id IS NULL)
  staleDays: number | null;
  affectedLocationIds: string[];
  /**
   * Most recent `last_error` reason among rows that need attention.
   * Drives the banner copy ("Token revoked" vs "GBP suspended" etc.) and
   * primes the audit deep-link so operators see why before clicking Reconnect.
   */
  topError: { locationId: string | null; reason: string | null } | null;
}

export function useGBPHealth(): { data: GBPHealth | undefined; isLoading: boolean } {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['gbp-health', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<GBPHealth> => {
      const { data: rows, error } = await supabase
        .from('review_platform_connections')
        .select('location_id, status, last_verified_at, last_error, updated_at')
        .eq('organization_id', orgId!)
        .eq('platform', 'google');
      if (error) throw error;

      const total = rows?.length ?? 0;
      const active = rows?.filter((r) => r.status === 'active').length ?? 0;
      const attentionRows =
        rows?.filter((r) => r.status === 'expired' || r.status === 'revoked' || r.status === 'error') ?? [];
      const needsReconnect = attentionRows.length;
      const unmapped = rows?.filter((r) => r.location_id == null).length ?? 0;
      const affectedLocationIds = attentionRows
        .filter((r) => r.location_id)
        .map((r) => r.location_id!) as string[];

      // Pick the most recently-updated attention row for the banner deep-link.
      const topErrorRow = [...attentionRows].sort((a, b) => {
        const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bt - at;
      })[0];
      const topError = topErrorRow
        ? { locationId: topErrorRow.location_id ?? null, reason: topErrorRow.last_error ?? null }
        : null;

      const oldestVerified = rows
        ?.map((r) => (r.last_verified_at ? new Date(r.last_verified_at).getTime() : null))
        .filter((t): t is number => t != null)
        .sort((a, b) => a - b)[0];
      const staleDays = oldestVerified ? Math.floor((Date.now() - oldestVerified) / 86_400_000) : null;

      return { total, active, needsReconnect, unmapped, staleDays, affectedLocationIds, topError };
    },
  });

  return { data, isLoading };
}
