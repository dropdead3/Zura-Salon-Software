/**
 * useLocationProductSettings — Fetches and manages per-location product tracking settings.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useColorBarOrgId } from './useColorBarOrgId';
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
  const orgId = useColorBarOrgId();

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
  const orgId = useColorBarOrgId();
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
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
    },
    onError: (error) => toast.error('Failed to update tracking: ' + error.message),
  });
}

/** Bulk upsert tracking for multiple products at a location */
export function useBulkUpsertLocationProductSettings() {
  const orgId = useColorBarOrgId();
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
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      toast.success(
        `${vars.is_tracked ? 'Enabled' : 'Disabled'} tracking for ${vars.productIds.length} products`
      );
    },
    onError: (error) => toast.error('Bulk update failed: ' + error.message),
  });
}

/** Sync tracked products from one location to all other active locations */
export function useSyncCatalogToAllLocations() {
  const orgId = useColorBarOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceLocationId,
      targetLocationIds,
      includeLevels,
    }: {
      sourceLocationId: string;
      targetLocationIds: string[];
      includeLevels: boolean;
    }) => {
      if (!orgId || targetLocationIds.length === 0) return { synced: 0, targets: 0 };

      // 1. Fetch source location's tracked products
      const { data: sourceSettings, error: fetchErr } = await supabase
        .from('location_product_settings')
        .select('product_id, is_tracked, par_level, reorder_level')
        .eq('organization_id', orgId)
        .eq('location_id', sourceLocationId)
        .eq('is_tracked', true);
      if (fetchErr) throw fetchErr;
      if (!sourceSettings?.length) throw new Error('No tracked products found at this location');

      // 2. Build upsert rows for each target location
      const rows = targetLocationIds.flatMap((targetId) =>
        sourceSettings.map((s: any) => ({
          organization_id: orgId,
          location_id: targetId,
          product_id: s.product_id,
          is_tracked: true,
          par_level: includeLevels ? s.par_level : null,
          reorder_level: includeLevels ? s.reorder_level : null,
        }))
      );

      // 3. Batch upsert (Supabase handles up to ~1000 rows per call)
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('location_product_settings')
          .upsert(batch as any[], { onConflict: 'location_id,product_id' });
        if (error) throw error;
      }

      return { synced: sourceSettings.length, targets: targetLocationIds.length };
    },
    onSuccess: ({ synced, targets }) => {
      queryClient.invalidateQueries({ queryKey: ['location-product-settings'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      if (synced > 0) {
        toast.success(`Synced ${synced} tracked products to ${targets} location${targets > 1 ? 's' : ''}`);
      }
    },
    onError: (error) => toast.error('Sync failed: ' + error.message),
  });
}
