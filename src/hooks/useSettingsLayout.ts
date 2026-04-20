import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Default icon colors for each category
export const DEFAULT_ICON_COLORS: Record<string, string> = {
  'account-billing': '#10B981',
  'my-profile': '#8B5CF6',
  business: '#D946EF',
  email: '#8B5CF6',
  sms: '#22C55E',
  'service-flows': '#A855F7',
  users: '#3B82F6',
  onboarding: '#F97316',
  integrations: '#10B981',
  system: '#6B7280',
  program: '#EC4899',
  levels: '#14B8A6',
  
  schedule: '#0EA5E9',
  locations: '#EF4444',
  dayrate: '#F97316',
  forms: '#0EA5E9',
  loyalty: '#F59E0B',
  feedback: '#10B981',
  'access-hub': '#8B5CF6',
  leaderboard: '#EAB308',
  'team-rewards': '#F59E0B',
  kiosk: '#8B5CF6',
  services: '#14B8A6',
  'retail-products': '#F97316',
  'zura-config': '#A855F7',
  'terminals': '#0EA5E9',
  handbooks: '#8B5CF6',
};

// Section groups for organized layout
export const SECTION_GROUPS = [
  {
    id: 'account',
    label: 'Account',
    categories: ['account-billing'],
  },
  {
    id: 'governance',
    label: 'Governance',
    categories: ['policies', 'handbooks'],
  },
  {
    id: 'operations',
    label: 'Business Operations',
    categories: ['my-profile', 'business', 'locations', 'services', 'retail-products', 'schedule', 'kiosk', 'terminals', 'dayrate', 'forms', 'levels', 'leaderboard', 'onboarding', 'loyalty', 'team-rewards', 'feedback'],
  },
  {
    id: 'team',
    label: 'Access & Visibility',
    categories: ['users', 'access-hub'],
  },
  {
    id: 'custom-programs',
    label: 'Custom Programs',
    categories: ['program'],
  },
  {
    id: 'platform',
    label: 'Platform',
    categories: ['system', 'integrations', 'data-import', 'zura-config'],
  },
  {
    id: 'communications',
    label: 'Communications',
    categories: ['email', 'sms', 'service-flows'],
  },
];

// Default order (derived from section groups)
export const DEFAULT_ORDER = SECTION_GROUPS.flatMap(section => section.categories);

interface SettingsLayoutPreferences {
  order: string[];
  iconColors: Record<string, string>;
}

export function useSettingsLayout() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['settings-layout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('settings_layout')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings layout:', error);
      }

      // Return stored preferences or defaults
      const stored = data?.settings_layout as unknown as SettingsLayoutPreferences | null;
      
      // Merge stored order with defaults to include any new categories
      let order = stored?.order || DEFAULT_ORDER;
      // Add any new categories from DEFAULT_ORDER that aren't in stored order
      const missingCategories = DEFAULT_ORDER.filter(cat => !order.includes(cat));
      if (missingCategories.length > 0) {
        order = [...missingCategories, ...order];
      }
      
      return {
        order,
        iconColors: { ...DEFAULT_ICON_COLORS, ...(stored?.iconColors || {}) },
      };
    },
    enabled: !!user?.id,
  });
}

export function useUpdateSettingsLayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (preferences: SettingsLayoutPreferences) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ settings_layout: preferences as any })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, settings_layout: preferences as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-layout', user?.id] });
    },
  });
}
