import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { toast } from 'sonner';

export interface InsightItem {
  category: 'revenue_pulse' | 'cash_flow' | 'capacity' | 'staffing' | 'client_health' | 'anomaly';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  estimatedImpact?: string | null;
  trendDirection?: 'improving' | 'declining' | 'stable' | null;
  comparisonContext?: string | null;
  actByDate?: string | null;
  effortLevel?: 'quick_win' | 'strategic' | null;
  staffMentions?: string[] | null;
}

export interface ActionItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FeatureSuggestion {
  suggestionKey: string;
  featureName: string;
  whyItHelps: string;
  howToStart: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SuggestedTask {
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueInDays: number | null;
}

export interface AIInsightsData {
  summaryLine: string;
  overallSentiment: 'positive' | 'neutral' | 'concerning';
  insights: InsightItem[];
  actionItems: ActionItem[];
  featureSuggestions?: FeatureSuggestion[];
  suggestedTasks?: SuggestedTask[];
}

export interface AIInsightsRow {
  id: string;
  organization_id: string;
  location_id: string | null;
  insights: AIInsightsData;
  generated_at: string;
  expires_at: string;
  created_at: string;
}

const STALE_TIME = 2 * 60 * 60 * 1000; // 2 hours
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown between refreshes

export function useAIInsights(locationId?: string) {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const orgId = profile?.organization_id;

  // Fetch cached insights from the database
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-business-insights', orgId, locationId],
    queryFn: async () => {
      if (!orgId) return null;

      let query = supabase
        .from('ai_business_insights' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const row = (data as any)?.[0] as AIInsightsRow | undefined;
      return row || null;
    },
    enabled: !!user && !!orgId,
    staleTime: STALE_TIME,
  });

  const isStale = !data || new Date(data.expires_at) <= new Date();

  const refresh = useCallback(async (force = false) => {
    if (!user || !orgId) return;

    // Cooldown check
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-business-insights`,
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

      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ['ai-business-insights', orgId, locationId] });
      toast.success('Insights refreshed');
    } catch (err) {
      console.error('Failed to refresh insights:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh insights');
    } finally {
      setIsRefreshing(false);
    }
  }, [user, orgId, locationId, lastRefreshTime, queryClient]);

  // Cooldown timer
  const cooldownRemaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastRefreshTime));

  return {
    data: data?.insights as AIInsightsData | undefined,
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
