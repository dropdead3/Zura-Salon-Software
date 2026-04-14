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
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: key,
          organization_id: orgId,
          value: value as never,
          updated_by: user?.id,
        }, { onConflict: 'id,organization_id' });

      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
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
