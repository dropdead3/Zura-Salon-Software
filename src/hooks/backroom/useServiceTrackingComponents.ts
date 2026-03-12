/**
 * useServiceTrackingComponents — CRUD for mapping products to services for backroom tracking.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ServiceTrackingComponent {
  id: string;
  organization_id: string;
  service_id: string;
  product_id: string;
  component_role: string;
  contributes_to_inventory: boolean;
  contributes_to_cost: boolean;
  contributes_to_billing: boolean;
  contributes_to_waste: boolean;
  contributes_to_forecast: boolean;
  estimated_quantity: number | null;
  unit: string;
  created_at: string;
  updated_at: string;
}

export function useServiceTrackingComponents(serviceId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-tracking-components', orgId, serviceId],
    queryFn: async (): Promise<ServiceTrackingComponent[]> => {
      let query = supabase
        .from('service_tracking_components')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at');

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ServiceTrackingComponent[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertTrackingComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      service_id: string;
      product_id: string;
      component_role?: string;
      contributes_to_inventory?: boolean;
      contributes_to_cost?: boolean;
      contributes_to_billing?: boolean;
      contributes_to_waste?: boolean;
      contributes_to_forecast?: boolean;
      estimated_quantity?: number;
      unit?: string;
    }) => {
      const { data, error } = await supabase
        .from('service_tracking_components')
        .upsert(
          {
            organization_id: params.organization_id,
            service_id: params.service_id,
            product_id: params.product_id,
            component_role: params.component_role || 'required',
            contributes_to_inventory: params.contributes_to_inventory ?? true,
            contributes_to_cost: params.contributes_to_cost ?? true,
            contributes_to_billing: params.contributes_to_billing ?? false,
            contributes_to_waste: params.contributes_to_waste ?? true,
            contributes_to_forecast: params.contributes_to_forecast ?? true,
            estimated_quantity: params.estimated_quantity,
            unit: params.unit || 'g',
          },
          { onConflict: 'organization_id,service_id,product_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ServiceTrackingComponent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-tracking-components'] });
      toast.success('Component saved');
    },
    onError: (error) => {
      toast.error('Failed to save component: ' + error.message);
    },
  });
}

export function useDeleteTrackingComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_tracking_components')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-tracking-components'] });
      toast.success('Component removed');
    },
    onError: (error) => {
      toast.error('Failed to remove component: ' + error.message);
    },
  });
}
