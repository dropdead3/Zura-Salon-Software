import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

interface HomepageStylistsSettings {
  show_sample_cards: boolean;
}

type SiteSettingValue = HomepageStylistsSettings | Record<string, unknown>;

export function useSiteSettings<T extends SiteSettingValue = SiteSettingValue>(key: string, explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);

  return useQuery({
    queryKey: ['site-settings', orgId, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', key)
        .eq('organization_id', orgId!)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data?.value as T | null;
    },
    enabled: !!orgId,
  });
}

export function useUpdateSiteSetting<T extends SiteSettingValue = SiteSettingValue>(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: T }) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();

      // Check if a row already exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', key)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from('site_settings')
          .update({
            value: value as never,
            updated_by: user?.id,
          })
          .eq('id', key)
          .eq('organization_id', orgId);

        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await supabase
          .from('site_settings')
          .insert({
            id: key,
            organization_id: orgId,
            value: value as never,
            updated_by: user?.id,
          });

        if (error) throw error;
      }
    },
    onMutate: async ({ key, value }) => {
      // Optimistic update
      const queryKey = ['site-settings', orgId, key];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, value);
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.queryKey && context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_, __, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, key] });
    },
  });
}

// Typed hook specifically for homepage stylists settings
export function useHomepageStylistsSettings(explicitOrgId?: string) {
  return useSiteSettings<HomepageStylistsSettings>('homepage_stylists', explicitOrgId);
}

export function useUpdateHomepageStylistsSettings(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async (value: HomepageStylistsSettings) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          value: value as never,
          updated_by: user?.id 
        })
        .eq('id', 'homepage_stylists')
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'homepage_stylists'] });
    },
  });
}
