import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebsiteMenus, usePublishMenu } from './useWebsiteMenus';
import { useWebsitePages } from './useWebsitePages';
import { useSavePageVersion } from './usePageVersions';
import { useSaveSiteVersion } from './useSiteVersions';
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
