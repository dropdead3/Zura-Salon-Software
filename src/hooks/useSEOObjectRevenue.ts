import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch the latest 30d revenue snapshot for SEO objects in an organization.
 * Returns a map: seo_object_id → { total_revenue, transaction_count }
 */
export function useSEOObjectRevenue(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['seo-object-revenue', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_object_revenue' as any)
        .select('seo_object_id, total_revenue, transaction_count, period_end')
        .eq('organization_id', organizationId!)
        .order('computed_at', { ascending: false });

      if (error) throw error;

      // Deduplicate: latest per object
      const seen = new Set<string>();
      const result: Record<string, { totalRevenue: number; transactionCount: number }> = {};
      for (const row of (data || []) as any[]) {
        if (seen.has(row.seo_object_id)) continue;
        seen.add(row.seo_object_id);
        result[row.seo_object_id] = {
          totalRevenue: Number(row.total_revenue || 0),
          transactionCount: Number(row.transaction_count || 0),
        };
      }
      return result;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}
