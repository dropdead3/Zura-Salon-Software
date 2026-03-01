import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { managerNavItems } from '@/config/dashboardNav';
import type { ManagerGroupId } from '@/config/dashboardNav';
import { platformNavGroups } from '@/config/platformNav';
import { LayoutDashboard, Rocket, BarChart3, Settings, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Section icon mapping for collapsed sidebar popovers
export const SECTION_ICONS: Record<string, LucideIcon> = {
  main: LayoutDashboard,
  growth: Rocket,
  stats: BarChart3,
  adminOnly: Settings,
  platform: Terminal,
};

const DEFAULT_PLATFORM_LINK_ORDER = platformNavGroups.flatMap((g) => g.items.map((i) => i.href));

// Default section order matching the sidebar structure
// Consolidated from 9 sections to 6 sections (housekeeping items relocated to top bar)
export const DEFAULT_SECTION_ORDER = [
  'main',
  'growth',      // Renamed to "Growth & Development"
  'stats',       // Renamed to "My Performance"
  'manager',     // Now includes website + sub-groups (Analytics, People, Operations, Team Tools)
  'adminOnly',   // Renamed to "Admin"
  'platform',
];

// Section labels for display (housekeeping is optional/legacy; shown only when in section order)
export const SECTION_LABELS: Record<string, string> = {
  main: 'Main',
  growth: 'Growth & Development',
  stats: 'My Performance',
  manager: 'Management',
  adminOnly: 'Control Center',
  platform: 'Platform Admin',
  housekeeping: 'Resources',
  website: 'Website',
};

// Management section sub-group labels and display order (links derived from registry)
const MANAGER_GROUP_LABELS: Record<ManagerGroupId, string> = {
  teamTools: 'Team Tools',
  analytics: 'Analytics & Reports',
  people: 'People',
  operations: 'Operations',
};

/** Sub-groups for Management section; links are derived from managerNavItems by managerGroup. */
export const MANAGEMENT_SUB_GROUPS = (() => {
  const order: ManagerGroupId[] = ['teamTools', 'analytics', 'people', 'operations'];
  const linksByGroup: Record<string, string[]> = {};
  order.forEach(id => { linksByGroup[id] = []; });
  managerNavItems.forEach(item => {
    if (item.managerGroup && linksByGroup[item.managerGroup]) {
      linksByGroup[item.managerGroup].push(item.href);
    }
  });
  return order.reduce((acc, id) => {
    acc[id] = {
      id,
      label: MANAGER_GROUP_LABELS[id],
      links: linksByGroup[id] || [],
    };
    return acc;
  }, {} as Record<ManagerGroupId, { id: string; label: string; links: string[] }>);
})();

// Default link order for each section
export const DEFAULT_LINK_ORDER: Record<string, string[]> = {
  main: [
    '/dashboard',
    '/dashboard/schedule',
  ],
  growth: [
    '/dashboard/training',
    '/dashboard/program',
    '/dashboard/ring-the-bell',
    '/dashboard/my-graduation',
  ],
  stats: [
    '/dashboard/stats',
    '/dashboard/leaderboard',
    '/dashboard/my-pay',
  ],
  // Manager section now includes all management items + website + team tools (grouped in UI)
  manager: [
    '/dashboard/schedule',
    '/dashboard/shift-swaps',
    '/dashboard/rewards',
    '/dashboard/assistant-schedule',
    '/dashboard/schedule-meeting',
    '/dashboard/admin/analytics',
    '/dashboard/appointments-hub',
    
    '/dashboard/admin/kpi-builder',
    '/dashboard/admin/decision-history',
    '/dashboard/stats',
    '/dashboard/leaderboard',
    '/dashboard/directory',
    '/dashboard/clients',
    '/dashboard/admin/team',
    '/dashboard/admin/management',
    '/dashboard/admin/payroll',
    '/dashboard/admin/booth-renters',
    '/dashboard/admin/settings?category=website',
  ],
  adminOnly: [
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
  return DEFAULT_SECTION_ORDER.includes(sectionId);
}

// Check if a role has any visibility overrides configured
export function hasRoleOverrides(
  layout: SidebarLayoutConfig | null | undefined,
  role: string
): boolean {
  if (!layout?.roleVisibility) return false;
  const roleConfig = layout.roleVisibility[role];
  if (!roleConfig) return false;
  // Has override if there are any hidden sections or hidden links defined
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
// Now serves as the PRIMARY visibility control - configurator is source of truth
export function getEffectiveHiddenSections(
  layout: SidebarLayoutConfig | null | undefined,
  userRoles: string[]
): string[] {
  if (!layout) return [];
  
  // Start with global hidden sections
  const hidden = new Set(layout.hiddenSections || []);
  
  const roleVisibility = layout.roleVisibility || {};
  
  // Check if any of the user's roles have overrides configured
  const rolesWithOverrides = userRoles.filter(role => hasRoleOverrides(layout, role));
  
  // If no roles have overrides, only use global hidden sections
  if (rolesWithOverrides.length === 0) {
    return Array.from(hidden);
  }
  
  // For each section, check if it's visible for at least one of the user's roles with overrides
  // A section is shown if ANY role has it visible (not hidden)
  const sectionOrder = layout.sectionOrder || DEFAULT_SECTION_ORDER;
  
  sectionOrder.forEach((sectionId) => {
    let visibleInAnyRole = false;
    
    for (const role of rolesWithOverrides) {
      const roleConfig = roleVisibility[role];
      // If the role config doesn't have this section in hiddenSections, it's visible for that role
      if (!roleConfig?.hiddenSections?.includes(sectionId)) {
        visibleInAnyRole = true;
        break;
      }
    }
    
    // If hidden for all roles with overrides, add to hidden set
    if (!visibleInAnyRole) {
      hidden.add(sectionId);
    }
  });
  
  return Array.from(hidden);
}

// Get effective hidden links for a user based on their roles
// Now serves as the PRIMARY visibility control - configurator is source of truth
export function getEffectiveHiddenLinks(
  layout: SidebarLayoutConfig | null | undefined,
  userRoles: string[]
): Record<string, string[]> {
  if (!layout) return {};
  
  // Start with global hidden links
  const hidden: Record<string, Set<string>> = {};
  
  Object.entries(layout.hiddenLinks || {}).forEach(([sectionId, links]) => {
    hidden[sectionId] = new Set(links);
  });
  
  const roleVisibility = layout.roleVisibility || {};
  
  // Check if any of the user's roles have overrides configured
  const rolesWithOverrides = userRoles.filter(role => hasRoleOverrides(layout, role));
  
  // If no roles have overrides, only use global hidden links
  if (rolesWithOverrides.length === 0) {
    const result: Record<string, string[]> = {};
    Object.entries(hidden).forEach(([sectionId, linkSet]) => {
      result[sectionId] = Array.from(linkSet);
    });
    return result;
  }
  
  // For each link in each section, check if it's visible for at least one role with overrides
  const linkOrder = layout.linkOrder || DEFAULT_LINK_ORDER;
  
  Object.entries(linkOrder).forEach(([sectionId, links]) => {
    links.forEach((href) => {
      let visibleInAnyRole = false;
      
      for (const role of rolesWithOverrides) {
        const roleConfig = roleVisibility[role];
        // If the role config doesn't have this link in hiddenLinks for this section, it's visible
        if (!roleConfig?.hiddenLinks?.[sectionId]?.includes(href)) {
          visibleInAnyRole = true;
          break;
        }
      }
      
      // If hidden for all roles with overrides, add to hidden set
      if (!visibleInAnyRole) {
        if (!hidden[sectionId]) hidden[sectionId] = new Set();
        hidden[sectionId].add(href);
      }
    });
  });
  
  // Convert Sets back to arrays
  const result: Record<string, string[]> = {};
  Object.entries(hidden).forEach(([sectionId, linkSet]) => {
    result[sectionId] = Array.from(linkSet);
  });
  
  return result;
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

      const stored = data?.sidebar_layout as unknown as SidebarLayoutConfig | null;
      
      // Merge stored with defaults
      const sectionOrder = stored?.sectionOrder?.length 
        ? [...new Set([...stored.sectionOrder, ...DEFAULT_SECTION_ORDER])]
        : DEFAULT_SECTION_ORDER;

      const linkOrder: Record<string, string[]> = { ...DEFAULT_LINK_ORDER };
      
      if (stored?.linkOrder) {
        Object.keys(stored.linkOrder).forEach((sectionId) => {
          const storedLinks = stored.linkOrder[sectionId];
          const defaultLinks = DEFAULT_LINK_ORDER[sectionId] || [];
          // Merge stored with any new defaults
          linkOrder[sectionId] = [...new Set([...storedLinks, ...defaultLinks])];
        });
      }

      // Hidden sections and links default to empty arrays
      const hiddenSections = stored?.hiddenSections || [];
      const hiddenLinks = stored?.hiddenLinks || {};
      
      // Custom sections default to empty object
      const customSections = stored?.customSections || {};
      
      // Role visibility default to empty object
      const roleVisibility = stored?.roleVisibility || {};

      return { sectionOrder, linkOrder, hiddenSections, hiddenLinks, customSections, roleVisibility } as SidebarLayoutConfig;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

export function useUpdateSidebarLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layout: SidebarLayoutConfig) => {
      // Get existing settings first
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .single();

      if (!existing) {
        throw new Error('Business settings not found');
      }

      // Convert to JSON-compatible type for Supabase using JSON serialization
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
