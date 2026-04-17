/**
 * useReactivationStatus — Fetches whether an organization was previously
 * suspended (i.e. has any backroom_location_entitlements with
 * status='suspended'). Used to make the reactivation dialog open instantly
 * when the platform admin clicks the toggle.
 *
 * Doctrine: Performance. Eliminates the network round-trip that previously
 * happened inside the toggle handler. Prefetched on hover/focus of the
 * toggle row.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReactivationStatus {
  wasPreviouslySuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedLocationCount: number;
  affectedLocationNames: string[];
}

const EMPTY: ReactivationStatus = {
  wasPreviouslySuspended: false,
  suspendedAt: null,
  suspendedReason: null,
  suspendedLocationCount: 0,
  affectedLocationNames: [],
};

async function fetchReactivationStatus(orgId: string): Promise<ReactivationStatus> {
  // Single round-trip: join locations on the suspended entitlement rows so
  // we resolve names without a second query.
  const { data: suspendedRows } = await supabase
    .from('backroom_location_entitlements')
    .select('location_id, suspended_at, suspended_reason, locations:locations(name)')
    .eq('organization_id', orgId as any)
    .eq('status', 'suspended' as any)
    .order('suspended_at', { ascending: false });

  if (!suspendedRows || suspendedRows.length === 0) return EMPTY;

  return {
    wasPreviouslySuspended: true,
    suspendedAt: (suspendedRows[0] as any).suspended_at as string | null,
    suspendedReason: (suspendedRows[0] as any).suspended_reason as string | null,
    suspendedLocationCount: suspendedRows.length,
    affectedLocationNames: suspendedRows.map(
      (r: any) => r.locations?.name ?? 'Unknown location',
    ),
  };
}

export function useReactivationStatus(orgId?: string) {
  return useQuery({
    queryKey: ['color-bar-reactivation-status', orgId],
    queryFn: () => fetchReactivationStatus(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

/**
 * Returns a stable prefetch fn — call from onMouseEnter/onFocus on the
 * toggle row to warm the cache before the user clicks.
 */
export function usePrefetchReactivationStatus() {
  const queryClient = useQueryClient();
  return (orgId?: string) => {
    if (!orgId) return;
    queryClient.prefetchQuery({
      queryKey: ['color-bar-reactivation-status', orgId],
      queryFn: () => fetchReactivationStatus(orgId),
      staleTime: 30_000,
    });
  };
}

export { fetchReactivationStatus };
