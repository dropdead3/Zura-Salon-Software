import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsEditorPreview } from './useIsEditorPreview';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';

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
  const isPreview = useIsEditorPreview();
  const mode: 'live' | 'draft' = isPreview ? 'draft' : 'live';

  return useQuery({
    queryKey: ['site-settings', orgId, 'announcement_bar', mode],
    queryFn: async () => {
      const value = await fetchSiteSetting<AnnouncementBarSettings>(
        orgId!,
        'announcement_bar',
        mode,
      );
      return value ?? DEFAULT_SETTINGS;
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
      await writeSiteSettingDraft(orgId, 'announcement_bar', value, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'announcement_bar'] });
    },
  });
}
