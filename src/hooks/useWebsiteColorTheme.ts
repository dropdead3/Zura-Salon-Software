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

import { useQueryClient } from '@tanstack/react-query';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
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

/**
 * Mutates the public-site theme.
 *
 * Performs an optimistic cache write across BOTH the draft and live cache
 * keys (`['site-settings', orgId, SETTING_KEY, 'draft' | 'live']`) so every
 * consumer of `useWebsiteColorTheme` (the picker tile ring, Layout's
 * `themeClass`, the iframe via its own draft refetch) repaints in the same
 * tick the operator clicks — instead of waiting for the network round-trip
 * + react-query invalidation.
 *
 * Without this, the picker UI's `isActive` ring stays stuck on the previous
 * theme until the refetch lands, which made re-clicking the same theme feel
 * like a no-op (the May 2026 "won't go back to Cream Lux" report).
 */
export function useUpdateWebsiteColorTheme() {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId();
  const update = useUpdateSiteSetting<WebsiteColorThemeSetting>();
  return {
    mutateAsync: (theme: ColorTheme) => {
      // Optimistic write across both modes — readers in the editor (draft)
      // and any incidental live readers see the new theme synchronously.
      if (orgId) {
        const value: WebsiteColorThemeSetting = { theme };
        for (const mode of ['draft', 'live'] as const) {
          queryClient.setQueryData(
            ['site-settings', orgId, SETTING_KEY, mode],
            value,
          );
        }
      }
      return update.mutateAsync({ key: SETTING_KEY, value: { theme } });
    },
    isPending: update.isPending,
  };
}

export const WEBSITE_THEME_DEFAULT: ColorTheme = DEFAULT_THEME;
