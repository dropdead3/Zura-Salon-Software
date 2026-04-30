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
import {
  publishSiteSettingsDrafts,
  discardSiteSettingsDrafts,
  listDirtyDrafts,
} from '@/lib/siteSettingsDraft';

export interface ChangeItem {
  id: string;
  category: 'navigation' | 'page' | 'site';
  type: 'added' | 'modified' | 'removed' | 'status_change';
  label: string;
  detail?: string;
}

// Friendly labels for site_settings row IDs surfaced in the changelog.
// Anything not listed falls back to a humanized version of the key.
const SITE_SETTING_LABELS: Record<string, { label: string; category: 'navigation' | 'page' | 'site' }> = {
  website_pages: { label: 'Pages & Sections', category: 'page' },
  website_sections: { label: 'Homepage Sections', category: 'page' },
  website_theme: { label: 'Theme', category: 'site' },
  website_retail_theme: { label: 'Retail Theme', category: 'site' },
  website_booking: { label: 'Booking Settings', category: 'site' },
  website_retail: { label: 'Retail Settings', category: 'site' },
  website_seo_legal: { label: 'SEO & Legal', category: 'site' },
  website_social_links: { label: 'Social Links', category: 'site' },
  website_footer: { label: 'Footer', category: 'site' },
  announcement_bar: { label: 'Announcement Bar', category: 'site' },
  homepage_stylists: { label: 'Homepage Stylists', category: 'site' },
};

const SECTION_KEY_PREFIX = 'section_';

function labelForSettingKey(key: string): { label: string; category: 'navigation' | 'page' | 'site' } {
  if (SITE_SETTING_LABELS[key]) return SITE_SETTING_LABELS[key];
  if (key.startsWith(SECTION_KEY_PREFIX)) {
    const rest = key.slice(SECTION_KEY_PREFIX.length).replace(/_/g, ' ');
    return {
      label: rest.replace(/\b\w/g, c => c.toUpperCase()),
      category: 'page',
    };
  }
  return { label: key.replace(/_/g, ' '), category: 'site' };
}

/**
 * Real diff between draft_value and live value for the org's site_settings,
 * plus menu publish status. Drives the publish dialog summary.
 */
export function useChangelogSummary() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: menus } = useWebsiteMenus();

  const dirtyDraftsQuery = useQuery({
    queryKey: ['site-settings-dirty-drafts', orgId],
    enabled: !!orgId,
    staleTime: 5_000,
    queryFn: async () => listDirtyDrafts(orgId!),
  });

  // Per-menu pending-change detector: a menu is dirty when it has at least
  // one item where is_published=false. Avoids "1 navigation change" false
  // positives on clean orgs.
  const dirtyMenusQuery = useQuery({
    queryKey: ['website-menus-dirty', orgId],
    enabled: !!orgId,
    staleTime: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_menu_items')
        .select('menu_id')
        .eq('organization_id', orgId!)
        .eq('is_published', false);
      if (error) throw error;
      return new Set<string>((data ?? []).map(r => r.menu_id as string));
    },
  });

  const summary = useMemo(() => {
    const navChanges: ChangeItem[] = [];
    const pageChanges: ChangeItem[] = [];
    const siteChanges: ChangeItem[] = [];

    // Menus: only those with at least one unpublished item.
    const dirtyMenus = dirtyMenusQuery.data;
    if (menus && dirtyMenus) {
      menus
        .filter(menu => dirtyMenus.has(menu.id))
        .forEach(menu => {
          navChanges.push({
            id: menu.id,
            category: 'navigation',
            type: 'modified',
            label: menu.name,
            detail: `Publish latest ${menu.slug} menu items`,
          });
        });
    }

    // site_settings: only rows whose draft_value differs from live value.
    const dirtyKeys = dirtyDraftsQuery.data ?? [];
    dirtyKeys.forEach(key => {
      const { label, category } = labelForSettingKey(key);
      const item: ChangeItem = {
        id: key,
        category,
        type: 'modified',
        label,
        detail: 'Unpublished draft changes',
      };
      if (category === 'page') pageChanges.push(item);
      else siteChanges.push(item);
    });

    const totalChanges = navChanges.length + pageChanges.length + siteChanges.length;
    return {
      navChanges,
      pageChanges,
      siteChanges,
      hasChanges: totalChanges > 0,
      totalChanges,
      isLoading: dirtyDraftsQuery.isLoading || dirtyMenusQuery.isLoading,
    };
  }, [menus, dirtyDraftsQuery.data, dirtyDraftsQuery.isLoading, dirtyMenusQuery.data, dirtyMenusQuery.isLoading]);

  return summary;
}

