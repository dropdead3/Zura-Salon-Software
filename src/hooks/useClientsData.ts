import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface Client {
  id: string;
  external_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  is_vip: boolean | null;
  is_active: boolean | null;
  visit_count: number | null;
  total_spend: number | null;
  average_spend: number | null;
  last_visit_date: string | null;
  preferred_stylist_id: string | null;
  location_id: string | null;
  import_source: string | null;
  imported_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Computed
  name?: string;
  daysSinceVisit?: number | null;
  isAtRisk?: boolean;
  isNew?: boolean;
}

/**
 * Main clients hook using the normalized clients table
 * This replaces phorest_clients queries
 */
export function useClientsData(options?: {
  locationId?: string;
  stylistId?: string;
  includeInactive?: boolean;
  limit?: number;
  organizationId?: string;
}) {
  const { user, roles } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  
  // Determine if user can see all clients
  const canViewAllClients = roles.some(role => 
    ['admin', 'manager', 'super_admin', 'receptionist'].includes(role)
  );

  // Use passed org or effective org from context
  const orgId = options?.organizationId || effectiveOrganization?.id;

  return useQuery({
    queryKey: ['clients-data', options?.locationId, options?.stylistId, options?.includeInactive, user?.id, canViewAllClients, orgId],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*')
        .order('total_spend', { ascending: false });

      // Apply organization filter
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      // Filter by active status
      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      // Filter by location
      if (options?.locationId) {
        query = query.eq('location_id', options.locationId);
      }

      // Filter by stylist (either explicit or permission-based)
      if (options?.stylistId) {
        query = query.eq('preferred_stylist_id', options.stylistId);
      } else if (!canViewAllClients && user?.id) {
        query = query.eq('preferred_stylist_id', user.id);
      }

      // Apply limit if specified
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Process clients with computed fields
      const today = new Date();
      return (data || []).map(client => {
        const daysSinceVisit = client.last_visit_date 
          ? Math.floor((today.getTime() - new Date(client.last_visit_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        return {
          ...client,
          name: `${client.first_name} ${client.last_name}`.trim(),
          daysSinceVisit,
          isAtRisk: (client.visit_count || 0) >= 2 && daysSinceVisit !== null && daysSinceVisit >= 60,
          isNew: client.visit_count === 1,
        };
      }) as Client[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Search clients for booking/selection
 */
export function useClientSearch(searchQuery: string, limit = 50) {
  const { user, roles } = useAuth();
  
  const canViewAllClients = roles.some(role => 
    ['admin', 'manager', 'super_admin', 'receptionist'].includes(role)
  );

  return useQuery({
    queryKey: ['client-search', searchQuery, user?.id, canViewAllClients],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone, mobile, preferred_stylist_id, visit_count, total_spend, is_vip, location_id')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')
        .limit(limit);

      // Apply search filter
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      // Permission-based filtering for stylists
      if (!canViewAllClients && user?.id) {
        query = query.eq('preferred_stylist_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(c => ({
        ...c,
        name: `${c.first_name} ${c.last_name}`.trim(),
      }));
    },
    enabled: !!user?.id,
  });
}

/**
 * Get a single client by ID
 */
export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        name: `${data.first_name} ${data.last_name}`.trim(),
      } as Client;
    },
    enabled: !!clientId,
  });
}

/**
 * Create a new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<Client>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          first_name: client.first_name!,
          last_name: client.last_name!,
          email: client.email,
          phone: client.phone,
          mobile: client.mobile,
          notes: client.notes,
          is_vip: client.is_vip || false,
          preferred_stylist_id: client.preferred_stylist_id,
          location_id: client.location_id,
          import_source: 'manual',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-data'] });
      queryClient.invalidateQueries({ queryKey: ['client-search'] });
      toast.success('Client created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create client: ' + error.message);
    },
  });
}

/**
 * Update a client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients-data'] });
      queryClient.invalidateQueries({ queryKey: ['client-search'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.id] });
      toast.success('Client updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update client: ' + error.message);
    },
  });
}

/**
 * Client stats for dashboard
 */
/**
 * Search phorest_clients for the merge wizard.
 * Includes duplicates (no is_duplicate filter) so both profiles are findable.
 */
export function usePhorestClientSearch(searchQuery: string, limit = 20) {
  return useQuery({
    queryKey: ['phorest-client-search', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('v_all_clients' as any)
        .select('id, first_name, last_name, name, email, phone, visit_count, total_spend, last_visit, is_vip, preferred_stylist_id, is_duplicate, canonical_client_id, notes, birthday, address_line1, city, state, zip, location_id')
        .order('last_name')
        .order('first_name')
        .limit(limit);

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(c => ({
        ...c,
        name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        mobile: c.phone,
        last_visit_date: c.last_visit,
      }));
    },
    enabled: searchQuery.length > 0,
  });
}

export function useClientStats(locationId?: string) {
  const { user, roles } = useAuth();
  
  const canViewAllClients = roles.some(role => 
    ['admin', 'manager', 'super_admin', 'receptionist'].includes(role)
  );

  return useQuery({
    queryKey: ['client-stats', locationId, user?.id, canViewAllClients],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('id, visit_count, total_spend, last_visit_date, is_vip, is_active')
        .eq('is_active', true);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (!canViewAllClients && user?.id) {
        query = query.eq('preferred_stylist_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const clients = data || [];
      const today = new Date();
      
      let atRiskCount = 0;
      let newCount = 0;
      
      clients.forEach(c => {
        const daysSinceVisit = c.last_visit_date 
          ? Math.floor((today.getTime() - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        if ((c.visit_count || 0) >= 2 && daysSinceVisit !== null && daysSinceVisit >= 60) {
          atRiskCount++;
        }
        if (c.visit_count === 1) {
          newCount++;
        }
      });

      return {
        total: clients.length,
        vip: clients.filter(c => c.is_vip).length,
        atRisk: atRiskCount,
        newClients: newCount,
        totalRevenue: clients.reduce((sum, c) => sum + (Number(c.total_spend) || 0), 0),
      };
    },
    enabled: !!user?.id,
  });
}
