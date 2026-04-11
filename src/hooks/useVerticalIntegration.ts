/**
 * useVerticalIntegration — Queries supplier preferences,
 * product service performance, and composes recommendation data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupplierPreferences(orgId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-preferences', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_preferences')
        .select('*')
        .eq('organization_id', orgId!)
        .order('priority_rank', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useProductServicePerformance(
  orgId: string | undefined,
  filters?: { serviceName?: string; locationId?: string }
) {
  return useQuery({
    queryKey: ['product-service-performance', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('product_service_performance')
        .select('*, products(name, supplier_name)')
        .eq('organization_id', orgId!)
        .order('margin_pct', { ascending: false });

      if (filters?.serviceName) {
        query = query.eq('service_name', filters.serviceName);
      }
      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
