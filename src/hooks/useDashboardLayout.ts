import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from './useEffectiveUser';
import { useGodModeTargetUserId } from './useGodModeTargetUserId';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useIsPrimaryOwner } from './useIsPrimaryOwner';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

/**
 * Pick the canonical role key used for owner-authored role layouts.
 * Owners curate one layout per role enum value (stylist, manager, admin, etc.).
 */
function pickPrimaryRoleKey(roles: string[]): AppRole {
  const priority: AppRole[] = [
    'super_admin', 'admin', 'manager',
    'receptionist', 'bookkeeper', 'inventory_manager',
    'stylist', 'stylist_assistant', 'assistant', 'admin_assistant',
    'operations_assistant', 'booth_renter',
  ];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'stylist';
}

export interface DashboardLayout {
  sections: string[];
  sectionOrder: string[];  // All sections in display order (enabled + disabled), includes pinned: prefixed cards
  pinnedCards: string[];   // Tracks which cards are pinned (for visibility)
  widgets: string[];
  widgetOrder?: string[];  // All widgets in display order (enabled + disabled)
  hasCompletedSetup: boolean;
  // Hub customization
  hubOrder?: string[];     // Order of hub hrefs
  enabledHubs?: string[];  // Which hubs are visible (by href)
}

export interface DashboardTemplate {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  layout: DashboardLayout;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Helper functions for pinned card entries in sectionOrder
export const isPinnedCardEntry = (id: string): boolean => id.startsWith('pinned:');
export const getPinnedCardId = (id: string): string => id.replace('pinned:', '');
export const toPinnedEntry = (cardId: string): string => `pinned:${cardId}`;

/**
 * Virtual section ID representing the Analytics block in `sectionOrder`.
 * Pinned analytics cards are rendered as one cohesive section at this
 * marker's position. The cards' internal order is driven by `pinnedCards`,
 * not by interleaving `pinned:*` entries in `sectionOrder` (legacy model).
 */
export const ANALYTICS_SECTION_ID = 'analytics';

// Single source of truth for visibility keys when card IDs and registered element keys differ.
const PINNED_CARD_VISIBILITY_KEY_MAP: Record<string, string> = {
  operations_stats: 'operations_quick_stats',
};

export const getPinnedVisibilityKey = (cardId: string): string => PINNED_CARD_VISIBILITY_KEY_MAP[cardId] ?? cardId;

// All available pinnable card IDs for reference
export const PINNABLE_CARD_IDS = [
  'executive_summary',
  'daily_brief',
  'sales_overview',
  'top_performers',
  'revenue_breakdown',
  'client_funnel',
  'client_health',
  'rebooking',
  'operational_health',
  'operations_stats',
  'goal_tracker',
  'new_bookings',
  'week_ahead_forecast',
  'capacity_utilization',
  'locations_rollup',
  'service_mix',
  'retail_effectiveness',
  'commission_summary',
  'staff_commission_breakdown',
  'true_profit',
  'service_profitability',
  'staff_performance',
  'staffing_trends',
  'hiring_capacity',
  'stylist_workload',
  'client_experience_staff',
  'control_tower',
  'predictive_inventory',
] as const;

const VALID_PINNABLE_CARD_IDS = new Set<string>(PINNABLE_CARD_IDS);

export function getPinnedCardIdsFromLayout(
  layout: Pick<DashboardLayout, 'pinnedCards' | 'sectionOrder'> | null | undefined
): string[] {
  const fromPinnedCards = (layout?.pinnedCards || []).filter((id) => VALID_PINNABLE_CARD_IDS.has(id));
  const fromSectionOrder = (layout?.sectionOrder || [])
    .filter(isPinnedCardEntry)
    .map(getPinnedCardId)
    .filter((id) => VALID_PINNABLE_CARD_IDS.has(id));

  return [...new Set([...fromPinnedCards, ...fromSectionOrder])];
}

export function isPinnedInLayout(
  layout: Pick<DashboardLayout, 'pinnedCards' | 'sectionOrder'> | null | undefined,
  cardId: string
): boolean {
  return getPinnedCardIdsFromLayout(layout).includes(cardId);
}

function dedupe<T>(items: T[] | undefined): T[] | undefined {
  return items ? [...new Set(items)] : undefined;
}

/**
 * Section IDs that have been retired from the dashboard.
 *
 * Single source of truth — used by:
 *   1. `sanitizeDashboardLayout` — strips retired IDs on every read & write of layout
 *   2. `migrateLayout` — same set is iterated in the migration block
 *   3. `DashboardCustomizeMenu` — defensive UI filter on `orderedUnifiedItems`
 *
 * To retire a section: add the ID here, remove it from `getSections()` in
 * `DashboardCustomizeMenu.tsx`, remove its render branch in `DashboardHome.tsx`.
 * The customize menu and stored preferences will self-clean automatically.
 */
export const RETIRED_SECTION_IDS = new Set<string>([
  'hub_quicklinks',   // Sidebar handles hub navigation; dashboard card was redundant.
  'team_dashboards',  // Replaced by role-switcher in Customize.
  'announcements',    // Moved to floating AnnouncementsDrawer; dashboard render branch removed.
  // NOTE: 'command_center' is intentionally NOT here — it has bespoke
  // migration that converts it into inline pinned cards (see migrateLayout).
]);

export const isRetiredSectionId = (id: string): boolean => RETIRED_SECTION_IDS.has(id);

function sanitizeDashboardLayout(layout: DashboardLayout): DashboardLayout {
  const pinnedCards = [...new Set((layout.pinnedCards || []).filter((id) => VALID_PINNABLE_CARD_IDS.has(id)))];
  const sectionOrderSource = layout.sectionOrder?.length ? layout.sectionOrder : layout.sections || [];

  // Collapse legacy `pinned:*` entries into a single `analytics` marker at the
  // position of the first pinned entry. Per-card order is preserved on
  // `pinnedCards`. Idempotent — layouts already on the new model pass through.
  const collapsed: string[] = [];
  let analyticsInserted = false;
  for (const id of sectionOrderSource) {
    if (RETIRED_SECTION_IDS.has(id)) continue;
    if (isPinnedCardEntry(id)) {
      if (!analyticsInserted && !collapsed.includes(ANALYTICS_SECTION_ID)) {
        collapsed.push(ANALYTICS_SECTION_ID);
        analyticsInserted = true;
      }
      continue;
    }
    collapsed.push(id);
  }
  // If pinned cards exist but no analytics marker was placed (e.g. fresh
  // layout after pinning a card), append the marker so it has a render slot.
  if (pinnedCards.length > 0 && !collapsed.includes(ANALYTICS_SECTION_ID)) {
    collapsed.push(ANALYTICS_SECTION_ID);
  }
  const sectionOrder = [...new Set(collapsed)];

  // `sections` (the enabled set) gets the same treatment: drop pinned:* and
  // ensure `analytics` is present-and-enabled when there are pinned cards.
  const sectionsBase = (layout.sections || []).filter(
    (id) => !RETIRED_SECTION_IDS.has(id) && !isPinnedCardEntry(id),
  );
  const sectionsSet = new Set(sectionsBase);
  if (pinnedCards.length > 0) sectionsSet.add(ANALYTICS_SECTION_ID);

  return {
    ...layout,
    sections: [...sectionsSet],
    sectionOrder,
    pinnedCards,
    widgets: [...new Set(layout.widgets || [])],
    widgetOrder: dedupe(layout.widgetOrder),
    hubOrder: dedupe(layout.hubOrder),
    enabledHubs: dedupe(layout.enabledHubs),
  };
}

const DEFAULT_LAYOUT: DashboardLayout = {
  sections: ['daily_briefing', 'ai_insights', 'todays_prep', 'payroll_deadline', 'payday_countdown', 'active_campaigns', 'quick_actions', 'todays_queue', 'quick_stats', 'level_progress', 'graduation_kpi', 'analytics', 'schedule_tasks', 'client_engine', 'widgets'],
  sectionOrder: ['daily_briefing', 'ai_insights', 'todays_prep', 'payroll_deadline', 'payday_countdown', 'active_campaigns', 'quick_actions', 'todays_queue', 'quick_stats', 'level_progress', 'graduation_kpi', 'analytics', 'schedule_tasks', 'client_engine', 'widgets'],
  pinnedCards: [],
  widgets: ['changelog', 'birthdays', 'anniversaries', 'schedule'],
  hasCompletedSetup: false,
};

/**
 * Migrate legacy layouts that use 'command_center' as a section.
 * Converts them to inline pinned cards in sectionOrder.
 * Also ensures new sections like 'hub_quicklinks' are added for existing users.
 */
function migrateLayout(layout: DashboardLayout, pinnedCards: string[]): DashboardLayout {
  let migrated = sanitizeDashboardLayout({ ...layout });
  const sanitizedPinnedCards = [...new Set((pinnedCards || []).filter((id) => VALID_PINNABLE_CARD_IDS.has(id)))];

  // If sectionOrder contains 'command_center', migrate to inline pinned cards
  if (migrated.sectionOrder?.includes('command_center')) {
    const insertIndex = migrated.sectionOrder.indexOf('command_center');

    // Remove command_center from sections and sectionOrder
    const newSectionOrder = migrated.sectionOrder.filter(id => id !== 'command_center');
    const newSections = migrated.sections.filter(id => id !== 'command_center');

    // Insert pinned cards at the command_center position
    const pinnedEntries = sanitizedPinnedCards.map(id => toPinnedEntry(id));
    newSectionOrder.splice(insertIndex, 0, ...pinnedEntries);

    migrated = {
      ...migrated,
      sectionOrder: newSectionOrder,
      sections: newSections,
      pinnedCards: sanitizedPinnedCards,
    };
  }

  // Strip any retired section IDs from persisted layouts. Single source of
  // truth: RETIRED_SECTION_IDS above. `sanitizeDashboardLayout` already filters
  // these on every read/write — this block stays for explicit, traceable
  // migration semantics on legacy `sections` / `sectionOrder` arrays.
  for (const retiredId of RETIRED_SECTION_IDS) {
    if (migrated.sectionOrder?.includes(retiredId) || migrated.sections?.includes(retiredId)) {
      migrated = {
        ...migrated,
        sections: (migrated.sections || []).filter((id) => id !== retiredId),
        sectionOrder: (migrated.sectionOrder || []).filter((id) => id !== retiredId),
      };
    }
  }

  // Ensure ai_insights is added for existing layouts (migration for existing users)
  if (!migrated.sectionOrder?.includes('ai_insights')) {
    migrated = {
      ...migrated,
      sections: ['ai_insights', ...(migrated.sections || [])],
      sectionOrder: ['ai_insights', ...(migrated.sectionOrder || [])],
    };
  }

  // Ensure todays_prep is added for existing layouts (after ai_insights)
  if (!migrated.sectionOrder?.includes('todays_prep')) {
    const insightsIdx = migrated.sectionOrder?.indexOf('ai_insights');
    const insertIdx = insightsIdx !== undefined && insightsIdx >= 0 ? insightsIdx + 1 : 0;
    const newSections = [...(migrated.sections || [])];
    const newOrder = [...(migrated.sectionOrder || [])];
    newSections.splice(insertIdx, 0, 'todays_prep');
    newOrder.splice(insertIdx, 0, 'todays_prep');
    migrated = {
      ...migrated,
      sections: newSections,
      sectionOrder: newOrder,
    };
  }

  // Ensure payroll sections are added for existing layouts
  if (!migrated.sectionOrder?.includes('payroll_deadline')) {
    const insertAfter = migrated.sectionOrder?.indexOf('todays_prep');
    const idx = insertAfter !== undefined && insertAfter >= 0 ? insertAfter + 1 : 2;
    const newSections = [...(migrated.sections || [])];
    const newOrder = [...(migrated.sectionOrder || [])];
    newSections.splice(idx, 0, 'payroll_deadline', 'payday_countdown');
    newOrder.splice(idx, 0, 'payroll_deadline', 'payday_countdown');
    migrated = {
      ...migrated,
      sections: newSections,
      sectionOrder: newOrder,
    };
  }

  // Ensure level_progress and graduation_kpi sections exist for existing layouts
  for (const sectionKey of ['level_progress', 'graduation_kpi']) {
    if (!migrated.sectionOrder?.includes(sectionKey)) {
      const insertAfter = migrated.sectionOrder?.indexOf('quick_stats');
      const idx = insertAfter !== undefined && insertAfter >= 0 ? insertAfter + 1 : migrated.sectionOrder.length;
      const newSections = [...(migrated.sections || [])];
      const newOrder = [...(migrated.sectionOrder || [])];
      newSections.splice(idx, 0, sectionKey);
      newOrder.splice(idx, 0, sectionKey);
      migrated = {
        ...migrated,
        sections: newSections,
        sectionOrder: newOrder,
      };
    }
  }

  return sanitizeDashboardLayout(migrated);
}

// Map roles to template role_name. Order matters: highest-precedence role wins.
function getRoleTemplateKey(roles: string[], isLeadership: boolean, isPrimaryOwner: boolean): string {
  if (isPrimaryOwner) return 'account_owner';
  if (roles.includes('admin')) return 'leadership';
  if (roles.includes('manager')) return 'manager';
  if (isLeadership) return 'leadership';
  if (roles.includes('stylist')) return 'stylist';
  if (roles.includes('stylist_assistant')) return 'assistant';
  if (roles.includes('receptionist')) return 'operations';
  return 'stylist'; // Default fallback
}

/**
 * Map an app_role enum value to the template role_name used in
 * dashboard_layout_templates. Used by Preview-as-role / role-targeted writes.
 */
export function templateKeyForRole(role: AppRole): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'leadership';
    case 'manager':
      return 'manager';
    case 'stylist':
      return 'stylist';
    case 'stylist_assistant':
    case 'assistant':
    case 'admin_assistant':
    case 'operations_assistant':
      return 'assistant';
    case 'receptionist':
      return 'operations';
    default:
      return 'stylist';
  }
}

