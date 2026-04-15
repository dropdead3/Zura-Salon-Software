import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useMemo } from 'react';

export interface ServiceLevelPrice {
  serviceName: string;
  price: number;
}

/**
 * Fetches all service_level_prices for the org, joined with service names.
 * Returns a map: levelId → ServiceLevelPrice[]
 */
export function useAllServiceLevelPrices() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const query = useQuery({
    queryKey: ['service-level-prices', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_level_prices')
        .select('stylist_level_id, price, service_id, services(name)')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as Array<{
        stylist_level_id: string;
        price: number;
        service_id: string;
        services: { name: string } | null;
      }>;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const pricesByLevel = useMemo(() => {
    const map = new Map<string, ServiceLevelPrice[]>();
    if (!query.data) return map;

    for (const row of query.data) {
      const entry: ServiceLevelPrice = {
        serviceName: row.services?.name ?? 'Unknown Service',
        price: Number(row.price),
      };
      const existing = map.get(row.stylist_level_id) ?? [];
      existing.push(entry);
      map.set(row.stylist_level_id, existing);
    }

    // Sort each level's services alphabetically
    for (const [, services] of map) {
      services.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
    }

    return map;
  }, [query.data]);

  return { pricesByLevel, isLoading: query.isLoading };
}
