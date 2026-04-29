import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type SiteVersionSurface = 'theme' | 'footer' | 'announcement_bar' | 'navigation';

/** Maps a versioned site surface to the site_settings.id key that stores its current state. */
export const SURFACE_TO_SETTING_KEY: Record<Exclude<SiteVersionSurface, 'navigation'>, string> = {
  theme: 'website_theme',
  footer: 'website_footer',
  announcement_bar: 'announcement_bar',
};

export const SURFACE_LABELS: Record<SiteVersionSurface, string> = {
  theme: 'Theme',
  footer: 'Footer',
  announcement_bar: 'Announcement Bar',
  navigation: 'Navigation',
};

export interface SiteVersion {
  id: string;
  organization_id: string;
  surface: SiteVersionSurface;
  version_number: number;
  snapshot: unknown;
  status: string;
  saved_by: string | null;
  saved_at: string;
  change_summary: string | null;
  restored_from_version_id: string | null;
}

export function useSiteVersions(surface: SiteVersionSurface | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['site-versions', orgId, surface],
    queryFn: async () => {
      if (!orgId || !surface) return [];
      const { data, error } = await supabase
        .from('website_site_versions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('surface', surface)
        .order('version_number', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as SiteVersion[];
    },
    enabled: !!orgId && !!surface,
  });
}

/**
 * Snapshot a site-level surface's current value into website_site_versions.
 * For navigation, the caller passes a pre-built snapshot (menus payload).
 */
export function useSaveSiteVersion() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({
      surface,
      snapshot,
      changeSummary,
      restoredFromVersionId,
    }: {
      surface: SiteVersionSurface;
      snapshot: unknown;
      changeSummary?: string;
      restoredFromVersionId?: string;
    }) => {
      if (!orgId) throw new Error('No organization context');
      if (snapshot === null || snapshot === undefined) {
        throw new Error('Cannot snapshot empty surface');
      }

      const { data: existing } = await supabase
        .from('website_site_versions')
        .select('version_number')
        .eq('organization_id', orgId)
        .eq('surface', surface)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = ((existing?.[0] as { version_number?: number })?.version_number ?? 0) + 1;
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('website_site_versions')
        .insert({
          organization_id: orgId,
          surface,
          version_number: nextVersion,
          snapshot: snapshot as never,
          saved_by: user?.id,
          change_summary: changeSummary ?? null,
          restored_from_version_id: restoredFromVersionId ?? null,
        });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['site-versions', orgId, vars.surface] });
    },
  });
}

/**
 * Non-destructive restore: writes the snapshot back to the live site_settings row,
 * then logs a new version row marked with restored_from_version_id.
 * No previous versions are deleted.
 */
export function useRestoreSiteVersion() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const saveVersion = useSaveSiteVersion();

  return useMutation({
    mutationFn: async ({ versionId }: { versionId: string }) => {
      if (!orgId) throw new Error('No organization context');

      // 1. Load the version snapshot
      const { data: version, error: vErr } = await supabase
        .from('website_site_versions')
        .select('*')
        .eq('id', versionId)
        .eq('organization_id', orgId)
        .single();
      if (vErr) throw vErr;

      const surface = version.surface as SiteVersionSurface;

      // 2. Write back to live site_settings (only for keyed surfaces).
      //    Navigation snapshots are advisory; they are not currently
      //    auto-applied because menus live in their own tables.
      if (surface !== 'navigation') {
        const settingKey = SURFACE_TO_SETTING_KEY[surface];
        const { data: { user } } = await supabase.auth.getUser();

        const { data: existing } = await supabase
          .from('site_settings')
          .select('id')
          .eq('id', settingKey)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (existing) {
          const { error: uErr } = await supabase
            .from('site_settings')
            .update({ value: version.snapshot as never, updated_by: user?.id })
            .eq('id', settingKey)
            .eq('organization_id', orgId);
          if (uErr) throw uErr;
        } else {
          const { error: iErr } = await supabase
            .from('site_settings')
            .insert({
              id: settingKey,
              organization_id: orgId,
              value: version.snapshot as never,
              updated_by: user?.id,
            });
          if (iErr) throw iErr;
        }
      }

      // 3. Log this restore as a new version row
      await saveVersion.mutateAsync({
        surface,
        snapshot: version.snapshot,
        changeSummary: `Restored from v${version.version_number}`,
        restoredFromVersionId: version.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-versions', orgId] });
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId] });
    },
  });
}