// Fetch user's dashboard layout
export function useDashboardLayout(overrideUserId?: string) {
  const roles = useEffectiveRoles();
  const { targetUserId: godModeTargetUserId, isResolvingTarget } = useGodModeTargetUserId();
  const targetUserId = overrideUserId || godModeTargetUserId;
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();
  const { isViewingAs, viewAsRole } = useViewAs();

  // When the owner is previewing as a role, resolve that role's layout
  // (not the owner's own primary role).
  const primaryRoleKey = (isViewingAs && viewAsRole) ? viewAsRole : pickPrimaryRoleKey(roles);

  // Personal overrides only apply for account owners. All other roles see
  // the owner-authored org-role layout (or the seeded template). This enforces
  // the locked governance decision: users cannot personalize their own dashboard.
  const allowPersonalLayout = !!isPrimaryOwner && !isViewingAs;

  const { data: userPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['user-preferences', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId && allowPersonalLayout,
  });

  // Determine if user is leadership for template selection
  const isLeadership = roles.includes('super_admin') || roles.includes('manager') || roles.includes('admin');
  // When previewing as a role, look up that role's template directly.
  const templateKey = (isViewingAs && viewAsRole)
    ? templateKeyForRole(viewAsRole)
    : getRoleTemplateKey(roles, isLeadership, isPrimaryOwner);

  const { data: roleTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['dashboard-layout-template', templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_layout_templates')
        .select('*')
        .eq('role_name', templateKey)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          ...data,
          layout: data.layout as unknown as DashboardLayout,
        } as DashboardTemplate;
      }
      return null;
    },
    enabled: roles.length > 0 || (isViewingAs && !!viewAsRole),
  });

  // Owner-authored role layout for the current org + primary role.
  // This is the org-wide "what stylists see" / "what managers see" canvas.
  const { data: orgRoleLayoutRow, isLoading: orgRoleLayoutLoading } = useQuery({
    queryKey: ['dashboard-role-layout', orgId, primaryRoleKey],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('dashboard_role_layouts')
        .select('layout, updated_at, updated_by')
        .eq('organization_id', orgId)
        .eq('role', primaryRoleKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && roles.length > 0,
  });

  const orgRoleLayout: DashboardLayout | null = orgRoleLayoutRow?.layout
    ? sanitizeDashboardLayout({
        ...DEFAULT_LAYOUT,
        ...(orgRoleLayoutRow.layout as unknown as Partial<DashboardLayout>),
      })
    : null;

  // Determine the effective layout - safely parse JSON
  const parsedLayout = userPrefs?.dashboard_layout as Record<string, unknown> | null;
  const rawSavedLayout: DashboardLayout | null = parsedLayout ? sanitizeDashboardLayout({
    sections: (parsedLayout.sections as string[]) || [],
    sectionOrder: (parsedLayout.sectionOrder as string[]) || (parsedLayout.sections as string[]) || [],
    pinnedCards: (parsedLayout.pinnedCards as string[]) || [],
    widgets: (parsedLayout.widgets as string[]) || [],
    hasCompletedSetup: (parsedLayout.hasCompletedSetup as boolean) || false,
    hubOrder: (parsedLayout.hubOrder as string[]) || undefined,
    enabledHubs: (parsedLayout.enabledHubs as string[]) || undefined,
  }) : null;

  const hasCompletedSetup = rawSavedLayout?.hasCompletedSetup ?? false;

  // Resolution order:
  //   1. User's own saved layout (personal override -- legacy + future per-user customization)
  //   2. Owner-authored role layout for this org (the governed default)
  //   3. Static role template (seed default)
  //   4. Hard-coded DEFAULT_LAYOUT
  const baseLayout: DashboardLayout =
    rawSavedLayout ||
    orgRoleLayout ||
    (roleTemplate?.layout
      ? sanitizeDashboardLayout({
          ...roleTemplate.layout,
          sectionOrder: roleTemplate.layout.sectionOrder || roleTemplate.layout.sections,
          hasCompletedSetup: false,
        })
      : DEFAULT_LAYOUT);

  // Migrate legacy layouts that use command_center
  const layout = migrateLayout(baseLayout, baseLayout.pinnedCards || []);

  return {
    layout,
    hasCompletedSetup,
    isLoading: prefsLoading || templateLoading || orgRoleLayoutLoading || (!overrideUserId && isResolvingTarget),
    roleTemplate,
    templateKey,
    isLeadership,
    /** The org-wide owner-authored layout for the effective primary role, if any. */
    orgRoleLayout,
    /** The role key under which org-wide layout writes are scoped. */
    primaryRoleKey,
    /** Resolved org id (for write hooks). */
    orgId,
  };
}

