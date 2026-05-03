/**
 * useFeedbackThemes — Lists the most recent AI theme snapshot + clusters for
 * the active organization, and exposes a mutation to trigger a new run.
 *
 * Operator-approved AI surface (Reputation Engine doctrine): nothing
 * auto-acted; admin clicks "Detect themes" → backend runs → operator reviews.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface FeedbackThemeCluster {
  id: string;
  snapshot_id: string;
  theme_label: string;
  category: string | null;
  severity: 'low' | 'medium' | 'high';
  response_count: number;
  share_of_negative: number | null;
  suggested_action: string | null;
  evidence_quote: string | null;
  sample_response_ids: string[];
  rank: number;
  status: 'open' | 'acknowledged' | 'dismissed';
  acknowledged_at: string | null;
}

export interface FeedbackThemeSnapshot {
  id: string;
  window_days: number;
  response_count: number;
  negative_count: number;
  created_at: string;
  model: string | null;
}

export function useLatestFeedbackThemeSnapshot() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['feedback-theme-snapshot', orgId],
    queryFn: async (): Promise<{
      snapshot: FeedbackThemeSnapshot | null;
      clusters: FeedbackThemeCluster[];
    }> => {
      const { data: snapshot } = await supabase
        .from('feedback_theme_snapshots')
        .select('id, window_days, response_count, negative_count, created_at, model')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!snapshot) return { snapshot: null, clusters: [] };

      const { data: clusters } = await supabase
        .from('feedback_theme_clusters')
        .select('*')
        .eq('snapshot_id', snapshot.id)
        .order('rank', { ascending: true });

      return {
        snapshot: snapshot as FeedbackThemeSnapshot,
        clusters: (clusters ?? []) as FeedbackThemeCluster[],
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useDetectFeedbackThemes() {
  const { effectiveOrganization } = useOrganizationContext();
  const qc = useQueryClient();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (windowDays: number = 90) => {
      if (!orgId) throw new Error('No organization selected');
      const { data, error } = await supabase.functions.invoke(
        'ai-feedback-theme-tagger',
        { body: { organizationId: orgId, windowDays } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-theme-snapshot', orgId] });
    },
  });
}

export function useUpdateThemeClusterStatus() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({
      clusterId,
      status,
    }: {
      clusterId: string;
      status: 'open' | 'acknowledged' | 'dismissed';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('feedback_theme_clusters')
        .update({
          status,
          acknowledged_at: status === 'open' ? null : new Date().toISOString(),
          acknowledged_by: status === 'open' ? null : user?.id ?? null,
        })
        .eq('id', clusterId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-theme-snapshot', orgId] });
    },
  });
}
