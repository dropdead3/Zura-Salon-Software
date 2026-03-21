import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PromotionalService {
  id: string;
  organization_id: string;
  service_id: string;
  promotion_id: string | null;
  original_service_id: string | null;
  original_price: number | null;
  promotional_price: number | null;
  expires_at: string;
  auto_deactivate: boolean;
  created_at: string;
  deactivated_at: string | null;
  // Joined fields
  service?: {
    id: string;
    name: string;
    category: string;
    is_active: boolean;
  };
  original_service?: {
    id: string;
    name: string;
  };
}

export interface CreatePromotionalServiceInput {
  organizationId: string;
  originalServiceId: string;
  promotionalName: string;
  promotionalPrice: number;
  expiresAt: string;
  autoDeactivate: boolean;
  promotionId?: string;
}

export function usePromotionalServices(organizationId?: string) {
  return useQuery({
    queryKey: ['promotional-services', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('promotional_services' as any)
        .select(`
          *,
          service:service_id (id, name, category, is_active),
          original_service:original_service_id (id, name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PromotionalService[];
    },
    enabled: !!organizationId,
  });
}

export function useActivePromotionalServices(organizationId?: string) {
  return useQuery({
    queryKey: ['promotional-services', 'active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotional_services' as any)
        .select(`
          *,
          service:service_id (id, name, category, is_active),
          original_service:original_service_id (id, name)
        `)
        .eq('organization_id', organizationId)
        .is('deactivated_at', null)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as PromotionalService[];
    },
    enabled: !!organizationId,
  });
}

export function useCreatePromotionalService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePromotionalServiceInput) => {
      // First, get the original service details
      const { data: originalService, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', input.originalServiceId)
        .single();

      if (serviceError) throw serviceError;

      // Create a new service as the promotional version
      const { data: newService, error: newServiceError } = await supabase
        .from('services')
        .insert({
          organization_id: input.organizationId,
          name: input.promotionalName,
          description: `Promotional: ${originalService.description || ''}`,
          category: originalService.category,
          duration_minutes: originalService.duration_minutes,
          price: input.promotionalPrice,
          is_active: true,
          is_promotional: true,
        })
        .select()
        .single();

      if (newServiceError) throw newServiceError;

      // Create the promotional service record
      const { data, error } = await supabase
        .from('promotional_services' as any)
        .insert({
          organization_id: input.organizationId,
          service_id: newService.id,
          promotion_id: input.promotionId || null,
          original_service_id: input.originalServiceId,
          original_price: originalService.price,
          promotional_price: input.promotionalPrice,
          expires_at: input.expiresAt,
          auto_deactivate: input.autoDeactivate,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['promotional-services', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Promotional service created');
    },
    onError: (error) => {
      toast.error('Failed to create promotional service: ' + error.message);
    },
  });
}

export function useDeactivatePromotionalService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, serviceId, organizationId }: { id: string; serviceId: string; organizationId: string }) => {
      // Deactivate the service
      await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', serviceId);

      // Update the promotional_services record
      const { data, error } = await supabase
        .from('promotional_services' as any)
        .update({ deactivated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['promotional-services', result.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Promotional service deactivated');
    },
    onError: (error) => {
      toast.error('Failed to deactivate: ' + error.message);
    },
  });
}

export function useDeletePromotionalService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, serviceId, organizationId }: { id: string; serviceId: string; organizationId: string }) => {
      // Delete the promotional service record
      const { error: promoError } = await supabase
        .from('promotional_services' as any)
        .delete()
        .eq('id', id);

      if (promoError) throw promoError;

      // Delete the service itself
      const { error: serviceError } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (serviceError) throw serviceError;

      return { id, organizationId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['promotional-services', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Promotional service deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
}