// Save dashboard layout.
//
// Owner-author governance routing:
// - When the account owner is in View-As mode, writes are routed to
//   `dashboard_role_layouts` for the previewed role (org-wide governance edit).
// - Otherwise (owner editing their own canvas), writes go to `user_preferences`.
// - Non-owners cannot reach this code path because the customize menu is gated
//   by `useCanCustomizeDashboardLayouts` (RLS also enforces this server-side).
export function useSaveDashboardLayout(overrideUserId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { targetUserId: godModeTargetUserId } = useGodModeTargetUserId();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { isViewingAs, viewAsRole } = useViewAs();
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();

  // Route to role layout when owner is previewing a role.
  const writeTarget: 'role' | 'personal' =
    isPrimaryOwner && isViewingAs && viewAsRole ? 'role' : 'personal';

  return useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      const sanitizedLayout = sanitizeDashboardLayout(layout);
      const layoutJson = {
        sections: sanitizedLayout.sections,
        sectionOrder: sanitizedLayout.sectionOrder,
        pinnedCards: sanitizedLayout.pinnedCards,
        widgets: sanitizedLayout.widgets,
        hasCompletedSetup: sanitizedLayout.hasCompletedSetup,
        hubOrder: sanitizedLayout.hubOrder,
        enabledHubs: sanitizedLayout.enabledHubs,
      };

      if (writeTarget === 'role') {
        if (!orgId) throw new Error('No organization context');
        if (!user?.id) throw new Error('Not authenticated');
        const { error } = await supabase
          .from('dashboard_role_layouts')
          .upsert(
            {
              organization_id: orgId,
              role: viewAsRole as AppRole,
              layout: layoutJson,
              updated_by: user.id,
            },
            { onConflict: 'organization_id,role' }
          );
        if (error) throw error;
        return;
      }

      const targetId = overrideUserId || godModeTargetUserId;
      if (!targetId) throw new Error('User not authenticated');

      // First check if user preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', targetId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ dashboard_layout: layoutJson })
          .eq('user_id', targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert([{ user_id: targetId, dashboard_layout: layoutJson }]);
        if (error) throw error;
      }
    },
    onMutate: async (layout) => {
      const sanitizedLayout = sanitizeDashboardLayout(layout);
      const layoutJson = {
        sections: sanitizedLayout.sections,
        sectionOrder: sanitizedLayout.sectionOrder,
        pinnedCards: sanitizedLayout.pinnedCards,
        widgets: sanitizedLayout.widgets,
        hasCompletedSetup: sanitizedLayout.hasCompletedSetup,
        hubOrder: sanitizedLayout.hubOrder,
        enabledHubs: sanitizedLayout.enabledHubs,
      };

      if (writeTarget === 'role' && orgId && viewAsRole) {
        const key = ['dashboard-role-layout', orgId, viewAsRole];
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        queryClient.setQueryData(key, { layout: layoutJson, updated_at: new Date().toISOString(), updated_by: user?.id });
        return { previousRoleLayout: previous, key };
      }

      const targetId = overrideUserId || godModeTargetUserId;
      if (!targetId) return;
      await queryClient.cancelQueries({ queryKey: ['user-preferences', targetId] });
      const previousUserPrefs = queryClient.getQueryData(['user-preferences', targetId]);
      queryClient.setQueryData(['user-preferences', targetId], { dashboard_layout: layoutJson });
      return { previousUserPrefs, targetId };
    },
    onSuccess: () => {
      if (writeTarget === 'role' && orgId && viewAsRole) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-role-layout', orgId, viewAsRole] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      }
    },
    onError: (error, _layout, context) => {
      if (context && 'previousRoleLayout' in context && context.key) {
        queryClient.setQueryData(context.key as readonly unknown[], context.previousRoleLayout);
      } else if (context && 'targetId' in context && context.targetId) {
        queryClient.setQueryData(['user-preferences', context.targetId], context.previousUserPrefs);
      }
      toast.error('Failed to save dashboard layout', { description: error.message });
    },
  });
}
export function useUpdateDashboardLayout() {
  const { layout } = useDashboardLayout();
  const saveMutation = useSaveDashboardLayout();

  return useMutation({
    mutationFn: async (updates: Partial<DashboardLayout>) => {
      const newLayout = { ...layout, ...updates };
      await saveMutation.mutateAsync(newLayout);
    },
  });
}

