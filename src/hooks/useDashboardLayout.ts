import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from './useEffectiveUser';
import { toast } from 'sonner';

export interface DashboardLayout {
  sections: string[];
  sectionOrder: string[];  // All sections in display order (enabled + disabled), includes pinned: prefixed cards
  pinnedCards: string[];   // Tracks which cards are pinned (for visibility)
  widgets: string[];
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

// All available pinnable card IDs for reference
export const PINNABLE_CARD_IDS = [
  'executive_summary',
  'operations_stats',
  'sales_overview',
  'top_performers',
  'revenue_breakdown',
  'client_funnel',
  'client_health',
  'daily_brief',
  'operational_health',
  'locations_rollup',
  'service_mix',
  'retail_effectiveness',
  'rebooking',
  'goal_tracker',
  'new_bookings',
  'week_ahead_forecast',
  'capacity_utilization',
  'hiring_capacity',
  'staffing_trends',
  'stylist_workload',
];

const DEFAULT_LAYOUT: DashboardLayout = {
  sections: ['ai_insights', 'todays_prep', 'hub_quicklinks', 'payroll_deadline', 'payday_countdown', 'active_campaigns', 'quick_actions', 'todays_queue', 'quick_stats', 'schedule_tasks', 'announcements', 'client_engine', 'widgets'],
  sectionOrder: ['ai_insights', 'todays_prep', 'hub_quicklinks', 'payroll_deadline', 'payday_countdown', 'active_campaigns', 'quick_actions', 'todays_queue', 'quick_stats', 'schedule_tasks', 'announcements', 'client_engine', 'widgets'],
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
  let migrated = { ...layout };
  
  // If sectionOrder contains 'command_center', migrate to inline pinned cards
  if (migrated.sectionOrder?.includes('command_center')) {
    const insertIndex = migrated.sectionOrder.indexOf('command_center');
    
    // Remove command_center from sections and sectionOrder
    const newSectionOrder = migrated.sectionOrder.filter(id => id !== 'command_center');
    const newSections = migrated.sections.filter(id => id !== 'command_center');
    
    // Insert pinned cards at the command_center position
    const pinnedEntries = pinnedCards.map(id => toPinnedEntry(id));
    newSectionOrder.splice(insertIndex, 0, ...pinnedEntries);
    
    migrated = { 
      ...migrated, 
      sectionOrder: newSectionOrder, 
      sections: newSections,
      pinnedCards,
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
  
  // Deduplicate sections and sectionOrder to clean up any dirty stored data
  migrated.sections = [...new Set(migrated.sections)];
  migrated.sectionOrder = [...new Set(migrated.sectionOrder)];

  return migrated;
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
export function useDashboardLayout() {
  const { user } = useAuth();
  const roles = useEffectiveRoles();

  const { data: userPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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
  const rawSavedLayout: DashboardLayout | null = parsedLayout ? {
    sections: (parsedLayout.sections as string[]) || [],
    sectionOrder: (parsedLayout.sectionOrder as string[]) || (parsedLayout.sections as string[]) || [],
    pinnedCards: (parsedLayout.pinnedCards as string[]) || [],
    widgets: (parsedLayout.widgets as string[]) || [],
    hasCompletedSetup: (parsedLayout.hasCompletedSetup as boolean) || false,
    hubOrder: (parsedLayout.hubOrder as string[]) || undefined,
    enabledHubs: (parsedLayout.enabledHubs as string[]) || undefined,
  } : null;
  
  const hasCompletedSetup = rawSavedLayout?.hasCompletedSetup ?? false;
  
  // Use saved layout if exists, otherwise use role template, otherwise default
  const baseLayout: DashboardLayout = rawSavedLayout || 
    (roleTemplate?.layout ? { ...roleTemplate.layout, sectionOrder: roleTemplate.layout.sectionOrder || roleTemplate.layout.sections, hasCompletedSetup: false } : DEFAULT_LAYOUT);
  
  // Migrate legacy layouts that use command_center
  const layout = migrateLayout(baseLayout, baseLayout.pinnedCards || []);

  return {
    layout,
    hasCompletedSetup,
    isLoading: prefsLoading || templateLoading,
    roleTemplate,
    templateKey,
    isLeadership,
  };
}

// Save dashboard layout
export function useSaveDashboardLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      if (!user?.id) throw new Error('User not authenticated');

      const layoutJson = {
        sections: layout.sections,
        sectionOrder: layout.sectionOrder,
        pinnedCards: layout.pinnedCards,
        widgets: layout.widgets,
        hasCompletedSetup: layout.hasCompletedSetup,
        hubOrder: layout.hubOrder,
        enabledHubs: layout.enabledHubs,
      };

      // First check if user preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update({ dashboard_layout: layoutJson })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert([{ 
            user_id: user.id, 
            dashboard_layout: layoutJson,
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
    onError: (error) => {
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
export function useResetToDefault() {
  const { roleTemplate } = useDashboardLayout();
  const saveMutation = useSaveDashboardLayout();

  return useMutation({
    mutationFn: async () => {
      if (!roleTemplate?.layout) {
        throw new Error('No default template found');
      }
      
      await saveMutation.mutateAsync({ 
        ...roleTemplate.layout, 
        hasCompletedSetup: true 
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
