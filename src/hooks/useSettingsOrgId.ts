import { useContext } from 'react';
import { OrganizationContext } from '@/contexts/OrganizationContext';
import { PublicOrgContext } from '@/contexts/PublicOrgContext';

/**
 * Resolves the current organization ID for site_settings queries.
 *
 * HOOK-SAFETY CANON (HARD RULE):
 *   This hook MUST contain EXACTLY two hook calls (`useContext` x2) and
 *   nothing else. No `useEffect`, no `useRef`, no `useState`, no
 *   conditionals, no early returns above hook calls.
 *
 *   Why: this hook is consumed by `useSiteSettings`, `useColorTheme`,
 *   `useUpdateSiteSetting`, and downstream by `RevenueDisplayProvider` and
 *   `DashboardLayout`. Any hook-count change here triggers Fast Refresh
 *   (HMR) hook-slot drift in already-mounted fibers, which surfaces as
 *   "Should have a queue. This is likely a bug in React." inside `useState`
 *   → `useBaseQuery` → `useQuery` → `useSiteSettings` → `RevenueDisplayProvider`.
 *
 *   That crash prevents `DashboardLayout` (and therefore `useColorTheme`)
 *   from ever mounting, leaving `<html>` stuck on whatever class the
 *   pre-paint script applied (typically `theme-bone`). The visible bug is
 *   "the dashboard renders bone no matter which theme is selected".
 *
 *   Logging that wants to observe org-source transitions MUST live OUTSIDE
 *   this file (see `ThemeIntegrityHud` for the dev-only inspector).
 *
 * Resolution priority:
 *   1. Explicit override (if provided)
 *   2. Dashboard context (effectiveOrganization from OrganizationContext)
 *   3. Public site context (organization from PublicOrgContext)
 *   4. undefined (caller's query should be disabled)
 */
export function useSettingsOrgId(explicitOrgId?: string): string | undefined {
  const orgCtx = useContext(OrganizationContext);
  const publicOrgCtx = useContext(PublicOrgContext);

  return (
    explicitOrgId ??
    orgCtx?.effectiveOrganization?.id ??
    publicOrgCtx?.organization?.id ??
    undefined
  );
}