// Reset to role default template
// Reset to role default template.
//
// Three branches:
//
//   1. Owner previewing a role  → DELETE the org-role layout row so the role
//      falls back to the seeded template (instead of freezing the template
//      into dashboard_role_layouts).
//
//   2. Owner on their own canvas → CLEAR the personal dashboard_layout in
//      user_preferences so resolution falls through to the org-role layout
//      (if any) and then the seeded `account_owner` template. This means
//      future template changes propagate automatically — the user does NOT
//      drift away again the moment they "reset".
//
//   3. Non-owners (or impersonation targets) → write the template snapshot
//      to user_preferences (legacy path; non-owners have no template
//      fall-through to lean on).
export function useResetToDefault(overrideUserId?: string) {
  const { user } = useAuth();
  const { targetUserId: godModeTargetUserId } = useGodModeTargetUserId();
  const { roleTemplate } = useDashboardLayout(overrideUserId);
  const saveMutation = useSaveDashboardLayout(overrideUserId);
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { isViewingAs, viewAsRole } = useViewAs();
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();

  const isRoleReset = isPrimaryOwner && isViewingAs && !!viewAsRole && !!orgId;
  const isOwnerSelfReset = isPrimaryOwner && !isViewingAs;

  return useMutation({
    mutationFn: async () => {
      // Branch 1: owner previewing a role → drop the org-role override.
      if (isRoleReset) {
        const { error } = await supabase
          .from('dashboard_role_layouts')
          .delete()
          .eq('organization_id', orgId)
          .eq('role', viewAsRole as AppRole);
        if (error) throw error;
        return;
      }

      // Branch 2: owner on own canvas → wipe personal layout for true
      // fall-through to the live owner template.
      if (isOwnerSelfReset) {
        const targetId = overrideUserId || godModeTargetUserId || user?.id;
        if (!targetId) throw new Error('User not authenticated');
        const { error } = await supabase
          .from('user_preferences')
          .update({ dashboard_layout: null })
          .eq('user_id', targetId);
        if (error) throw error;
        return;
      }

      // Branch 3: legacy fallback — write template snapshot for non-owners
      // (no template fall-through path available).
      if (!roleTemplate?.layout) {
        throw new Error('No default template found');
      }
      await saveMutation.mutateAsync({
        ...roleTemplate.layout,
        hasCompletedSetup: true,
      });
    },
    onSuccess: () => {
      if (isRoleReset && orgId && viewAsRole) {
        queryClient.invalidateQueries({ queryKey: ['dashboard-role-layout', orgId, viewAsRole] });
        toast.success(`Reset ${viewAsRole.replace(/_/g, ' ')} layout to template default`);
        return;
      }
      if (isOwnerSelfReset) {
        const targetId = overrideUserId || godModeTargetUserId || user?.id;
        if (targetId) {
          // Clear cache so resolution re-runs against template immediately.
          queryClient.setQueryData(['user-preferences', targetId], { dashboard_layout: null });
          queryClient.invalidateQueries({ queryKey: ['user-preferences', targetId] });
        }
        toast.success('Dashboard restored to the latest template');
        return;
      }
      toast.success('Dashboard reset to default');
    },
  });
}

