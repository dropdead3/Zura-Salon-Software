import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

export interface AnnouncementBarSettings {
  enabled: boolean;
  message_prefix: string;
  message_highlight: string;
  message_suffix: string;
  cta_text: string;
  cta_url: string;
  open_in_new_tab: boolean;
  bg_color?: string;
}

const DEFAULT_SETTINGS: AnnouncementBarSettings = {
  enabled: true,
  message_prefix: 'Are you a salon',
  message_highlight: 'professional',
  message_suffix: 'looking for our extensions?',
  cta_text: 'Shop Our Extensions Here',
  cta_url: '#',
  open_in_new_tab: true,
};

export function useAnnouncementBarSettings(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);

  return useQuery({
    queryKey: ['site-settings', orgId, 'announcement_bar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'announcement_bar')
        .eq('organization_id', orgId!)
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return DEFAULT_SETTINGS;
      
      return data.value as unknown as AnnouncementBarSettings;
    },
    enabled: !!orgId,
  });
}

export function useUpdateAnnouncementBarSettings(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async (value: AnnouncementBarSettings) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to update first
      const { data: existingData } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', 'announcement_bar')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('site_settings')
          .update({ 
            value: value as never,
            updated_by: user?.id 
          })
          .eq('id', 'announcement_bar')
          .eq('organization_id', orgId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({ 
            id: 'announcement_bar',
            organization_id: orgId,
            value: value as never,
            updated_by: user?.id 
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'announcement_bar'] });
    },
  });
}
