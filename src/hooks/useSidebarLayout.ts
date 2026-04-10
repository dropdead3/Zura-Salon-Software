import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { platformNavGroups } from '@/config/platformNav';
import { LayoutDashboard, Wrench, BarChart3, Settings, Terminal, Users, Rocket, HeartPulse, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Section icon mapping for collapsed sidebar popovers
export const SECTION_ICONS: Record<string, LucideIcon> = {
  main: LayoutDashboard,
  myTools: Wrench,
  ops: Users,
  data: BarChart3,
  manage: BarChart3,
  apps: Package,
  system: Settings,
  platform: Terminal,
  // Legacy mappings for stored layouts that reference old section IDs
  growth: Rocket,
  stats: BarChart3,
  adminOnly: Settings,
};

const DEFAULT_PLATFORM_LINK_ORDER = platformNavGroups.flatMap((g) => g.items.map((i) => i.href));

// Default section order — Operations + Data & Reports replace Manage
export const DEFAULT_SECTION_ORDER = [
  'main',
  'myTools',    // Staff-facing daily tools (replaces growth + stats)
  'ops',        // Operations Hub (single item, own section)
  'data',       // Analytics Hub + Report Generator
  'apps',       // Org-activated add-on apps (Color Bar, etc.)
  'system',     // Admin config (replaces adminOnly)
  'platform',
];

// Legacy section IDs that should map to new ones for stored layouts
const LEGACY_SECTION_MAP: Record<string, string> = {
  growth: 'myTools',
  stats: 'myTools',
  manager: 'manage',
  manage: 'ops',      // Legacy 'manage' maps to 'ops' (data items auto-added)
  adminOnly: 'system',
};

// Section labels for display
export const SECTION_LABELS: Record<string, string> = {
  main: 'Main',
  myTools: 'My Tools',
  ops: 'Operations',
  data: 'Data & Reports',
  manage: 'Manage',  // Legacy
  apps: 'Zura Apps',
  system: 'System',
  platform: 'Platform Admin',
  housekeeping: 'Resources',
  website: 'Website',
  // Legacy labels for backward compat
  growth: 'Growth & Development',
  stats: 'My Performance',
  manager: 'Management',
  adminOnly: 'Control Center',
};

/** @deprecated Manager sub-groups removed — sidebar is now flat hub links. Kept for type compat. */
export const MANAGEMENT_SUB_GROUPS = {
  teamTools: { id: 'teamTools', label: 'Team Tools', links: [] as string[] },
  analytics: { id: 'analytics', label: 'Analytics & Reports', links: [] as string[] },
  people: { id: 'people', label: 'People', links: [] as string[] },
  operations: { id: 'operations', label: 'Operations', links: [] as string[] },
};

// Default link order for each section
export const DEFAULT_LINK_ORDER: Record<string, string[]> = {
  main: [
    '/dashboard',
    '/dashboard/schedule',
  ],
  myTools: [
    '/dashboard/today-prep',
    '/dashboard/waitlist',
    '/dashboard/stats',
    '/dashboard/my-pay',
    '/dashboard/training',
    '/dashboard/program',
    '/dashboard/leaderboard',
    '/dashboard/shift-swaps',
    '/dashboard/rewards',
    '/dashboard/ring-the-bell',
    '/dashboard/my-graduation',
  ],
  ops: [
    '/dashboard/admin/team-hub',
  ],
  data: [
    '/dashboard/admin/analytics',
    '/dashboard/admin/reports',
  ],
  manage: [
    '/dashboard/admin/analytics',
    '/dashboard/admin/team-hub',
    '/dashboard/admin/reports',
  ],
  apps: [
    '/dashboard/admin/color-bar-settings',
    '/dashboard/team-chat',
  ],
  system: [
    '/dashboard/admin/access-hub',
    '/dashboard/admin/settings',
  ],
  platform: DEFAULT_PLATFORM_LINK_ORDER,
};

export interface CustomSectionConfig {
  name: string;
}

export interface RoleVisibilityConfig {
  hiddenSections: string[];
  hiddenLinks: Record<string, string[]>;
}

export interface SidebarLayoutConfig {
  sectionOrder: string[];
  linkOrder: Record<string, string[]>;
  hiddenSections: string[];
  hiddenLinks: Record<string, string[]>;
  customSections: Record<string, CustomSectionConfig>;
  // Per-role visibility overrides
  roleVisibility: Record<string, RoleVisibilityConfig>;
}

// Check if a section is a built-in section
export function isBuiltInSection(sectionId: string): boolean {
  return DEFAULT_SECTION_ORDER.includes(sectionId) || Object.keys(LEGACY_SECTION_MAP).includes(sectionId);
}

// Check if a role has any visibility overrides configured
export function hasRoleOverrides(
  layout: SidebarLayoutConfig | null | undefined,
  role: string
): boolean {
  if (!layout?.roleVisibility) return false;
  const roleConfig = layout.roleVisibility[role];
  if (!roleConfig) return false;
  const hasHiddenSections = roleConfig.hiddenSections && roleConfig.hiddenSections.length > 0;
  const hasHiddenLinks = roleConfig.hiddenLinks && Object.keys(roleConfig.hiddenLinks).length > 0;
  return hasHiddenSections || hasHiddenLinks;
}

// Check if ANY of the user's roles have overrides configured
export function anyRoleHasOverrides(
  layout: SidebarLayoutConfig | null | undefined,
  userRoles: string[]
): boolean {
  return userRoles.some(role => hasRoleOverrides(layout, role));
}

// Get effective hidden sections for a user based on their roles
export function getEffectiveHiddenSections(
  layout: SidebarLayoutConfig | null | undefined,
  userRoles: string[]
): string[] {
  if (!layout) return [];
  
  const hidden = new Set(layout.hiddenSections || []);
  const roleVisibility = layout.roleVisibility || {};
  const rolesWithOverrides = userRoles.filter(role => hasRoleOverrides(layout, role));
  
  if (rolesWithOverrides.length === 0) {
    return Array.from(hidden);
  }
  
  const sectionOrder = layout.sectionOrder || DEFAULT_SECTION_ORDER;
  
  sectionOrder.forEach((sectionId) => {
    let visibleInAnyRole = false;
    
    for (const role of rolesWithOverrides) {
      const roleConfig = roleVisibility[role];
      if (!roleConfig?.hiddenSections?.includes(sectionId)) {
        visibleInAnyRole = true;
        break;
      }
    }
    
    if (!visibleInAnyRole) {
      hidden.add(sectionId);
    }
  });
  
  return Array.from(hidden);
}

// Get effective hidden links for a user based on their roles
export function getEffectiveHiddenLinks(
  layout: SidebarLayoutConfig | null | undefined,
  userRoles: string[]
): Record<string, string[]> {
  if (!layout) return {};
  
  const hidden: Record<string, Set<string>> = {};
  
  Object.entries(layout.hiddenLinks || {}).forEach(([sectionId, links]) => {
    hidden[sectionId] = new Set(links);
  });
  
  const roleVisibility = layout.roleVisibility || {};
  const rolesWithOverrides = userRoles.filter(role => hasRoleOverrides(layout, role));
  
  if (rolesWithOverrides.length === 0) {
    const result: Record<string, string[]> = {};
    Object.entries(hidden).forEach(([sectionId, linkSet]) => {
      result[sectionId] = Array.from(linkSet);
    });
    return result;
  }
  
  const linkOrder = layout.linkOrder || DEFAULT_LINK_ORDER;
  
  Object.entries(linkOrder).forEach(([sectionId, links]) => {
    links.forEach((href) => {
      let visibleInAnyRole = false;
      
      for (const role of rolesWithOverrides) {
        const roleConfig = roleVisibility[role];
        if (!roleConfig?.hiddenLinks?.[sectionId]?.includes(href)) {
          visibleInAnyRole = true;
          break;
        }
      }
      
      if (!visibleInAnyRole) {
        if (!hidden[sectionId]) hidden[sectionId] = new Set();
        hidden[sectionId].add(href);
      }
    });
  });
  
  const result: Record<string, string[]> = {};
  Object.entries(hidden).forEach(([sectionId, linkSet]) => {
    result[sectionId] = Array.from(linkSet);
  });
  
  return result;
}

/**
 * Migrate legacy section IDs in stored layouts to new ones.
 * e.g. 'growth' → 'myTools', 'manager' → 'manage', 'adminOnly' → 'system'
 */
function migrateLegacySections(stored: SidebarLayoutConfig): SidebarLayoutConfig {
  const migratedSectionOrder = stored.sectionOrder
    .map(id => LEGACY_SECTION_MAP[id] || id)
    // Deduplicate (e.g. both 'growth' and 'stats' map to 'myTools')
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const migratedLinkOrder: Record<string, string[]> = {};
  Object.entries(stored.linkOrder || {}).forEach(([sectionId, links]) => {
    const newId = LEGACY_SECTION_MAP[sectionId] || sectionId;
    if (migratedLinkOrder[newId]) {
      // Merge links from multiple legacy sections into one
      migratedLinkOrder[newId] = [...new Set([...migratedLinkOrder[newId], ...links])];
    } else {
      migratedLinkOrder[newId] = links;
    }
  });

  const migratedHiddenSections = (stored.hiddenSections || [])
    .map(id => LEGACY_SECTION_MAP[id] || id)
    .filter((id, index, arr) => arr.indexOf(id) === index);

  const migratedHiddenLinks: Record<string, string[]> = {};
  Object.entries(stored.hiddenLinks || {}).forEach(([sectionId, links]) => {
    const newId = LEGACY_SECTION_MAP[sectionId] || sectionId;
    if (migratedHiddenLinks[newId]) {
      migratedHiddenLinks[newId] = [...new Set([...migratedHiddenLinks[newId], ...links])];
    } else {
      migratedHiddenLinks[newId] = links;
    }
  });

  // Migrate role visibility
  const migratedRoleVisibility: Record<string, RoleVisibilityConfig> = {};
  Object.entries(stored.roleVisibility || {}).forEach(([role, config]) => {
    migratedRoleVisibility[role] = {
      hiddenSections: (config.hiddenSections || [])
        .map(id => LEGACY_SECTION_MAP[id] || id)
        .filter((id, index, arr) => arr.indexOf(id) === index),
      hiddenLinks: (() => {
        const hl: Record<string, string[]> = {};
        Object.entries(config.hiddenLinks || {}).forEach(([sectionId, links]) => {
          const newId = LEGACY_SECTION_MAP[sectionId] || sectionId;
          if (hl[newId]) {
            hl[newId] = [...new Set([...hl[newId], ...links])];
          } else {
            hl[newId] = links;
          }
        });
        return hl;
      })(),
    };
  });

  return {
    ...stored,
    sectionOrder: migratedSectionOrder,
    linkOrder: migratedLinkOrder,
    hiddenSections: migratedHiddenSections,
    hiddenLinks: migratedHiddenLinks,
    roleVisibility: migratedRoleVisibility,
  };
}

export function useSidebarLayout() {
  return useQuery({
    queryKey: ['sidebar-layout'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('sidebar_layout')
        .single();

      if (error) throw error;

      let stored = data?.sidebar_layout as unknown as SidebarLayoutConfig | null;
      
      // Migrate legacy section IDs if present
      if (stored?.sectionOrder?.some(id => Object.keys(LEGACY_SECTION_MAP).includes(id))) {
        stored = migrateLegacySections(stored);
      }

      // Merge stored with defaults, inserting new sections at their correct default position
      const sectionOrder = stored?.sectionOrder?.length
        ? (() => {
            const merged = [...stored.sectionOrder];
            DEFAULT_SECTION_ORDER.forEach((id, defaultIdx) => {
              if (!merged.includes(id)) {
                const prevInDefault = DEFAULT_SECTION_ORDER[defaultIdx - 1];
                const insertAfter = prevInDefault ? merged.indexOf(prevInDefault) : -1;
                merged.splice(insertAfter + 1, 0, id);
              }
            });
            return [...new Set(merged)];
          })()
        : DEFAULT_SECTION_ORDER;

      const linkOrder: Record<string, string[]> = { ...DEFAULT_LINK_ORDER };
      
      if (stored?.linkOrder) {
        Object.keys(stored.linkOrder).forEach((sectionId) => {
          // Skip legacy section IDs that weren't migrated
          if (LEGACY_SECTION_MAP[sectionId]) return;
          const storedLinks = stored!.linkOrder[sectionId];
          const defaultLinks = DEFAULT_LINK_ORDER[sectionId] || [];
          linkOrder[sectionId] = [...new Set([...storedLinks, ...defaultLinks])];
        });
      }

      const hiddenSections = stored?.hiddenSections || [];
      const hiddenLinks = stored?.hiddenLinks || {};
      const customSections = stored?.customSections || {};
      const roleVisibility = stored?.roleVisibility || {};

      return { sectionOrder, linkOrder, hiddenSections, hiddenLinks, customSections, roleVisibility } as SidebarLayoutConfig;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpdateSidebarLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layout: SidebarLayoutConfig) => {
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .single();

      if (!existing) {
        throw new Error('Business settings not found');
      }

      const layoutJson = JSON.parse(JSON.stringify({
        sectionOrder: layout.sectionOrder,
        linkOrder: layout.linkOrder,
        hiddenSections: layout.hiddenSections,
        hiddenLinks: layout.hiddenLinks,
        customSections: layout.customSections,
        roleVisibility: layout.roleVisibility,
      }));

      const { data, error } = await supabase
        .from('business_settings')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ sidebar_layout: layoutJson } as any)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-layout'] });
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success('Sidebar layout saved');
    },
    onError: (error) => {
      console.error('Failed to update sidebar layout:', error);
      toast.error('Failed to update sidebar layout');
    },
  });
}