/**
 * Publish flow:
 *   1. Promote every divergent draft_value → live `value` for the org's
 *      site_settings rows. THIS is what makes editor changes visible to
 *      public visitors.
 *   2. Publish menus.
 *   3. Snapshot the now-live state into website_page_versions /
 *      website_site_versions for rollback / history.
 *
 * Until step 1 runs, the editor is a sandbox — visitors see the old live
 * value. Calling Save in the editor only updates draft_value.
 */
export function usePublishAll() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const publishMenu = usePublishMenu();
  const savePageVersion = useSavePageVersion();
  const saveSiteVersion = useSaveSiteVersion();
  const { data: menus } = useWebsiteMenus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');

      // 1. Promote drafts → live for every site_settings row in this org.
      const promoted = await publishSiteSettingsDrafts(orgId);

      // 2. Publish all menus.
      if (menus) {
        for (const menu of menus) {
          await publishMenu.mutateAsync({
            menuId: menu.id,
            changeSummary: 'Bulk publish via changelog',
          });
        }
      }

      // 3. Snapshot the FRESHLY-PROMOTED live state (read straight from DB,
      //    not from React Query cache — the cache may still hold pre-publish
      //    live values because the editor itself reads draft mode and the
      //    public hooks here weren't subscribed to invalidations yet).
      const surfaceKeys = ['website_pages', 'website_theme', 'website_footer', 'announcement_bar'] as const;
      const { data: liveRows } = await supabase
        .from('site_settings')
        .select('id, value')
        .eq('organization_id', orgId)
        .in('id', surfaceKeys as unknown as string[]);

      const byKey = new Map<string, unknown>(
        (liveRows ?? []).map(r => [r.id as string, (r as { value: unknown }).value]),
      );

      const livePages = byKey.get('website_pages') as { pages?: Array<{ id: string }> } | undefined;
      if (livePages?.pages) {
        for (const page of livePages.pages) {
          await savePageVersion.mutateAsync({
            page: page as never,
            organizationId: orgId,
            changeSummary: 'Bulk publish via changelog',
          });
        }
      }
      const liveTheme = byKey.get('website_theme');
      if (liveTheme) {
        await saveSiteVersion.mutateAsync({
          surface: 'theme',
          snapshot: liveTheme as never,
          changeSummary: 'Bulk publish via changelog',
        });
      }
      const liveFooter = byKey.get('website_footer');
      if (liveFooter) {
        await saveSiteVersion.mutateAsync({
          surface: 'footer',
          snapshot: liveFooter as never,
          changeSummary: 'Bulk publish via changelog',
        });
      }
      const liveAnnouncement = byKey.get('announcement_bar');
      if (liveAnnouncement) {
        await saveSiteVersion.mutateAsync({
          surface: 'announcement_bar',
          snapshot: liveAnnouncement as never,
          changeSummary: 'Bulk publish via changelog',
        });
      }

      return { promoted };
    },
    onSuccess: () => {
      // Invalidate every site_settings cache key (live + draft modes) so
      // both the public site AND the editor re-fetch fresh data.
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings-dirty-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['website-menus'] });
      queryClient.invalidateQueries({ queryKey: ['public-menu'] });
      queryClient.invalidateQueries({ queryKey: ['published-menu'] });
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
      queryClient.invalidateQueries({ queryKey: ['site-versions'] });
    },
  });
}

/**
 * Discard all unpublished editor changes by copying live `value` back
 * into `draft_value` for every site_settings row in the org. The live
 * site is untouched; the editor reverts to showing what visitors see.
 *
 * This is the new, lightweight "Discard" action. The legacy
 * `useDiscardToLastPublished` (snapshot-based) below remains available
 * for restoring from version history.
 */
export function useDiscardDrafts() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');
      return await discardSiteSettingsDrafts(orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings-dirty-drafts'] });
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
