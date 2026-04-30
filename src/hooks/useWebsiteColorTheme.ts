/**
 * useWebsiteColorTheme
 *
 * Public-site visual theme. Distinct from `useColorTheme` (which paints the
 * dashboard) — site visitors should never inherit whatever dashboard theme
 * the operator happens to be using, and operators should be able to pick a
 * different look for their public site.
 *
 * Storage: site_settings row keyed `website_active_color_theme`. Read via
 * useSiteSettings (organization-scoped). Mutation goes through the standard
 * read-then-update/insert path enforced by useUpdateSiteSetting.
 *
 * Resolved value: any of the 12 canonical `ColorTheme` keys, defaulting to
 * 'cream-lux' (the historical hardcode in `Layout.tsx`).
 */

import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import type { ColorTheme } from '@/hooks/useColorTheme';

const SETTING_KEY = 'website_active_color_theme';
const DEFAULT_THEME: ColorTheme = 'cream-lux';

type WebsiteColorThemeSetting = {
  theme: ColorTheme;
};

export function useWebsiteColorTheme(): {
  theme: ColorTheme;
  isLoading: boolean;
} {
  const { data, isLoading } = useSiteSettings<WebsiteColorThemeSetting>(SETTING_KEY);
  return {
    theme: data?.theme ?? DEFAULT_THEME,
    isLoading,
  };
}

export function useUpdateWebsiteColorTheme() {
  const update = useUpdateSiteSetting<WebsiteColorThemeSetting>();
  return {
    mutateAsync: (theme: ColorTheme) =>
      update.mutateAsync({ key: SETTING_KEY, value: { theme } }),
    isPending: update.isPending,
  };
}

export const WEBSITE_THEME_DEFAULT: ColorTheme = DEFAULT_THEME;
