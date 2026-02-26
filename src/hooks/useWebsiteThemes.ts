import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';
import type { ThemeBlueprint, EMPTY_BLUEPRINT } from '@/types/theme-infrastructure';
import { EMPTY_BLUEPRINT as DEFAULT_BLUEPRINT } from '@/types/theme-infrastructure';

// Theme definition from database (expanded schema)
export interface WebsiteTheme {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  color_scheme: string;
  typography_preset: Record<string, string>;
  layout_config: Record<string, string>;
  default_sections: Record<string, unknown>;
  is_builtin: boolean;
  is_available: boolean;
  version: string;
  category: string;
  status: string;
  supported_features: Record<string, boolean>;
  compatibility_rules: Record<string, unknown>;
  blueprint: ThemeBlueprint;
  organization_id: string | null;
  created_at: string;
  updated_at: string | null;
}

// Active theme setting stored in site_settings
export interface ActiveThemeSetting {
  [key: string]: unknown;
  theme_id: string;
  activated_at: string;
  customized: boolean;
}

// Fetch all themes from the website_themes table
export function useWebsiteThemes() {
  return useQuery({
    queryKey: ['website-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_themes')
        .select('*')
        .order('is_available', { ascending: false })
        .order('name');

      if (error) throw error;
      return (data ?? []).map(row => ({
        ...row,
        blueprint: (row.blueprint && typeof row.blueprint === 'object' && Object.keys(row.blueprint as object).length > 0)
          ? row.blueprint as unknown as ThemeBlueprint
          : DEFAULT_BLUEPRINT,
      })) as unknown as WebsiteTheme[];
    },
  });
}

// Read active theme from site_settings
export function useActiveTheme() {
  return useSiteSettings<ActiveThemeSetting>('website_active_theme');
}

// Activate a theme
export function useActivateTheme() {
  const queryClient = useQueryClient();
  const updateSetting = useUpdateSiteSetting<ActiveThemeSetting>();

  return useMutation({
    mutationFn: async (themeId: string) => {
      const value: ActiveThemeSetting = {
        theme_id: themeId,
        activated_at: new Date().toISOString(),
        customized: false,
      };

      await updateSetting.mutateAsync({ key: 'website_active_theme', value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', 'website_active_theme'] });
      queryClient.invalidateQueries({ queryKey: ['website-themes'] });
    },
  });
}

// Fetch a single theme by ID with parsed blueprint
export function useThemeById(themeId: string | undefined) {
  return useQuery({
    queryKey: ['website-theme', themeId],
    enabled: !!themeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_themes')
        .select('*')
        .eq('id', themeId!)
        .single();

      if (error) throw error;
      return {
        ...data,
        blueprint: (data.blueprint && typeof data.blueprint === 'object' && Object.keys(data.blueprint as object).length > 0)
          ? data.blueprint as unknown as ThemeBlueprint
          : DEFAULT_BLUEPRINT,
      } as unknown as WebsiteTheme;
    },
  });
}

// Fetch section type registry
export function useThemeSectionTypes() {
  return useQuery({
    queryKey: ['theme-section-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_section_types')
        .select('*')
        .order('id');

      if (error) throw error;
      return data ?? [];
    },
  });
}
