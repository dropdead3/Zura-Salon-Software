/**
 * useMarkInventoryVerified — Clears the requires_inventory_reconciliation
 * flag on a location's Color Bar entitlement after an admin confirms a
 * physical inventory recount.
 *
 * Doctrine: data integrity gate. Until this flag is cleared, supply-low
 * alerts and formula-cost-drift alerts for the location are suppressed
 * because tracked quantities can't be trusted after a tracking gap.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarkVerifiedParams {
  organization_id: string;
  location_id: string;
  /** When true, suppresses the success toast (used by batch verify flows). */
  silent?: boolean;
}

export function useMarkInventoryVerified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organization_id, location_id, silent }: MarkVerifiedParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('backroom_location_entitlements')
        .update({
          requires_inventory_reconciliation: false,
          inventory_verified_at: new Date().toISOString(),
          inventory_verified_by: user.id,
        } as any)
        .eq('organization_id', organization_id as any)
        .eq('location_id', location_id as any);

      if (error) throw error;
      return { organization_id, location_id, silent: !!silent };
    },
    onSuccess: ({ organization_id, silent }) => {
      queryClient.invalidateQueries({
        queryKey: ['color-bar-location-entitlements', organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['platform-color-bar-entitlements'],
      });
      if (!silent) {
        toast.success('Inventory verified — alerts re-enabled for this location');
      }
    },
    onError: (error: any) => {
      toast.error('Could not mark inventory verified: ' + (error?.message ?? 'unknown error'));
    },
  });
}
