/**
 * useLocationProductSettings — Fetches and manages per-location product tracking settings.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { toast } from 'sonner';

export interface LocationProductSetting {
  id: string;
  product_id: string;
  location_id: string;
  is_tracked: boolean;
  par_level: number | null;
  reorder_level: number | null;
}

export function useLocationProductSettings(locationId: string | undefined) {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['location-product-settings', orgId, locationId],
    queryFn: async (): Promise<LocationProductSetting[]> => {
      const { data, error } = await supabase
        .from('location_product_settings')
        .select('id, product_id, location_id, is_tracked, par_level, reorder_level')
        .eq('organization_id', orgId!)
        .eq('location_id', locationId!);
      if (error) throw error;
      return (data || []) as LocationProductSetting[];
    },
    enabled: !!orgId && !!locationId,
    staleTime: 30_000,
  });
}

/** Build a Map<product_id, LocationProductSetting> for fast lookup */
export function useLocationProductSettingsMap(locationId: string | undefined) {
  const query = useLocationProductSettings(locationId);
  const map = new Map<string, LocationProductSetting>();
  (query.data || []).forEach((s) => map.set(s.product_id, s));
  return { ...query, settingsMap: map };
}

/** Upsert tracking for a single product at a location */
export function useUpsertLocationProductSetting() {
  const orgId = useBackroomOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      productId,
      is_tracked,
    }: {
      locationId: string;
      productId: string;
      is_tracked: boolean;
    }) => {
      const { error } = await supabase
        .from('location_product_settings')
        .upsert(
          {
            organization_id: orgId!,
            location_id: locationId,
            product_id: productId,
            is_tracked,
          } as any,
          { onConflict: 'location_id,product_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-product-settings'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
    },
    onError: (error) => toast.error('Failed to update tracking: ' + error.message),
  });
}

/** Bulk upsert tracking for multiple products at a location */
export function useBulkUpsertLocationProductSettings() {
  const orgId = useBackroomOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      productIds,
      is_tracked,
    }: {
      locationId: string;
      productIds: string[];
      is_tracked: boolean;
    }) => {
      if (productIds.length === 0) return;
      const rows = productIds.map((productId) => ({
        organization_id: orgId!,
        location_id: locationId,
        product_id: productId,
        is_tracked,
      }));
      const { error } = await supabase
        .from('location_product_settings')
        .upsert(rows as any[], { onConflict: 'location_id,product_id' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['location-product-settings'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      toast.success(
        `${vars.is_tracked ? 'Enabled' : 'Disabled'} tracking for ${vars.productIds.length} products`
      );
    },
    onError: (error) => toast.error('Bulk update failed: ' + error.message),
  });
}
