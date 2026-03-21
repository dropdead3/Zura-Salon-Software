import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { orgDashboardPath } from '@/lib/org-path';

/**
 * Returns a `dashPath(subpath)` function that builds org-scoped dashboard URLs.
 *
 * Resolves the org slug from:
 * 1. URL param `:orgSlug` (primary — enables org switching via URL)
 * 2. `effectiveOrganization.slug` from OrganizationContext (fallback)
 *
 * Usage:
 *   const { dashPath } = useOrgDashboardPath();
 *   <Link to={dashPath('/admin/analytics')} />
 *   navigate(dashPath('/schedule'))
 */
export function useOrgDashboardPath() {
  const { orgSlug: urlSlug } = useParams<{ orgSlug: string }>();
  const { effectiveOrganization } = useOrganizationContext();

  const slug = urlSlug || effectiveOrganization?.slug || '';

  const dashPath = useCallback(
    (subpath: string = '') => {
      if (!slug) {
        // Fallback: return legacy path so links still work during transition
        const clean = subpath.startsWith('/') ? subpath : `/${subpath}`;
        return `/dashboard${clean}`;
      }
      return orgDashboardPath(slug, subpath);
    },
    [slug],
  );

  return { dashPath, orgSlug: slug };
}