// Toggle a section visibility
export function useToggleSection() {
  const { layout } = useDashboardLayout();
  const saveMutation = useSaveDashboardLayout();

  return useMutation({
    mutationFn: async (sectionId: string) => {
      const sections = layout.sections.includes(sectionId)
        ? layout.sections.filter(s => s !== sectionId)
        : [...layout.sections, sectionId];

      await saveMutation.mutateAsync({ ...layout, sections });
    },
  });
}

// Toggle a widget
export function useToggleWidget() {
  const { layout } = useDashboardLayout();
  const saveMutation = useSaveDashboardLayout();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      const widgets = layout.widgets.includes(widgetId)
        ? layout.widgets.filter(w => w !== widgetId)
        : [...layout.widgets, widgetId];

      await saveMutation.mutateAsync({ ...layout, widgets });
    },
  });
}

// ────────────────────────────────────────────────────────────────────────
// OWNER GOVERNANCE: role-keyed layout writes
// ────────────────────────────────────────────────────────────────────────

/**
 * Whether the current user is allowed to author org-wide role layouts
 * (i.e. customize what a given role sees on the dashboard).
 *
 * Owner-controlled governance: only the account owner (is_primary_owner)
 * can customize role layouts. Other admins/managers see, but cannot author.
 */
export function useCanCustomizeDashboardLayouts(): boolean {
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  return !!isPrimaryOwner;
}

