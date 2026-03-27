/**
 * useColorBarAIInsights — Thin wrapper around AIInsightService.
 * Cached AI insights for color bar analytics with 2hr stale, 1min cooldown.
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { toast } from 'sonner';
import {
  fetchCachedInsights,
  refreshInsights,
  type ColorBarAIInsightsData,
} from '@/lib/color-bar/services/ai-insight-service';

const STALE_TIME = 2 * 60 * 60 * 1000; // 2 hours
const COOLDOWN_MS = 60 * 1000;

export type { ColorBarAIInsight, ColorBarAIInsightsData } from '@/lib/color-bar/services/ai-insight-service';

export function useColorBarAIInsights(locationId?: string) {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const orgId = profile?.organization_id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-color-bar-insights', orgId, locationId],
    queryFn: async () => {
      if (!orgId) return null;
      return fetchCachedInsights(orgId, locationId);
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
      await refreshInsights(locationId);
      queryClient.invalidateQueries({ queryKey: ['ai-color-bar-insights', orgId, locationId] });
      toast.success('Color Bar insights refreshed');
    } catch (err) {
      console.error('Failed to refresh color bar insights:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh insights');
    } finally {
      setIsRefreshing(false);
    }
  }, [user, orgId, locationId, lastRefreshTime, queryClient]);

  const cooldownRemaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastRefreshTime));

  return {
    data: data?.insights as ColorBarAIInsightsData | undefined,
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
