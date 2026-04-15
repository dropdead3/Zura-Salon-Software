import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeverRecommendation {
  id: string;
  organization_id: string;
  lever_type: string;
  title: string;
  summary: string;
  what_to_do: string;
  why_now: string[];
  estimated_monthly_impact: number | null;
  confidence: 'high' | 'medium' | 'low';
  is_primary: boolean;
  is_active: boolean;
  period_start: string;
  period_end: string;
  evidence: Record<string, unknown>;
  status: 'pending' | 'approved' | 'declined' | 'modified' | 'snoozed';
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  modified_action: string | null;
  created_at: string;
  expires_at: string;
}

export function useActiveRecommendation() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['lever-recommendation-active', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lever_recommendations')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_primary', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as LeverRecommendation | null;
    },
    enabled: !!orgId,
  });
}

export function useRecommendationHistory() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['lever-recommendations-history', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lever_recommendations')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as unknown as LeverRecommendation[];
    },
    enabled: !!orgId,
  });
}

export function useDecideOnRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: {
      id: string;
      status: 'approved' | 'declined' | 'modified' | 'snoozed';
      notes?: string;
      modifiedAction?: string;
    }) => {
      const { data, error } = await supabase
        .from('lever_recommendations')
        .update({
          status: params.status,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
          decision_notes: params.notes || null,
          modified_action: params.modifiedAction || null,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as LeverRecommendation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lever-recommendation-active', orgId] });
      queryClient.invalidateQueries({ queryKey: ['lever-recommendations-history', orgId] });
      const labels: Record<string, string> = {
        approved: 'Lever approved',
        declined: 'Lever declined',
        modified: 'Lever modified',
        snoozed: 'Lever snoozed for 7 days',
      };
      toast.success(labels[data.status] || 'Decision recorded');
    },
    onError: (error: Error) => {
      toast.error('Failed to record decision', { description: error.message });
    },
  });
}

export function useGenerateRecommendation() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('lever-engine', {
        body: { organization_id: orgId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lever-recommendation-active', orgId] });
      queryClient.invalidateQueries({ queryKey: ['lever-recommendations-history', orgId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to generate recommendation', { description: error.message });
    },
  });
}
