import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWebsiteMenus, usePublishMenu } from './useWebsiteMenus';
import { useWebsitePages } from './useWebsitePages';
import { useSavePageVersion, useRestorePageVersion } from './usePageVersions';
import { useSaveSiteVersion, useRestoreSiteVersion, type SiteVersionSurface } from './useSiteVersions';
import { useWebsiteThemeSettings } from './useWebsiteSettings';
import { useAnnouncementBarSettings } from './useAnnouncementBar';
import { useSiteSettings } from './useSiteSettings';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ChangeItem {
  id: string;
  category: 'navigation' | 'page' | 'site';
  type: 'added' | 'modified' | 'removed' | 'status_change';
  label: string;
  detail?: string;
}

export function useChangelogSummary() {
  const { data: menus } = useWebsiteMenus();
  const { data: pagesConfig } = useWebsitePages();
  const { data: theme } = useWebsiteThemeSettings();
  const { data: announcement } = useAnnouncementBarSettings();
  const { data: footer } = useSiteSettings('website_footer');

  // Real diff requires version snapshots — we surface a simple
  // "what will be published" summary based on what currently exists.
  const summary = useMemo(() => {
    const navChanges: ChangeItem[] = [];
    const pageChanges: ChangeItem[] = [];
    const siteChanges: ChangeItem[] = [];

    if (menus && menus.length > 0) {
      menus.forEach(menu => {
        navChanges.push({
          id: menu.id,
          category: 'navigation',
          type: 'modified',
          label: menu.name,
          detail: `Publish latest ${menu.slug} menu items`,
        });
      });
    }

    if (pagesConfig?.pages) {
      pagesConfig.pages.forEach(page => {
        pageChanges.push({
          id: page.id,
          category: 'page',
          type: page.enabled ? 'modified' : 'status_change',
          label: page.title,
          detail: page.enabled ? 'Save version snapshot' : 'Draft — not live',
        });
      });
    }

    if (theme) {
      siteChanges.push({ id: 'theme', category: 'site', type: 'modified', label: 'Theme', detail: 'Snapshot colors & typography' });
    }
    if (footer) {
      siteChanges.push({ id: 'footer', category: 'site', type: 'modified', label: 'Footer', detail: 'Snapshot footer config' });
    }
    if (announcement) {
      siteChanges.push({ id: 'announcement_bar', category: 'site', type: 'modified', label: 'Announcement Bar', detail: 'Snapshot announcement message' });
    }

    const totalChanges = navChanges.length + pageChanges.length + siteChanges.length;
    return {
      navChanges,
      pageChanges,
      siteChanges,
      hasChanges: totalChanges > 0,
      totalChanges,
    };
  }, [menus, pagesConfig, theme, footer, announcement]);

  return summary;
}

export function usePublishAll() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const publishMenu = usePublishMenu();
  const savePageVersion = useSavePageVersion();
  const saveSiteVersion = useSaveSiteVersion();
  const { data: menus } = useWebsiteMenus();
  const { data: pagesConfig } = useWebsitePages();
  const { data: theme } = useWebsiteThemeSettings();
  const { data: announcement } = useAnnouncementBarSettings();
  const { data: footer } = useSiteSettings('website_footer');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');

      // 1. Publish all menus
      if (menus) {
        for (const menu of menus) {
          await publishMenu.mutateAsync({
            menuId: menu.id,
            changeSummary: 'Bulk publish via changelog',
          });
        }
      }

      // 2. Save page version snapshots
      if (pagesConfig?.pages) {
        for (const page of pagesConfig.pages) {
          await savePageVersion.mutateAsync({
            page,
            organizationId: orgId,
            changeSummary: 'Bulk publish via changelog',
          });
        }
      }

      // 3. Save site-wide surface snapshots
      if (theme) {
        await saveSiteVersion.mutateAsync({
          surface: 'theme',
          snapshot: theme,
          changeSummary: 'Bulk publish via changelog',
        });
      }
      if (footer) {
        await saveSiteVersion.mutateAsync({
          surface: 'footer',
          snapshot: footer,
          changeSummary: 'Bulk publish via changelog',
        });
      }
      if (announcement) {
        await saveSiteVersion.mutateAsync({
          surface: 'announcement_bar',
          snapshot: announcement,
          changeSummary: 'Bulk publish via changelog',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-menus'] });
      queryClient.invalidateQueries({ queryKey: ['public-menu'] });
      queryClient.invalidateQueries({ queryKey: ['published-menu'] });
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
      queryClient.invalidateQueries({ queryKey: ['site-versions'] });
    },
  });
}

