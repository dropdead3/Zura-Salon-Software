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
  category: 'navigation' | 'page';
  type: 'added' | 'modified' | 'removed' | 'status_change';
  label: string;
  detail?: string;
}

export function useChangelogSummary() {
  const { data: menus } = useWebsiteMenus();
  const { data: pagesConfig } = useWebsitePages();

  // We track menus and pages that exist — real diff requires version snapshots,
  // so we surface a simplified summary of what will be published.
  const summary = useMemo(() => {
    const navChanges: ChangeItem[] = [];
    const pageChanges: ChangeItem[] = [];

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

    return {
      navChanges,
      pageChanges,
      hasChanges: navChanges.length > 0 || pageChanges.length > 0,
      totalChanges: navChanges.length + pageChanges.length,
    };
  }, [menus, pagesConfig]);

  return summary;
}

export function usePublishAll() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const publishMenu = usePublishMenu();
  const saveVersion = useSavePageVersion();
  const { data: menus } = useWebsiteMenus();
  const { data: pagesConfig } = useWebsitePages();
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
          await saveVersion.mutateAsync({
            page,
            organizationId: orgId,
            changeSummary: 'Bulk publish via changelog',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-menus'] });
      queryClient.invalidateQueries({ queryKey: ['public-menu'] });
      queryClient.invalidateQueries({ queryKey: ['published-menu'] });
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
    },
  });
}
