import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export type LoaderStyleOption = 'luxe' | 'zura' | 'spinner' | 'dots' | 'bar';

export interface PlatformBranding {
  primary_logo_url: string | null;
  secondary_logo_url: string | null;
  icon_dark_url: string | null;
  icon_light_url: string | null;
  login_logo_url: string | null;
  theme_colors: Record<string, string>;
  typography: Record<string, string>;
  loader_style: LoaderStyleOption;
  use_skeleton_loaders: boolean;
}

const DEFAULT_BRANDING: PlatformBranding = {
  primary_logo_url: null,
  secondary_logo_url: null,
  icon_dark_url: null,
  icon_light_url: null,
  login_logo_url: null,
  theme_colors: {},
  typography: {},
  loader_style: 'luxe',
  use_skeleton_loaders: false,
};

// Platform theme color tokens with their defaults (HSL values for violet/slate theme)
export const PLATFORM_THEME_TOKENS = {
  'platform-accent': { label: 'Accent Color', default: '262 83% 58%' }, // violet-500
  'platform-accent-hover': { label: 'Accent Hover', default: '262 83% 48%' }, // violet-600
  'platform-bg': { label: 'Background', default: '222 47% 5%' }, // slate-950
  'platform-bg-elevated': { label: 'Elevated BG', default: '222 47% 8%' }, // slate-900
  'platform-bg-card': { label: 'Card BG', default: '217 33% 17%' }, // slate-800
  'platform-foreground': { label: 'Text', default: '0 0% 100%' }, // white
  'platform-muted': { label: 'Muted Text', default: '215 20% 65%' }, // slate-400
  'platform-border': { label: 'Border', default: '215 25% 27%' }, // slate-700
};

export function usePlatformBranding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['platform-branding'],
    queryFn: async (): Promise<PlatformBranding> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'platform_branding')
        .is('organization_id', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found, return defaults
          return DEFAULT_BRANDING;
        }
        throw error;
      }

      // Parse and validate the branding data
      const value = data?.value as Record<string, unknown> | null;
      if (!value) return DEFAULT_BRANDING;
      
      return {
        primary_logo_url: (value.primary_logo_url as string | null) ?? null,
        secondary_logo_url: (value.secondary_logo_url as string | null) ?? null,
        icon_dark_url: (value.icon_dark_url as string | null) ?? null,
        icon_light_url: (value.icon_light_url as string | null) ?? null,
        login_logo_url: (value.login_logo_url as string | null) ?? null,
        theme_colors: (value.theme_colors as Record<string, string>) ?? {},
        typography: (value.typography as Record<string, string>) ?? {},
        loader_style: (value.loader_style as LoaderStyleOption) ?? 'luxe',
        use_skeleton_loaders: (value.use_skeleton_loaders as boolean) ?? false,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: async (branding: PlatformBranding) => {
      // Cast branding to the expected Json type for Supabase
      const brandingValue = {
        primary_logo_url: branding.primary_logo_url,
        secondary_logo_url: branding.secondary_logo_url,
        icon_dark_url: branding.icon_dark_url,
        icon_light_url: branding.icon_light_url,
        login_logo_url: branding.login_logo_url,
        theme_colors: branding.theme_colors,
        typography: branding.typography,
        loader_style: branding.loader_style,
        use_skeleton_loaders: branding.use_skeleton_loaders,
      };
      
      const { error } = await supabase
        .from('site_settings')
        .update({ value: brandingValue })
        .eq('id', 'platform_branding')
        .is('organization_id', null);

      if (error) throw error;

      return branding;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['platform-branding'], data);
      toast({
        title: 'Branding saved',
        description: 'Platform branding has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving branding',
        description: error instanceof Error ? error.message : 'Failed to save branding settings.',
        variant: 'destructive',
      });
    },
  });

  return {
    branding: query.data || DEFAULT_BRANDING,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    saveBranding: mutation.mutate,
    refetch: query.refetch,
  };
}

// Hook to apply platform branding CSS variables
export function usePlatformBrandingEffect() {
  const { branding } = usePlatformBranding();

  useEffect(() => {
    // Scope platform branding vars to the .platform-theme container
    // so they never leak into org dashboard pages
    const platformRoot = document.querySelector('.platform-theme') as HTMLElement | null;
    const target = platformRoot || document.documentElement;

    if (branding?.theme_colors) {
      Object.entries(branding.theme_colors).forEach(([key, value]) => {
        if (value) {
          target.style.setProperty(`--${key}`, value);
        }
      });
    }

    // Cleanup: remove custom variables when unmounting
    return () => {
      if (branding?.theme_colors) {
        Object.keys(branding.theme_colors).forEach((key) => {
          target.style.removeProperty(`--${key}`);
        });
      }
    };
  }, [branding?.theme_colors]);
}
