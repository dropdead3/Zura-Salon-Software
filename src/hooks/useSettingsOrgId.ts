import { useContext, useEffect, useRef } from 'react';
import { OrganizationContext } from '@/contexts/OrganizationContext';
import { PublicOrgContext } from '@/contexts/PublicOrgContext';

/**
 * Resolves the current organization ID for site_settings queries.
 *
 * HOOK-SAFETY CANON:
 *   This hook MUST call the same hooks in the same order on every render,
 *   regardless of whether an explicit org ID is passed or which provider is
 *   mounted. A previous version early-returned before reading contexts and
 *   conditionally called `useContext(PublicOrgContext)` only when no
 *   dashboard org existed. That branched the hook call graph by context
 *   availability and corrupted React's hook state during org transitions
 *   (visible as "Should have a queue" errors in DashboardLayoutInner and as
 *   theme palettes failing to commit after a picker click).
 *
 *   Rules:
 *     1. Call `useContext(OrganizationContext)` unconditionally.
 *     2. Call `useContext(PublicOrgContext)` unconditionally.
 *     3. Resolve priority AFTER all hooks have fired.
 *     4. Never throw from missing providers — return undefined instead.
 *
 * Resolution priority:
 *   1. Explicit override (if provided)
 *   2. Dashboard context (effectiveOrganization from OrganizationContext)
 *   3. Public site context (organization from PublicOrgContext)
 *   4. undefined (caller's query should be disabled)
 */
export function useSettingsOrgId(explicitOrgId?: string): string | undefined {
  // Always-on hook calls — no conditionals, no early returns above this point.
  const orgCtx = useContext(OrganizationContext);
  const publicOrgCtx = useContext(PublicOrgContext);

  // Resolve after all hooks have fired.
  const resolved =
    explicitOrgId ??
    orgCtx?.effectiveOrganization?.id ??
    publicOrgCtx?.organization?.id ??
    undefined;

  // Dev-only org-source transition logger. Helps diagnose resolver-related
  // theme drift (God Mode switches, route transitions between public and
  // dashboard surfaces, etc.) without manual instrumentation.
  const lastSourceRef = useRef<string | null>(null);
  const lastOrgIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (typeof import.meta === 'undefined') return;
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (!env?.DEV) return;

    const source: string = explicitOrgId
      ? 'explicit'
      : orgCtx?.effectiveOrganization?.id
        ? 'dashboard'
        : publicOrgCtx?.organization?.id
          ? 'public'
          : 'none';

    const prevSource = lastSourceRef.current;
    const prevOrgId = lastOrgIdRef.current;

    if (prevSource !== null && (prevSource !== source || prevOrgId !== resolved)) {
      // eslint-disable-next-line no-console
      console.debug('[org-resolver]', {
        from: { source: prevSource, orgId: prevOrgId },
        to: { source, orgId: resolved },
      });
    }

    lastSourceRef.current = source;
    lastOrgIdRef.current = resolved;
  }, [
    explicitOrgId,
    orgCtx?.effectiveOrganization?.id,
    publicOrgCtx?.organization?.id,
    resolved,
  ]);

  return resolved;
}
