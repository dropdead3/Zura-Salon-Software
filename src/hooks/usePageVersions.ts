import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PageConfig, WebsitePagesConfig } from './useWebsitePages';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface PageVersion {
  id: string;
  page_id: string;
  organization_id: string;
  version_number: number;
  snapshot: PageConfig;
  status: string;
  saved_by: string | null;
  saved_at: string;
  change_summary: string | null;
}

export function usePageVersions(pageId: string | undefined, orgId: string | undefined) {
  return useQuery({
    queryKey: ['page-versions', pageId, orgId],
    queryFn: async () => {
      if (!pageId || !orgId) return [];
      const { data, error } = await supabase
        .from('website_page_versions')
        .select('*')
        .eq('page_id', pageId)
        .eq('organization_id', orgId)
        .order('version_number', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as PageVersion[];
    },
    enabled: !!pageId && !!orgId,
  });
}

export function useSavePageVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ page, organizationId, changeSummary }: {
      page: PageConfig;
      organizationId: string;
      changeSummary?: string;
    }) => {
      // Get next version number
      const { data: existing } = await supabase
        .from('website_page_versions')
        .select('version_number')
        .eq('page_id', page.id)
        .eq('organization_id', organizationId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = ((existing?.[0] as any)?.version_number ?? 0) + 1;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('website_page_versions')
        .insert({
          page_id: page.id,
          organization_id: organizationId,
          version_number: nextVersion,
          snapshot: page as never,
          status: page.enabled ? 'published' : 'draft',
          saved_by: user?.id,
          change_summary: changeSummary,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
    },
  });
}

/**
 * Non-destructive restore for a single page:
 * 1. Loads the snapshot of the requested version
 * 2. Replaces that page in the live website_pages site_settings row
 * 3. Inserts a new website_page_versions row marked with restored_from_version_id
 *
 * Newer versions are NOT deleted — restore is itself versioned.
 */
export function useRestorePageVersion() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ versionId }: { versionId: string }) => {
      if (!orgId) throw new Error('No organization context');

      // 1. Load the snapshot
      const { data: version, error: vErr } = await supabase
        .from('website_page_versions')
        .select('*')
        .eq('id', versionId)
        .eq('organization_id', orgId)
        .single();
      if (vErr) throw vErr;

      const restoredPage = version.snapshot as unknown as PageConfig;

      // 2. Read current website_pages config
      const { data: settingRow, error: sErr } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'website_pages')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (sErr) throw sErr;

      const currentConfig = (settingRow?.value as unknown as WebsitePagesConfig | null) ?? { pages: [] };
      const nextPages = currentConfig.pages.some(p => p.id === restoredPage.id)
        ? currentConfig.pages.map(p => (p.id === restoredPage.id ? restoredPage : p))
        : [...currentConfig.pages, restoredPage];
      const nextConfig: WebsitePagesConfig = { pages: nextPages };

      // 3. Write back live config (read-then-update/insert)
      const { data: { user } } = await supabase.auth.getUser();
      if (settingRow) {
        const { error: uErr } = await supabase
          .from('site_settings')
          .update({ value: nextConfig as never, updated_by: user?.id })
          .eq('id', 'website_pages')
          .eq('organization_id', orgId);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase
          .from('site_settings')
          .insert({
            id: 'website_pages',
            organization_id: orgId,
            value: nextConfig as never,
            updated_by: user?.id,
          });
        if (iErr) throw iErr;
      }

      // 4. Snapshot the restore as a new version row
      const { data: existingVersions } = await supabase
        .from('website_page_versions')
        .select('version_number')
        .eq('page_id', restoredPage.id)
        .eq('organization_id', orgId)
        .order('version_number', { ascending: false })
        .limit(1);
      const nextVersionNumber = ((existingVersions?.[0] as { version_number?: number })?.version_number ?? 0) + 1;

      const { error: insErr } = await supabase
        .from('website_page_versions')
        .insert({
          page_id: restoredPage.id,
          organization_id: orgId,
          version_number: nextVersionNumber,
          snapshot: restoredPage as never,
          status: restoredPage.enabled ? 'published' : 'draft',
          saved_by: user?.id,
          change_summary: `Restored from v${version.version_number}`,
          restored_from_version_id: version.id,
        });
      if (insErr) throw insErr;

      return restoredPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
}
