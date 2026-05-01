import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsDraftReader } from './useIsDraftReader';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';

interface HomepageStylistsSettings {
  show_sample_cards: boolean;
}

type SiteSettingValue = HomepageStylistsSettings | Record<string, unknown>;

// Reads route through the draft layer:
//   - Editor surface + preview iframe → coalesce(draft_value, value)
//   - Public visitor                  → value
export function useSiteSettings<T extends SiteSettingValue = SiteSettingValue>(key: string, explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const mode: 'live' | 'draft' = useIsDraftReader() ? 'draft' : 'live';

  return useQuery({
    queryKey: ['site-settings', orgId, key, mode],
    queryFn: async () => {
      return await fetchSiteSetting<T>(orgId!, key, mode);
    },
    enabled: !!orgId,
  });
}

// All editor mutations write to draft_value only. The live site is not
// affected until publishSiteSettingsDrafts() runs.
export function useUpdateSiteSetting<T extends SiteSettingValue = SiteSettingValue>(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: T }) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      await writeSiteSettingDraft(orgId, key, value, user?.id ?? null);
    },
    onMutate: async ({ key, value }) => {
      // Optimistic update against the DRAFT cache key (editor view).
      const queryKey = ['site-settings', orgId, key, 'draft'];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, value);
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.queryKey && context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_, __, { key }) => {
      // Invalidate every mode (draft + live) so any consumer re-fetches.
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
      await writeSiteSettingDraft(orgId, 'homepage_stylists', value, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'homepage_stylists'] });
    },
  });
}
