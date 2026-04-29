import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalOrganizationContext, useOrganizationContext } from '@/contexts/OrganizationContext';
import { useContext } from 'react';
import { PublicOrgContext } from '@/contexts/PublicOrgContext';

export type LevelDisplayMode = 'numbered' | 'custom_name';

/**
 * Reads the `website_level_display_mode` from `organizations.settings` JSONB.
 * Works in both dashboard (OrganizationContext) and public site (PublicOrgContext).
 */
export function useWebsiteLevelDisplayMode() {
  const orgCtx = useOptionalOrganizationContext();
  const publicOrgCtx = useContext(PublicOrgContext);
  const orgId = orgCtx?.effectiveOrganization?.id || publicOrgCtx?.organization?.id;

  return useQuery({
    queryKey: ['website-level-display-mode', orgId],
    queryFn: async () => {
      if (!orgId) return 'numbered' as LevelDisplayMode;
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .maybeSingle();

      if (error) throw error;
      const settings = (data?.settings as Record<string, unknown>) ?? {};
      return (settings.website_level_display_mode as LevelDisplayMode) || 'numbered';
    },
    enabled: !!orgId,
  });
}

export function useUpdateWebsiteLevelDisplayMode() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: LevelDisplayMode) => {
      if (!orgId) throw new Error('No organization');

      const { data: current } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single();

      const existingSettings = (current?.settings as Record<string, unknown>) ?? {};

      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...existingSettings,
            website_level_display_mode: mode,
          } as never,
        })
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-level-display-mode', orgId] });
    },
  });
}
