/**
 * useMarkAllInventoryVerified — Batch-clears the
 * requires_inventory_reconciliation flag on multiple location entitlements
 * in a single mutation, then surfaces ONE rolled-up toast.
 *
 * Doctrine: Calm UX. Suppresses N individual success toasts when an admin
 * verifies every flagged location in one session.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarkAllVerifiedParams {
  organization_id: string;
  /** location_id + display name pairs so the toast can name a single location. */
  locations: { location_id: string; name?: string }[];
}

export function useMarkAllInventoryVerified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organization_id, locations }: MarkAllVerifiedParams) => {
      if (locations.length === 0) return { organization_id, count: 0, names: [] };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const nowIso = new Date().toISOString();
      const locationIds = locations.map((l) => l.location_id);

      const { error } = await supabase
        .from('backroom_location_entitlements')
        .update({
          requires_inventory_reconciliation: false,
          inventory_verified_at: nowIso,
          inventory_verified_by: user.id,
        } as any)
        .eq('organization_id', organization_id as any)
        .in('location_id', locationIds);

      if (error) throw error;

      return {
        organization_id,
        count: locations.length,
        names: locations.map((l) => l.name).filter(Boolean) as string[],
      };
    },
    onSuccess: ({ organization_id, count, names }) => {
      queryClient.invalidateQueries({
        queryKey: ['color-bar-location-entitlements', organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-entitlements'],
      });

      if (count === 0) return;
      if (count === 1) {
        const label = names[0] ?? 'Location';
        toast.success(`${label} verified — Color Bar restored`);
      } else {
        toast.success(`${count} locations verified — Color Bar fully restored`);
      }
    },
    onError: (error: any) => {
      toast.error(
        'Could not verify locations: ' + (error?.message ?? 'unknown error'),
      );
    },
  });
}
