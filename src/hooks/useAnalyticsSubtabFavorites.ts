import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export interface SubtabFavorite {
  tab: string;
  subtab: string;
  label: string;
}

export const ANALYTICS_TAB_LABELS: Record<string, string> = {
  leadership: 'Executive Summary',
  sales: 'Sales',
  operations: 'Operations',
  marketing: 'Marketing',
  campaigns: 'Campaigns',
  program: 'Program',
  reports: 'Reports',
  rent: 'Rent',
};

export interface GroupedFavorite {
  tab: string;
  tabLabel: string;
  hasTabFavorite: boolean;
  subtabs: { subtab: string; label: string }[];
}

const MAX_FAVORITES = 6;

export function useAnalyticsSubtabFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['analytics-subtab-favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subtab favorites:', error);
      }

      const layout = data?.dashboard_layout as Record<string, unknown> | null;
      return (layout?.analyticsSubtabFavorites as SubtabFavorite[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (newFavorites: SubtabFavorite[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id, dashboard_layout')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentLayout = (existing?.dashboard_layout as Record<string, unknown>) || {};
      const updatedLayout = {
        ...currentLayout,
        analyticsSubtabFavorites: newFavorites,
      } as unknown as Record<string, unknown>;

      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ dashboard_layout: updatedLayout as any })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, dashboard_layout: updatedLayout as any } as any);
        if (error) throw error;
      }
    },
    onMutate: async (newFavorites) => {
      await queryClient.cancelQueries({ queryKey: ['analytics-subtab-favorites', user?.id] });
      const previous = queryClient.getQueryData(['analytics-subtab-favorites', user?.id]);
      queryClient.setQueryData(['analytics-subtab-favorites', user?.id], newFavorites);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['analytics-subtab-favorites', user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-subtab-favorites', user?.id] });
    },
  });

  const isFavorited = (tab: string, subtab: string) =>
    favorites.some(f => f.tab === tab && f.subtab === subtab);

  const toggleFavorite = (tab: string, subtab: string, label: string) => {
    const existing = favorites.find(f => f.tab === tab && f.subtab === subtab);
    if (existing) {
      mutation.mutate(favorites.filter(f => !(f.tab === tab && f.subtab === subtab)));
    } else {
      if (favorites.length >= MAX_FAVORITES) return; // Enforce cap
      mutation.mutate([...favorites, { tab, subtab, label }]);
    }
  };

  const groupedFavorites = useMemo((): GroupedFavorite[] => {
    const TAB_ORDER = Object.keys(ANALYTICS_TAB_LABELS);
    const groups = new Map<string, GroupedFavorite>();

    favorites.forEach((fav) => {
      if (!groups.has(fav.tab)) {
        groups.set(fav.tab, {
          tab: fav.tab,
          tabLabel: ANALYTICS_TAB_LABELS[fav.tab] || fav.tab,
          hasTabFavorite: false,
          subtabs: [],
        });
      }
      const group = groups.get(fav.tab)!;
      if (fav.subtab === '') {
        group.hasTabFavorite = true;
        group.tabLabel = fav.label || group.tabLabel;
      } else {
        group.subtabs.push({ subtab: fav.subtab, label: fav.label });
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aIdx = TAB_ORDER.indexOf(a.tab);
      const bIdx = TAB_ORDER.indexOf(b.tab);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [favorites]);

  return {
    favorites,
    groupedFavorites,
    isFavorited,
    toggleFavorite,
    isAtLimit: favorites.length >= MAX_FAVORITES,
  };
}