/**
 * Save an org-wide layout for a specific role.
 * RLS gates this to is_primary_owner / platform users.
 */
export function useSaveRoleLayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ role, layout }: { role: AppRole; layout: DashboardLayout }) => {
      if (!orgId) throw new Error('No organization context');
      if (!user?.id) throw new Error('Not authenticated');

      const sanitized = sanitizeDashboardLayout(layout);
      const layoutJson = {
        sections: sanitized.sections,
        sectionOrder: sanitized.sectionOrder,
        pinnedCards: sanitized.pinnedCards,
        widgets: sanitized.widgets,
        hasCompletedSetup: true,
        hubOrder: sanitized.hubOrder,
        enabledHubs: sanitized.enabledHubs,
      };

      const { error } = await supabase
        .from('dashboard_role_layouts')
        .upsert(
          {
            organization_id: orgId,
            role,
            layout: layoutJson,
            updated_by: user.id,
          },
          { onConflict: 'organization_id,role' }
        );

      if (error) throw error;
    },
    onSuccess: (_data, { role }) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-role-layout', orgId, role] });
      toast.success(`Saved layout for ${role.replace(/_/g, ' ')}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to save role layout', { description: error.message });
    },
  });
}

/**
 * Delete an org-wide role layout (revert that role to the static template default).
 * RLS gates this to is_primary_owner / platform users.
 */
export function useResetRoleLayout() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (role: AppRole) => {
      if (!orgId) throw new Error('No organization context');

      const { error } = await supabase
        .from('dashboard_role_layouts')
        .delete()
        .eq('organization_id', orgId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: (_data, role) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-role-layout', orgId, role] });
      toast.success(`Reset layout for ${role.replace(/_/g, ' ')} to template default`);
    },
    onError: (error: Error) => {
      toast.error('Failed to reset role layout', { description: error.message });
    },
  });
}

