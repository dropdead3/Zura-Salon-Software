import { useContext } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PublicOrgContext } from '@/contexts/PublicOrgContext';

/**
 * Resolves the current organization ID for site_settings queries.
 * 
 * Priority:
 * 1. Explicit override (if provided)
 * 2. Dashboard context (effectiveOrganization from OrganizationContext)
 * 3. Public site context (organization from PublicOrgContext)
 * 
 * Returns undefined when no org is available (query should be disabled).
 */
export function useSettingsOrgId(explicitOrgId?: string): string | undefined {
  if (explicitOrgId) return explicitOrgId;

  const orgCtx = useOrganizationContext();
  if (orgCtx.effectiveOrganization?.id) {
    return orgCtx.effectiveOrganization.id;
  }

  // Fall back to PublicOrgContext (for /org/:slug routes with anonymous visitors)
  const publicOrgCtx = useContext(PublicOrgContext);
  if (publicOrgCtx?.organization?.id) {
    return publicOrgCtx.organization.id;
  }

  return undefined;
}
