import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface Service {
  id: string;
  external_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number | null;
  price: number | null;
  cost: number | null;
  is_active: boolean | null;
  bookable_online: boolean | null;
  requires_qualification: boolean | null;
  allow_same_day_booking: boolean | null;
  lead_time_days: number | null;
  location_id: string | null;
  organization_id: string | null;
  import_source: string | null;
  imported_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  finishing_time_minutes: number;
  content_creation_time_minutes: number;
  processing_time_minutes: number;
  requires_new_client_consultation: boolean;
  requires_deposit: boolean;
  deposit_type: string;
  deposit_amount: number | null;
  deposit_amount_flat: number | null;
  container_types: ('bowl' | 'bottle')[];
  is_chemical_service: boolean;
  is_backroom_tracked: boolean;
  require_card_on_file: boolean;
}

/**
 * Main services hook using the normalized services table
 * This replaces phorest_services queries
 */
export function useServicesData(locationId?: string, organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId || effectiveOrganization?.id;

  return useQuery({
    queryKey: ['services-data', locationId, orgId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('category')
        .order('name');

      // Apply organization filter
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Service[];
    },
  });
}

/**
 * Get services grouped by category
 */
export function useServicesByCategory(locationId?: string) {
  const { data: services, ...rest } = useServicesData(locationId);

  const grouped = services?.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return { data: grouped, services, ...rest };
}

/**
 * Get all services across all locations
 */
export function useAllServicesData() {
  return useQuery({
    queryKey: ['services-data-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data as unknown as Service[];
    },
  });
}

/**
 * Get all services grouped by category (deduped by name)
 */
export function useAllServicesByCategory() {
  const { data: services, ...rest } = useAllServicesData();

  const grouped = services?.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    
    // Check if we already have this service name in this category
    const existingService = acc[category].find(s => s.name === service.name);
    if (!existingService) {
      acc[category].push(service);
    }
    
    return acc;
  }, {} as Record<string, Service[]>);

  return { data: grouped, services, ...rest };
}

/**
 * Get a single service by ID
 */
export function useService(serviceId: string | undefined) {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (error) throw error;
      return data as unknown as Service;
    },
    enabled: !!serviceId,
  });
}

/**
 * Create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (service: Partial<Service>) => {
      const { data, error } = await supabase
        .from('services')
        .insert({
          name: service.name!,
          description: service.description,
          category: service.category,
          duration_minutes: service.duration_minutes,
          price: service.price,
          cost: service.cost,
          is_active: service.is_active ?? true,
          requires_qualification: service.requires_qualification ?? false,
          allow_same_day_booking: service.allow_same_day_booking ?? true,
          lead_time_days: service.lead_time_days ?? 0,
          finishing_time_minutes: service.finishing_time_minutes ?? 0,
          content_creation_time_minutes: service.content_creation_time_minutes ?? 0,
          processing_time_minutes: service.processing_time_minutes ?? 0,
          requires_new_client_consultation: service.requires_new_client_consultation ?? false,
          is_chemical_service: service.is_chemical_service ?? false,
          is_backroom_tracked: service.is_chemical_service ? true : (service.is_backroom_tracked ?? false),
          container_types: service.is_chemical_service ? (service.container_types?.length ? service.container_types : ['bowl']) : [],
          location_id: service.location_id,
          organization_id: service.organization_id || effectiveOrganization?.id || null,
          import_source: 'manual',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      toast.success('Service created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create service: ' + error.message);
    },
  });
}

/**
 * Update a service
 */
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      queryClient.invalidateQueries({ queryKey: ['service', data.id] });
      queryClient.invalidateQueries({ queryKey: ['service-audit-log'] });
      toast.success('Service updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update service: ' + error.message);
    },
  });
}

/**
 * Delete/deactivate a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', serviceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      toast.success('Service deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete service: ' + error.message);
    },
  });
}

/**
 * Get which locations offer a specific service (by name)
 */
export function useServiceLocations(serviceName: string) {
  return useQuery({
    queryKey: ['service-locations', serviceName],
    queryFn: async () => {
      const { data: services, error } = await supabase
        .from('services')
        .select('location_id')
        .eq('is_active', true)
        .eq('name', serviceName);
      
      if (error) throw error;
      
      // Get unique location IDs
      const locationIds = [...new Set(services?.map(s => s.location_id).filter(Boolean) || [])];
      
      if (locationIds.length === 0) return [];
      
      // Get location details
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds);
      
      return locations || [];
    },
    enabled: !!serviceName,
  });
}

/**
 * Get service categories
 */
export function useServiceCategories(locationId?: string) {
  return useQuery({
    queryKey: ['service-categories', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('category')
        .eq('is_active', true)
        .eq('is_archived', false)
        .not('category', 'is', null);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Get unique categories
      const categories = [...new Set(data?.map(s => s.category).filter(Boolean) || [])];
      return categories.sort();
    },
  });
}

/**
 * Fetch archived services
 */
export function useArchivedServices(organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId || effectiveOrganization?.id;

  return useQuery({
    queryKey: ['services-archived', orgId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Service[];
    },
  });
}

/**
 * Archive a service (soft-archive, not delete)
 */
export function useArchiveService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('services')
        .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      queryClient.invalidateQueries({ queryKey: ['services-archived'] });
      queryClient.invalidateQueries({ queryKey: ['service-audit-log'] });
      toast.success('Service archived');
    },
    onError: (error: Error) => {
      toast.error('Failed to archive service: ' + error.message);
    },
  });
}

/**
 * Restore an archived service
 */
export function useRestoreService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('services')
        .update({ is_archived: false, archived_at: null } as any)
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      queryClient.invalidateQueries({ queryKey: ['services-archived'] });
      queryClient.invalidateQueries({ queryKey: ['service-audit-log'] });
      toast.success('Service restored');
    },
    onError: (error: Error) => {
      toast.error('Failed to restore service: ' + error.message);
    },
  });
}

/**
 * Permanently delete a service (only for primary owner)
 */
export function usePermanentlyDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      queryClient.invalidateQueries({ queryKey: ['services-archived'] });
      toast.success('Service permanently deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete service: ' + error.message);
    },
  });
}
