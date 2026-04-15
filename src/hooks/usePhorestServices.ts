import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PhorestService {
  id: string;
  phorest_service_id: string;
  phorest_branch_id: string;
  name: string;
  category: string | null;
  duration_minutes: number;
  price: number | null;
  requires_qualification: boolean;
  is_active: boolean;
  // Same-day booking restrictions
  allow_same_day_booking: boolean;
  lead_time_days: number;
  same_day_restriction_reason: string | null;
}

export function usePhorestServices(locationId?: string) {
  return useQuery({
    queryKey: ['phorest-services', locationId],
    queryFn: async () => {
      // First get the phorest_branch_id for this location if provided
      let phorestBranchId: string | null = null;
      
      if (locationId) {
        const { data: location } = await supabase
          .from('locations')
          .select('phorest_branch_id')
          .eq('id', locationId)
          .single();
        
        phorestBranchId = location?.phorest_branch_id || null;
      }

      let query = supabase
        .from('v_all_services')
        .select('*')
        .order('category')
        .order('name');
      
      // Filter by location if we have a valid location ID or phorest_branch_id
      if (phorestBranchId) {
        query = query.eq('phorest_branch_id', phorestBranchId);
      } else if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PhorestService[];
    },
    // Enable the query when we have a location selected
    enabled: !!locationId,
  });
}

export function useServicesByCategory(branchId?: string) {
  const { data: services, ...rest } = usePhorestServices(branchId);
  const { data: categoryColors } = useQuery({
    queryKey: ['service-category-colors-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_category_colors')
        .select('category_name, display_order')
        .order('display_order')
        .order('category_name');
      if (error) throw error;
      return data;
    },
  });

  const grouped = services?.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, PhorestService[]>);

  // Sort grouped keys by display_order, filtering to only configured categories
  if (grouped && categoryColors) {
    const configuredCategories = new Set(categoryColors.map(c => c.category_name));
    const orderMap = new Map(categoryColors.map(c => [c.category_name, c.display_order]));
    const sortedEntries = Object.entries(grouped)
      .filter(([cat]) => configuredCategories.has(cat) && !['Block', 'Break'].includes(cat))
      .sort(([a], [b]) => {
        const oa = orderMap.get(a) ?? 9999;
        const ob = orderMap.get(b) ?? 9999;
        return oa - ob || a.localeCompare(b);
      });
    const sorted = Object.fromEntries(sortedEntries);
    return { data: sorted, services, ...rest };
  }

  return { data: grouped, services, ...rest };
}

// Fetch ALL services across ALL locations (for service-first selection flow)
export function useAllServices() {
  return useQuery({
    queryKey: ['phorest-services-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_all_services')
        .select('*')
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data as PhorestService[];
    },
  });
}

export function useAllServicesByCategory() {
  const { data: services, ...rest } = useAllServices();
  const { data: categoryColors } = useQuery({
    queryKey: ['service-category-colors-order'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_category_colors')
        .select('category_name, display_order')
        .order('display_order')
        .order('category_name');
      if (error) throw error;
      return data;
    },
  });

  // Group by category, and for duplicate service names across locations,
  // keep unique services by name (we'll validate location compatibility later)
  const grouped = services?.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    
    // Check if we already have this service name in this category
    const existingService = acc[category].find(s => s.name === service.name);
    if (!existingService) {
      acc[category].push(service);
    }
    
    return acc;
  }, {} as Record<string, PhorestService[]>);

  // Sort grouped keys by display_order, filtering to only configured categories
  if (grouped && categoryColors) {
    const configuredCategories = new Set(categoryColors.map(c => c.category_name));
    const orderMap = new Map(categoryColors.map(c => [c.category_name, c.display_order]));
    const sortedEntries = Object.entries(grouped)
      .filter(([cat]) => configuredCategories.has(cat) && !['Block', 'Break'].includes(cat))
      .sort(([a], [b]) => {
        const oa = orderMap.get(a) ?? 9999;
        const ob = orderMap.get(b) ?? 9999;
        return oa - ob || a.localeCompare(b);
      });
    const sorted = Object.fromEntries(sortedEntries);
    return { data: sorted, services, ...rest };
  }

  return { data: grouped, services, ...rest };
}

// Get which locations offer a specific service (by name)
export function useServiceAvailability(serviceName: string) {
  return useQuery({
    queryKey: ['phorest-service-availability', serviceName],
    queryFn: async () => {
      const { data: services, error } = await supabase
        .from('v_all_services')
        .select('phorest_branch_id')
        .eq('name', serviceName);
      
      if (error) throw error;
      
      // Get unique branch IDs
      const branchIds = [...new Set(services?.map(s => s.phorest_branch_id) || [])];
      
      // Get locations for these branches
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, phorest_branch_id')
        .in('phorest_branch_id', branchIds);
      
      return locations || [];
    },
    enabled: !!serviceName,
  });
}
