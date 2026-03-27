/**
 * useSupplyIntelligence — Hook for fetching and refreshing Supply AI insights.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { toast } from 'sonner';

export interface SupplyInsightKPIs {
  annual_waste_cost: number;
  products_at_risk: number;
  margin_opportunity_per_service: number;
  usage_variance_pct: number;
}

export interface SupplyInsight {
  category: 'inventory' | 'waste' | 'margin' | 'usage' | 'price';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  estimated_annual_impact: number;
  product_id?: string;
  suggested_action: string;
}

export interface SupplyIntelligenceData {
  summary_line: string;
  overall_health: 'healthy' | 'attention_needed' | 'critical';
  kpis: SupplyInsightKPIs;
  insights: SupplyInsight[];
  generated_at: string;
}

const STALE_TIME = 5 * 60_000;

export function useSupplyIntelligence(locationId?: string | null) {
  const orgId = useBackroomOrgId();
  const cacheKey = locationId ? `supply:${locationId}` : 'supply:all';

  return useQuery({
    queryKey: ['supply-intelligence', orgId, locationId],
    queryFn: async (): Promise<SupplyIntelligenceData | null> => {
      const { data, error } = await supabase
        .from('ai_business_insights' as any)
        .select('insights, generated_at')
        .eq('organization_id', orgId!)
        .eq('location_id', cacheKey)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      const row = (data as any)?.[0];
      if (!row) return null;
      return { ...(row.insights as any), generated_at: row.generated_at } as SupplyIntelligenceData;
    },
    enabled: !!orgId,
    staleTime: STALE_TIME,
  });
}

export function useRefreshSupplyIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId }: { locationId?: string | null }) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supply-intelligence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ forceRefresh: true, locationId: locationId || null }),
        },
      );

      if (resp.status === 429) throw new Error('Rate limit exceeded. Please try again later.');
      if (resp.status === 402) throw new Error('AI credits exhausted. Please add credits.');
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate insights');
      }
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-intelligence'] });
      toast.success('Supply intelligence refreshed');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
