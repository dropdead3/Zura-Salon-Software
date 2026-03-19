/**
 * useRetailProductSettings — Per-location retail product tracking settings.
 * Mirrors the backroom's useLocationProductSettings but for retail product types.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface RetailProductSetting {
  id: string;
  product_id: string;
  location_id: string;
  is_tracked: boolean;
  par_level: number | null;
  reorder_level: number | null;
  display_position: number;
}

function useRetailOrgId(): string | undefined {
  const { effectiveOrganization } = useOrganizationContext();
  return effectiveOrganization?.id;
}

export function useRetailProductSettings(locationId: string | undefined) {
  const orgId = useRetailOrgId();

  return useQuery({
    queryKey: ['retail-product-settings', orgId, locationId],
    queryFn: async (): Promise<RetailProductSetting[]> => {
      const { data, error } = await supabase
        .from('retail_product_settings')
        .select('id, product_id, location_id, is_tracked, par_level, reorder_level, display_position')
        .eq('organization_id', orgId!)
        .eq('location_id', locationId!);
      if (error) throw error;
      return (data || []) as RetailProductSetting[];
    },
    enabled: !!orgId && !!locationId,
    staleTime: 30_000,
  });
}

/** Build a Map<product_id, RetailProductSetting> for fast lookup */
export function useRetailProductSettingsMap(locationId: string | undefined) {
  const query = useRetailProductSettings(locationId);
  const map = new Map<string, RetailProductSetting>();
  (query.data || []).forEach((s) => map.set(s.product_id, s));
  return { ...query, settingsMap: map };
}

/** Upsert par/reorder level for a single retail product at a location */
export function useUpsertRetailProductSetting() {
  const orgId = useRetailOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      productId,
      par_level,
      reorder_level,
    }: {
      locationId: string;
      productId: string;
      par_level?: number | null;
      reorder_level?: number | null;
    }) => {
      const { error } = await supabase
        .from('retail_product_settings')
        .upsert(
          {
            organization_id: orgId!,
            location_id: locationId,
            product_id: productId,
            par_level: par_level ?? null,
            reorder_level: reorder_level ?? null,
          } as any,
          { onConflict: 'organization_id,location_id,product_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-product-settings'] });
      toast.success('Retail inventory setting updated');
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });
}
