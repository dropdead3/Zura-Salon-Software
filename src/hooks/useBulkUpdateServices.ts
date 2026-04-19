import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from './useServicesData';

/**
 * Wave 3: Bulk-update fields for many services in one shot.
 *
 * Strategy:
 * - For value fields (price/duration/cost), accept either a flat patch or
 *   per-id patches so the caller can apply percentage adjustments client-side.
 * - For boolean/category fields, accept a single shared patch applied to all ids.
 * - Each row is updated individually (no Postgres bulk update API), but issued
 *   in parallel and reported as a single toast / single invalidation.
 */
export interface BulkServicePatch {
  // Shared boolean/category fields applied to every selected id
  shared?: Partial<Pick<Service,
    | 'category'
    | 'is_active'
    | 'bookable_online'
    | 'requires_qualification'
    | 'allow_same_day_booking'
    | 'requires_deposit'
    | 'require_card_on_file'
  >> & {
    // Wave 2 operational guardrail flags
    patch_test_required?: boolean;
  };
  // Per-id numeric overrides (for percent / flat price/duration adjustments)
  perId?: Record<string, Partial<Pick<Service, 'price' | 'duration_minutes' | 'cost'>>>;
}

export function useBulkUpdateServices(onAfterSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: BulkServicePatch }) => {
      if (ids.length === 0) throw new Error('No services selected');
      const shared = patch.shared ?? {};
      const perId = patch.perId ?? {};

      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const updates: Record<string, unknown> = { ...shared, ...(perId[id] ?? {}) };
          if (Object.keys(updates).length === 0) return { id, skipped: true };
          const { error } = await supabase
            .from('services')
            .update(updates)
            .eq('id', id);
          if (error) throw new Error(`${id}: ${error.message}`);
          return { id, skipped: false };
        }),
      );

      const failed = results.filter((r) => r.status === 'rejected');
      const succeeded = results.length - failed.length;
      return { succeeded, failed: failed.length, total: results.length };
    },
    onSuccess: async ({ succeeded, failed, total }) => {
      // Bug 4 fix: await invalidation before clearing selection so rows re-render
      // with fresh data before the selection toolbar disappears.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['services-data'] }),
        queryClient.invalidateQueries({ queryKey: ['service-prompts'] }),
      ]);
      if (failed === 0) {
        toast.success(`Updated ${succeeded} ${succeeded === 1 ? 'service' : 'services'}`);
      } else {
        toast.warning(`Updated ${succeeded} of ${total} — ${failed} failed`);
      }
      onAfterSuccess?.();
    },
    onError: (e: Error) => toast.error('Bulk update failed: ' + e.message),
  });
}

/**
 * Project monthly revenue impact of a price change across the selected
 * services, based on appointment volume in the trailing 30 days.
 *
 * Returns the projected monthly delta in dollars (positive = uplift).
 */
export function useBulkPriceImpactPreview(
  serviceIds: string[],
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['bulk-price-impact', organizationId, [...serviceIds].sort().join(',')],
    queryFn: async (): Promise<{
      volumeByService: Record<string, number>;
      totalVolume: number;
      servicesWithoutVolume: number;
    }> => {
      if (!organizationId || serviceIds.length === 0) {
        return { volumeByService: {}, totalVolume: 0, servicesWithoutVolume: 0 };
      }
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('appointments')
        .select('service_id')
        .eq('organization_id', organizationId)
        .in('service_id', serviceIds)
        .gte('appointment_date', sinceStr)
        .in('status', ['completed', 'checked_out', 'finished']);

      if (error) throw error;
      const volumeByService: Record<string, number> = {};
      for (const row of data ?? []) {
        const sid = (row as { service_id: string | null }).service_id;
        if (!sid) continue;
        volumeByService[sid] = (volumeByService[sid] ?? 0) + 1;
      }
      const totalVolume = Object.values(volumeByService).reduce((a, b) => a + b, 0);
      const servicesWithoutVolume = serviceIds.filter(
        (id) => (volumeByService[id] ?? 0) === 0,
      ).length;
      return { volumeByService, totalVolume, servicesWithoutVolume };
    },
    enabled: !!organizationId && serviceIds.length > 0,
    staleTime: 60 * 1000,
  });
}
