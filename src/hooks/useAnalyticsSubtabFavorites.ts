import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubtabFavorite {
  tab: string;
  subtab: string;
  label: string;
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

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    isAtLimit: favorites.length >= MAX_FAVORITES,
  };
}
