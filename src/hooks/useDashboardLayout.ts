import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from './useEffectiveUser';
import { useGodModeTargetUserId } from './useGodModeTargetUserId';
import { toast } from 'sonner';

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

function sanitizeDashboardLayout(layout: DashboardLayout): DashboardLayout {
  const pinnedCards = [...new Set((layout.pinnedCards || []).filter((id) => VALID_PINNABLE_CARD_IDS.has(id)))];
  const sectionOrderSource = layout.sectionOrder?.length ? layout.sectionOrder : layout.sections || [];
  const sectionOrder = [...new Set(sectionOrderSource.filter((id) => {
    if (!isPinnedCardEntry(id)) return true;
    return VALID_PINNABLE_CARD_IDS.has(getPinnedCardId(id));
  }))];

  return {
    ...layout,
    sections: [...new Set(layout.sections || [])],
    sectionOrder,
    pinnedCards,
    widgets: [...new Set(layout.widgets || [])],
    widgetOrder: dedupe(layout.widgetOrder),
    hubOrder: dedupe(layout.hubOrder),
    enabledHubs: dedupe(layout.enabledHubs),
  };
}

const DEFAULT_LAYOUT: DashboardLayout = {
  sections: ['operator_top_lever', 'daily_briefing', 'money_left', 'operator_performance', 'team_growth', 'ai_insights', 'todays_prep', 'hub_quicklinks', 'payroll_deadline', 'payday_countdown', 'active_campaigns', 'quick_actions', 'todays_queue', 'quick_stats', 'level_progress', 'graduation_kpi', 'schedule_tasks', 'announcements', 'client_engine', 'widgets'],
  sectionOrder: ['operator_top_lever', 'daily_briefing', 'money_left', 'operator_performance', 'team_growth', 'ai_insights', 'todays_prep', 'hub_quicklinks', 'payroll_deadline', 'payday_countdown', 'active_campaigns', 'quick_actions', 'todays_queue', 'quick_stats', 'level_progress', 'graduation_kpi', 'schedule_tasks', 'announcements', 'client_engine', 'widgets'],
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

  // Ensure hub_quicklinks is added for existing layouts (migration for existing users)
  if (!migrated.sectionOrder?.includes('hub_quicklinks')) {
    migrated = {
      ...migrated,
      sections: ['hub_quicklinks', ...(migrated.sections || [])],
      sectionOrder: ['hub_quicklinks', ...(migrated.sectionOrder || [])],
    };
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
    const insertAfter = migrated.sectionOrder?.indexOf('hub_quicklinks');
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

// Map roles to template role_name
function getRoleTemplateKey(roles: string[], isLeadership: boolean): string {
  if (isLeadership) return 'leadership';
  if (roles.includes('stylist')) return 'stylist';
  if (roles.includes('stylist_assistant')) return 'assistant';
  if (roles.includes('receptionist')) return 'operations';
  return 'stylist'; // Default fallback
}

// Fetch all available templates
export function useDashboardTemplates() {
  return useQuery({
    queryKey: ['dashboard-layout-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_layout_templates')
        .select('*')
        .order('display_name');

      if (error) throw error;

      return (data || []).map(template => ({
        ...template,
        layout: template.layout as unknown as DashboardLayout,
      })) as DashboardTemplate[];
    },
  });
}

// Fetch user's dashboard layout
export function useDashboardLayout(overrideUserId?: string) {
  const roles = useEffectiveRoles();
  const { targetUserId: godModeTargetUserId, isResolvingTarget } = useGodModeTargetUserId();
  const targetUserId = overrideUserId || godModeTargetUserId;

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
    enabled: !!targetUserId,
  });

  // Determine if user is leadership for template selection
  const isLeadership = roles.includes('super_admin') || roles.includes('manager');
  const templateKey = getRoleTemplateKey(roles, isLeadership);

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
    enabled: roles.length > 0,
  });

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

  // Use saved layout if exists, otherwise use role template, otherwise default
  const baseLayout: DashboardLayout = rawSavedLayout ||
    (roleTemplate?.layout ? sanitizeDashboardLayout({ ...roleTemplate.layout, sectionOrder: roleTemplate.layout.sectionOrder || roleTemplate.layout.sections, hasCompletedSetup: false }) : DEFAULT_LAYOUT);

  // Migrate legacy layouts that use command_center
  const layout = migrateLayout(baseLayout, baseLayout.pinnedCards || []);

  return {
    layout,
    hasCompletedSetup,
    isLoading: prefsLoading || templateLoading || (!overrideUserId && isResolvingTarget),
    roleTemplate,
    templateKey,
    isLeadership,
  };
}

// Save dashboard layout
export function useSaveDashboardLayout(overrideUserId?: string) {
  const queryClient = useQueryClient();
  const { targetUserId: godModeTargetUserId } = useGodModeTargetUserId();

  return useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      const targetId = overrideUserId || godModeTargetUserId;
      if (!targetId) throw new Error('User not authenticated');

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

      // First check if user preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', targetId)
        .maybeSingle();

      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update({ dashboard_layout: layoutJson })
          .eq('user_id', targetId);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert([{
            user_id: targetId,
            dashboard_layout: layoutJson,
          }]);

        if (error) throw error;
      }
    },
    onMutate: async (layout) => {
      const targetId = overrideUserId || godModeTargetUserId;
      if (!targetId) return;

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

      await queryClient.cancelQueries({ queryKey: ['user-preferences', targetId] });
      const previousUserPrefs = queryClient.getQueryData(['user-preferences', targetId]);

      queryClient.setQueryData(['user-preferences', targetId], {
        dashboard_layout: layoutJson,
      });

      return { previousUserPrefs, targetId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
    onError: (error, _layout, context) => {
      if (context?.targetId) {
        queryClient.setQueryData(['user-preferences', context.targetId], context.previousUserPrefs);
      }
      toast.error('Failed to save dashboard layout', { description: error.message });
    },
  });
}

// Update specific parts of layout
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

// Complete setup with a specific template
export function useCompleteSetup() {
  const saveMutation = useSaveDashboardLayout();

  return useMutation({
    mutationFn: async (templateLayout?: DashboardLayout) => {
      const layout = templateLayout ?
        { ...templateLayout, hasCompletedSetup: true } :
        { ...DEFAULT_LAYOUT, hasCompletedSetup: true };

      await saveMutation.mutateAsync(layout);
    },
    onSuccess: () => {
      toast.success('Dashboard setup complete!');
    },
  });
}

// Reset to role default template
export function useResetToDefault(overrideUserId?: string) {
  const { roleTemplate } = useDashboardLayout(overrideUserId);
  const saveMutation = useSaveDashboardLayout(overrideUserId);

  return useMutation({
    mutationFn: async () => {
      if (!roleTemplate?.layout) {
        throw new Error('No default template found');
      }

      await saveMutation.mutateAsync({
        ...roleTemplate.layout,
        hasCompletedSetup: true,
      });
    },
    onSuccess: () => {
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
