/**
 * useActiveDashboardRole
 *
 * Persists the user's chosen "which role's dashboard am I viewing right now"
 * preference inside `user_preferences.dashboard_layout.activeRole`.
 *
 * IMPORTANT: This is NOT impersonation (View As). It's a personal pivot for
 * users who legitimately hold multiple roles whose dashboards resolve to
 * different templates. It does not trigger impersonation_logs writes and
 * does not toast — silent, expected behavior.
 *
 * Validation: if the persisted role is no longer held by the user (role
 * removed by an owner), it's ignored and the resolver falls through to
 * `pickPrimaryRoleKey`.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from './useEffectiveUser';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ActiveRolePref {
  activeRole: AppRole | null;
}

export function useActiveDashboardRole() {
  const { user } = useAuth();
  const userId = user?.id;
  const heldRoles = useEffectiveRoles();
  const queryClient = useQueryClient();

  const { data: stored } = useQuery({
    queryKey: ['active-dashboard-role', userId],
    queryFn: async (): Promise<ActiveRolePref> => {
      if (!userId) return { activeRole: null };
      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      const layout = (data?.dashboard_layout as Record<string, unknown> | null) || null;
      const value = (layout?.activeRole as AppRole | undefined) ?? null;
      return { activeRole: value };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const validatedActiveRole: AppRole | null = useMemo(() => {
    const candidate = stored?.activeRole ?? null;
    if (!candidate) return null;
    if (!heldRoles.includes(candidate)) return null;
    return candidate;
  }, [stored?.activeRole, heldRoles]);

  const setActiveRole = useMutation({
    mutationFn: async (role: AppRole | null) => {
      if (!userId) throw new Error('Not authenticated');
      // Read-then-update pattern (mem://tech-decisions/site-settings-persistence-standard
      // applies in spirit: never blind-overwrite the JSON blob).
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id, dashboard_layout')
        .eq('user_id', userId)
        .maybeSingle();

      const currentLayout = (existing?.dashboard_layout as Record<string, unknown> | null) || {};
      const nextLayout = { ...currentLayout, activeRole: role };

      if (existing?.id) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ dashboard_layout: nextLayout as any })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert([{ user_id: userId, dashboard_layout: nextLayout as any }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-dashboard-role', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-preferences', userId] });
      // Force layout resolver to re-run
      queryClient.invalidateQueries({ queryKey: ['dashboard-role-layout'] });
    },
  });

  const setRole = useCallback(
    (role: AppRole | null) => setActiveRole.mutate(role),
    [setActiveRole],
  );

  return {
    activeRole: validatedActiveRole,
    setActiveRole: setRole,
    isPending: setActiveRole.isPending,
  };
}
