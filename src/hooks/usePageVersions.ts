import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PageConfig } from './useWebsitePages';

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

export function useRestorePageVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ versionId }: { versionId: string }) => {
      const { data, error } = await supabase
        .from('website_page_versions')
        .select('snapshot')
        .eq('id', versionId)
        .single();
      if (error) throw error;
      return data.snapshot as unknown as PageConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
    },
  });
}
