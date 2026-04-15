import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MenuItemType = 'page_link' | 'external_url' | 'anchor' | 'dropdown_parent' | 'cta';
export type CtaStyle = 'primary' | 'secondary' | 'ghost';
export type MenuItemVisibility = 'both' | 'desktop_only' | 'mobile_only';

export interface MenuItem {
  id: string;
  menu_id: string;
  organization_id: string;
  parent_id: string | null;
  label: string;
  item_type: MenuItemType;
  target_page_id: string | null;
  target_url: string | null;
  target_anchor: string | null;
  open_in_new_tab: boolean;
  cta_style: CtaStyle | null;
  tracking_key: string | null;
  icon: string | null;
  sort_order: number;
  visibility: MenuItemVisibility;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  children?: MenuItem[];
}

export interface WebsiteMenu {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MenuVersion {
  id: string;
  menu_id: string;
  organization_id: string;
  version_number: number;
  snapshot: MenuItem[];
  published_by: string | null;
  published_at: string;
  change_summary: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a tree from a flat list of menu items */
export function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];

  // Sort by sort_order first
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

  for (const item of sorted) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of sorted) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Flatten a tree back to a flat list with updated sort_order */
export function flattenMenuTree(tree: MenuItem[]): MenuItem[] {
  const flat: MenuItem[] = [];
  let order = 0;

  function walk(items: MenuItem[], parentId: string | null) {
    for (const item of items) {
      flat.push({ ...item, parent_id: parentId, sort_order: order++ });
      if (item.children?.length) {
        walk(item.children, item.id);
      }
    }
  }

  walk(tree, null);
  return flat;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useResolvedOrgId() {
  const { effectiveOrganization, currentOrganization } = useOrganizationContext();
  return effectiveOrganization?.id ?? currentOrganization?.id;
}

/** Fetch all menus for the current org */
export function useWebsiteMenus() {
  const orgId = useResolvedOrgId();

  return useQuery({
    queryKey: ['website-menus', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('website_menus')
        .select('*')
        .eq('organization_id', orgId)
        .order('slug');
      if (error) throw error;
      return (data ?? []) as WebsiteMenu[];
    },
    enabled: !!orgId,
  });
}

/** Fetch a single menu with its items (as tree) */
export function useWebsiteMenu(menuId: string | null) {
  const orgId = useResolvedOrgId();

  return useQuery({
    queryKey: ['website-menu', menuId],
    queryFn: async () => {
      if (!menuId) return null;
      const { data: items, error } = await supabase
        .from('website_menu_items')
        .select('*')
        .eq('menu_id', menuId)
        .order('sort_order');
      if (error) throw error;
      return (items ?? []) as MenuItem[];
    },
    enabled: !!menuId && !!orgId,
  });
}

/** Fetch published menu snapshot for rendering on the public site */
export function usePublishedMenu(orgId: string | undefined, menuSlug: string) {
  return useQuery({
    queryKey: ['published-menu', orgId, menuSlug],
    queryFn: async () => {
      if (!orgId) return null;

      // Get the menu
      const { data: menu, error: menuError } = await supabase
        .from('website_menus')
        .select('id')
        .eq('organization_id', orgId)
        .eq('slug', menuSlug)
        .maybeSingle();

      if (menuError) throw menuError;
      if (!menu) return null;

      // Get published items
      const { data: items, error } = await supabase
        .from('website_menu_items')
        .select('*')
        .eq('menu_id', menu.id)
        .eq('is_published', true)
        .order('sort_order');

      if (error) throw error;
      return buildMenuTree((items ?? []) as MenuItem[]);
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export interface PublicMenuResult {
  items: MenuItem[];
  config: MenuConfig | null;
}

/** Fetch published menu by slug without requiring org context (for public site) */
export function usePublicMenuBySlug(menuSlug: string) {
  return useQuery({
    queryKey: ['public-menu', menuSlug],
    queryFn: async (): Promise<PublicMenuResult | null> => {
      const { data: menu, error: menuError } = await supabase
        .from('website_menus')
        .select('id, config')
        .eq('slug', menuSlug)
        .limit(1)
        .maybeSingle();

      if (menuError) throw menuError;
      if (!menu) return null;

      const { data: items, error } = await supabase
        .from('website_menu_items')
        .select('*')
        .eq('menu_id', menu.id)
        .eq('is_published', true)
        .order('sort_order');

      if (error) throw error;
      return {
        items: buildMenuTree((items ?? []) as MenuItem[]),
        config: (menu.config as MenuConfig) ?? null,
      };
    },
    staleTime: 60_000,
  });
}

/** Seed default menus if none exist */
export function useSeedMenus() {
  const orgId = useResolvedOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No org');

      // Check if menus exist
      const { data: existing } = await supabase
        .from('website_menus')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1);

      if (existing && existing.length > 0) return;

      // Create primary menu
      const { data: primaryMenu, error: e1 } = await supabase
        .from('website_menus')
        .insert({ organization_id: orgId, slug: 'primary', name: 'Primary Navigation' })
        .select()
        .single();
      if (e1) throw e1;

      // Create footer menu
      const { data: footerMenu, error: e2 } = await supabase
        .from('website_menus')
        .insert({ organization_id: orgId, slug: 'footer', name: 'Footer Navigation' })
        .select()
        .single();
      if (e2) throw e2;

      // Seed primary menu items (matching current hardcoded links)
      const primaryItems = [
        { label: 'Services', item_type: 'page_link', target_url: '/services', sort_order: 0 },
        { label: 'About', item_type: 'dropdown_parent', sort_order: 1 },
        { label: 'Team', item_type: 'page_link', target_url: '/team', sort_order: 2 },
        { label: 'Gallery', item_type: 'page_link', target_url: '/gallery', sort_order: 3 },
        { label: 'Contact', item_type: 'page_link', target_url: '/contact', sort_order: 4 },
        { label: 'Book Now', item_type: 'cta', target_url: '/booking', cta_style: 'primary', sort_order: 5 },
      ];

      const { data: insertedPrimary, error: e3 } = await supabase
        .from('website_menu_items')
        .insert(primaryItems.map(item => ({
          ...item,
          menu_id: primaryMenu.id,
          organization_id: orgId,
          is_published: true,
        })))
        .select();
      if (e3) throw e3;

      // Find the About dropdown parent to nest children
      const aboutParent = insertedPrimary?.find(i => i.label === 'About');
      if (aboutParent) {
        await supabase.from('website_menu_items').insert([
          { menu_id: primaryMenu.id, organization_id: orgId, parent_id: aboutParent.id, label: 'About Us', item_type: 'page_link', target_url: '/about', sort_order: 0, is_published: true },
          { menu_id: primaryMenu.id, organization_id: orgId, parent_id: aboutParent.id, label: 'Policies', item_type: 'page_link', target_url: '/policies', sort_order: 1, is_published: true },
        ]);
      }

      // Seed footer menu items
      await supabase.from('website_menu_items').insert([
        { menu_id: footerMenu.id, organization_id: orgId, label: 'Services', item_type: 'page_link', target_url: '/services', sort_order: 0, is_published: true },
        { menu_id: footerMenu.id, organization_id: orgId, label: 'Book', item_type: 'page_link', target_url: '/booking', sort_order: 1, is_published: true },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-menus'] });
    },
  });
}

/** Create a new menu item */
export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  const orgId = useResolvedOrgId();

  return useMutation({
    mutationFn: async (item: Partial<MenuItem> & { menu_id: string; label: string }) => {
      if (!orgId) throw new Error('No org');
      const { data, error } = await supabase
        .from('website_menu_items')
        .insert({ ...item, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MenuItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['website-menu', data.menu_id] });
    },
  });
}

/** Update a menu item */
export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('website_menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MenuItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['website-menu', data.menu_id] });
    },
  });
}