/**
 * Returns true when at least one page version OR site version exists for this org.
 * Used to gate the "Discard Changes" action — you cannot revert to nothing.
 */
export function useHasEverPublished() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['has-ever-published', orgId],
    enabled: !!orgId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!orgId) return false;
      const [pageRes, siteRes] = await Promise.all([
        supabase
          .from('website_page_versions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('website_site_versions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
      ]);
      return (pageRes.count ?? 0) + (siteRes.count ?? 0) > 0;
    },
  });
}

/**
 * One-click revert of pages + site surfaces (theme, footer, announcement_bar) to
 * their most recent saved version.
 *
 * Non-destructive — matches Restore doctrine:
 *   1. Snapshots the current live state as a "Pre-discard backup" version
 *      (so the discard itself is recoverable from History).
 *   2. Reads the most recent version for each page / site surface.
 *   3. Calls the existing restore hooks, which write the snapshot back to
 *      live and append a "Restored from vN" version row.
 */
export function useDiscardToLastPublished() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const savePageVersion = useSavePageVersion();
  const saveSiteVersion = useSaveSiteVersion();
  const restorePageVersion = useRestorePageVersion();
  const restoreSiteVersion = useRestoreSiteVersion();
  const { data: pagesConfig } = useWebsitePages();
  const { data: theme } = useWebsiteThemeSettings();
  const { data: announcement } = useAnnouncementBarSettings();
  const { data: footer } = useSiteSettings('website_footer');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization context');

      // ── 1. Snapshot current live state as a backup (so discard is reversible)
      if (pagesConfig?.pages) {
        for (const page of pagesConfig.pages) {
          await savePageVersion.mutateAsync({
            page,
            organizationId: orgId,
            changeSummary: 'Pre-discard backup',
          });
        }
      }
      const siteBackups: Array<{ surface: SiteVersionSurface; snapshot: unknown }> = [];
      if (theme) siteBackups.push({ surface: 'theme', snapshot: theme });
      if (footer) siteBackups.push({ surface: 'footer', snapshot: footer });
      if (announcement) siteBackups.push({ surface: 'announcement_bar', snapshot: announcement });
      for (const b of siteBackups) {
        await saveSiteVersion.mutateAsync({
          surface: b.surface,
          snapshot: b.snapshot,
          changeSummary: 'Pre-discard backup',
        });
      }

      // ── 2. For each page, restore the most recent version that PRECEDES the
      //      backup we just created (i.e. skip our own backup row).
      if (pagesConfig?.pages) {
        for (const page of pagesConfig.pages) {
          const { data: rows } = await supabase
            .from('website_page_versions')
            .select('id, change_summary')
            .eq('page_id', page.id)
            .eq('organization_id', orgId)
            .order('version_number', { ascending: false })
            .limit(5);
          // First non-"Pre-discard backup" row = the previous live state.
          const target = (rows ?? []).find(
            r => (r as { change_summary: string | null }).change_summary !== 'Pre-discard backup',
          );
          if (target) {
            await restorePageVersion.mutateAsync({ versionId: (target as { id: string }).id });
          }
        }
      }

      // ── 3. Same for each site-wide surface
      const surfaces: SiteVersionSurface[] = ['theme', 'footer', 'announcement_bar'];
      for (const surface of surfaces) {
        const { data: rows } = await supabase
          .from('website_site_versions')
          .select('id, change_summary')
          .eq('organization_id', orgId)
          .eq('surface', surface)
          .order('version_number', { ascending: false })
          .limit(5);
        const target = (rows ?? []).find(
          r => (r as { change_summary: string | null }).change_summary !== 'Pre-discard backup',
        );
        if (target) {
          await restoreSiteVersion.mutateAsync({ versionId: (target as { id: string }).id });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
      queryClient.invalidateQueries({ queryKey: ['site-versions'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      queryClient.invalidateQueries({ queryKey: ['website-pages'] });
      queryClient.invalidateQueries({ queryKey: ['has-ever-published'] });
    },
  });
}
