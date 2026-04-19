import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ServiceSeasonalAdjustment {
  id: string;
  service_id: string | null;
  name: string;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  start_date: string;
  end_date: string;
  location_id: string | null;
  is_active: boolean;
  organization_id: string;
}

export function useServiceSeasonalAdjustments(serviceId: string | null, organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId ?? effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-seasonal-adjustments', orgId, serviceId],
    queryFn: async () => {
      const query = supabase
        .from('service_seasonal_adjustments')
        .select('*')
        .eq('organization_id', orgId as string)
        .order('start_date', { ascending: false });

      // Get adjustments for this specific service OR global ones (service_id IS NULL)
      if (serviceId) {
        query.or(`service_id.eq.${serviceId},service_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ServiceSeasonalAdjustment[];
    },
    enabled: !!serviceId && !!orgId,
  });
}

export function useCreateSeasonalAdjustment() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (row: Omit<ServiceSeasonalAdjustment, 'id' | 'organization_id'>) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization');

      const { error } = await supabase
        .from('service_seasonal_adjustments')
        .insert({ ...row, organization_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seasonal-adjustments'] });
      toast.success('Seasonal adjustment created');
    },
    onError: (e) => toast.error('Failed to create adjustment: ' + e.message),
  });
}

export function useUpdateSeasonalAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceSeasonalAdjustment> & { id: string }) => {
      const { error } = await supabase
        .from('service_seasonal_adjustments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seasonal-adjustments'] });
      toast.success('Adjustment updated');
    },
    onError: (e) => toast.error('Failed to update adjustment: ' + e.message),
  });
}

export function useDeleteSeasonalAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_seasonal_adjustments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seasonal-adjustments'] });
      toast.success('Adjustment deleted');
    },
    onError: (e) => toast.error('Failed to delete adjustment: ' + e.message),
  });
}
