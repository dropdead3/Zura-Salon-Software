import { useMemo } from 'react';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';

/**
 * Theme Governance — single source of truth for "can this user edit
 * the organization's brand theme?"
 *
 * Per the Theme Governance canon:
 * - Color presets, custom hex tokens, and custom typography are
 *   organization-wide brand identity.
 * - Only the Account Owner (employee_profiles.is_primary_owner = true)
 *   may mutate them. Super Admins may NOT, by design.
 * - Light/dark/system mode is per-user and NOT gated by this hook.
 *
 * Server-side enforcement: a parallel RLS policy on site_settings
 * restricts INSERT/UPDATE/DELETE on the keys
 * `org_color_theme`, `org_custom_theme`, and `org_custom_typography`
 * to is_org_primary_owner. This hook is the client-side mirror used
 * to render disabled/locked UI states.
 */
export function useThemeAuthority() {
  const { data: profile, isLoading } = useEmployeeProfile();

  const canEditOrgTheme = useMemo(
    () => !!profile?.is_primary_owner,
    [profile?.is_primary_owner]
  );

  return {
    canEditOrgTheme,
    isLoading,
  };
}