/** Delete a menu item */
export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, menuId }: { id: string; menuId: string }) => {
      const { error } = await supabase
        .from('website_menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return menuId;
    },
    onSuccess: (menuId) => {
      queryClient.invalidateQueries({ queryKey: ['website-menu', menuId] });
    },
  });
}

/** Batch reorder menu items */
export function useReorderMenuItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, menuId }: { items: { id: string; sort_order: number; parent_id: string | null }[]; menuId: string }) => {
      // Update each item's sort_order and parent_id
      for (const item of items) {
        const { error } = await supabase
          .from('website_menu_items')
          .update({ sort_order: item.sort_order, parent_id: item.parent_id })
          .eq('id', item.id);
        if (error) throw error;
      }
      return menuId;
    },
    onSuccess: (menuId) => {
      queryClient.invalidateQueries({ queryKey: ['website-menu', menuId] });
    },
  });
}

// ─── Menu Config ─────────────────────────────────────────────────────────────

export interface MenuConfig {
  mobile_menu_style?: 'overlay' | 'drawer';
  mobile_cta_visible?: boolean;
}

/** Update menu-level config (JSONB) */
export function useUpdateMenuConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menuId, config }: { menuId: string; config: MenuConfig }) => {
      const { error } = await supabase
        .from('website_menus')
        .update({ config: config as never })
        .eq('id', menuId);
      if (error) throw error;
      return menuId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-menus'] });
      queryClient.invalidateQueries({ queryKey: ['public-menu'] });
    },
  });
}

/** Publish a menu: validate, snapshot, set all items as published */
export function usePublishMenu() {
  const queryClient = useQueryClient();
  const orgId = useResolvedOrgId();

  return useMutation({
    mutationFn: async ({ menuId, changeSummary }: { menuId: string; changeSummary?: string }) => {
      if (!orgId) throw new Error('No org');

      // Get all items
      const { data: items, error: fetchError } = await supabase
        .from('website_menu_items')
        .select('*')
        .eq('menu_id', menuId)
        .order('sort_order');
      if (fetchError) throw fetchError;

      // Get current version number
      const { data: versions } = await supabase
        .from('website_menu_versions')
        .select('version_number')
        .eq('menu_id', menuId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create version snapshot
      const { error: versionError } = await supabase
        .from('website_menu_versions')
        .insert({
          menu_id: menuId,
          organization_id: orgId,
          version_number: nextVersion,
          snapshot: items as never,
          published_by: user?.id,
          change_summary: changeSummary,
        });
      if (versionError) throw versionError;

      // Mark all items as published
      const { error: publishError } = await supabase
        .from('website_menu_items')
        .update({ is_published: true })
        .eq('menu_id', menuId);
      if (publishError) throw publishError;

      return menuId;
    },
    onSuccess: (menuId) => {
      queryClient.invalidateQueries({ queryKey: ['website-menu', menuId] });
      queryClient.invalidateQueries({ queryKey: ['published-menu'] });
    },
  });
}
