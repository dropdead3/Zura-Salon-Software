import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OpsHubFavorite {
  href: string;
  label: string;
  icon: string;
}

const MAX_FAVORITES = 8;

export function useOpsHubFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['ops-hub-favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching ops hub favorites:', error);
      }

      const layout = data?.dashboard_layout as Record<string, unknown> | null;
      const rawFavorites = (layout?.opsHubFavorites as OpsHubFavorite[]) || [];
      
      // Migrate stale /admin/strikes favorites to consolidated route
      const migrated = rawFavorites.map(fav => {
        if (fav.href.includes('/admin/strikes')) {
          return { ...fav, href: fav.href.replace('/admin/strikes', '/admin/incidents?tab=strikes'), label: 'Incidents & Accountability' };
        }
        return fav;
      });
      
      // Persist migration if any favorites changed
      if (migrated.some((f, i) => f.href !== rawFavorites[i]?.href)) {
        const currentLayout = (data?.dashboard_layout as Record<string, unknown>) || {};
        const updatedLayout = { ...currentLayout, opsHubFavorites: migrated };
        await supabase
          .from('user_preferences')
          .update({ dashboard_layout: updatedLayout as any })
          .eq('user_id', user!.id);
      }
      
      return migrated;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (newFavorites: OpsHubFavorite[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id, dashboard_layout')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentLayout = (existing?.dashboard_layout as Record<string, unknown>) || {};
      const updatedLayout = {
        ...currentLayout,
        opsHubFavorites: newFavorites,
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
      await queryClient.cancelQueries({ queryKey: ['ops-hub-favorites', user?.id] });
      const previous = queryClient.getQueryData(['ops-hub-favorites', user?.id]);
      queryClient.setQueryData(['ops-hub-favorites', user?.id], newFavorites);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['ops-hub-favorites', user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-hub-favorites', user?.id] });
    },
  });

  const isFavorited = (href: string) =>
    favorites.some(f => f.href === href);

  const toggleFavorite = (href: string, label: string, iconName: string) => {
    const existing = favorites.find(f => f.href === href);
    if (existing) {
      mutation.mutate(favorites.filter(f => f.href !== href));
    } else {
      if (favorites.length >= MAX_FAVORITES) return;
      mutation.mutate([...favorites, { href, label, icon: iconName }]);
    }
  };

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    isAtLimit: favorites.length >= MAX_FAVORITES,
  };
}
