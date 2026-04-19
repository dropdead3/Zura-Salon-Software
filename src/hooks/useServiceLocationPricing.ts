import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ServiceLocationPrice {
  id: string;
  service_id: string;
  location_id: string;
  price: number;
  organization_id: string;
}

// Wave 12: org-scoped query keys + explicit org filter (defense-in-depth on
// top of RLS) so super-admin org switches don't share cache entries.
export function useServiceLocationPrices(serviceId: string | null, organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId ?? effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-location-prices', orgId, serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_location_prices')
        .select('*')
        .eq('service_id', serviceId!)
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as ServiceLocationPrice[];
    },
    enabled: !!serviceId && !!orgId,
  });
}

export function useUpsertServiceLocationPrices() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (rows: { service_id: string; location_id: string; price: number }[]) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization');

      const payload = rows.map(r => ({ ...r, organization_id: orgId }));

      const { error } = await supabase
        .from('service_location_prices')
        .upsert(payload, { onConflict: 'service_id,location_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      // Prefix-match invalidation so both org-scoped and any legacy keys refetch.
      queryClient.invalidateQueries({ queryKey: ['service-location-prices'] });
      toast.success('Location prices saved');
    },
    onError: (e) => toast.error('Failed to save location prices: ' + e.message),
  });
}

export function useDeleteServiceLocationPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, serviceId }: { id: string; serviceId: string }) => {
      const { error } = await supabase
        .from('service_location_prices')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return serviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-location-prices'] });
    },
    onError: (e) => toast.error('Failed to remove location price: ' + e.message),
  });
}
