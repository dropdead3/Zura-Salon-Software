/**
 * useBackroomAIInsights — Cached AI insights for backroom analytics.
 * Follows the same pattern as useAIInsights with 2hr stale, 1min cooldown.
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { toast } from 'sonner';

export interface BackroomAIInsight {
  category: 'waste_analysis' | 'usage_efficiency' | 'staff_coaching' |
            'cost_trend' | 'ghost_loss' | 'compliance';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  staffMentions?: string[] | null;
  estimatedImpact?: string | null;
  suggestedAction?: string | null;
}

export interface BackroomAIInsightsData {
  summaryLine: string;
  overallSentiment: 'positive' | 'neutral' | 'concerning';
  insights: BackroomAIInsight[];
}

const STALE_TIME = 2 * 60 * 60 * 1000; // 2 hours
const COOLDOWN_MS = 60 * 1000;

export function useBackroomAIInsights(locationId?: string) {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const orgId = profile?.organization_id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-backroom-insights', orgId, locationId],
    queryFn: async () => {
      if (!orgId) return null;

      let query = supabase
        .from('ai_business_insights' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('generated_at', { ascending: false })
        .limit(1);

      // Use a convention to distinguish backroom insights
      // We filter by location_id pattern or a dedicated field
      if (locationId) {
        query = query.eq('location_id', `backroom:${locationId}`);
      } else {
        query = query.eq('location_id', 'backroom:all');
      }

      const { data, error } = await query;
      if (error) throw error;

      const row = (data as any)?.[0];
      return row || null;
    },
    enabled: !!user && !!orgId,
    staleTime: STALE_TIME,
  });

  const isStale = !data || new Date(data.expires_at) <= new Date();

  const refresh = useCallback(async (force = false) => {
    if (!user || !orgId) return;

    const now = Date.now();
    if (!force && now - lastRefreshTime < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastRefreshTime)) / 1000);
      toast.info(`Please wait ${remainingSec}s before refreshing again`);
      return;
    }

    setIsRefreshing(true);
    setLastRefreshTime(now);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-backroom-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            forceRefresh: true,
            locationId: locationId || null,
          }),
        }
      );

      if (response.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
        return;
      }
      if (response.status === 402) {
        toast.error('AI credits exhausted. Please contact support.');
        return;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate insights');
      }

      queryClient.invalidateQueries({ queryKey: ['ai-backroom-insights', orgId, locationId] });
      toast.success('Backroom insights refreshed');
    } catch (err) {
      console.error('Failed to refresh backroom insights:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh insights');
    } finally {
      setIsRefreshing(false);
    }
  }, [user, orgId, locationId, lastRefreshTime, queryClient]);

  const cooldownRemaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastRefreshTime));

  return {
    data: data?.insights as BackroomAIInsightsData | undefined,
    generatedAt: data?.generated_at,
    expiresAt: data?.expires_at,
    isLoading,
    isRefreshing,
    isStale,
    error,
    refresh,
    cooldownRemaining,
  };
}
