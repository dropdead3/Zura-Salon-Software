/**
 * Centralized path builders for the multi-tenant URL hierarchy.
 *
 * Target structure:
 *   /platform/*                    → Zura platform admin
 *   /org/:orgSlug/dashboard/*      → Organization dashboard
 *   /org/:orgSlug/*                → Public org pages
 */

/** Build an org-scoped dashboard path. */
export function orgDashboardPath(orgSlug: string, path: string = '') {
  const base = `/org/${orgSlug}/dashboard`;
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Build a platform admin path. */
export function platformPath(path: string = '') {
  const base = '/platform';
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Build a public org page path (non-dashboard). */
export function orgPublicPath(orgSlug: string, path: string = '') {
  const base = `/org/${orgSlug}`;
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
