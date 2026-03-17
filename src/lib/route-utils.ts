/**
 * Route boundary detection utilities.
 * Single source of truth for platform vs org dashboard route logic.
 */

/** Returns true when the path is an org-dashboard route (not platform). */
export function isOrgDashboardRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/platform');
}

/** Returns true when the path is a platform route. */
export function isPlatformRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard/platform');
}

/** Returns true when the path is a public (non-dashboard) route. */
export function isPublicRoute(pathname: string): boolean {
  return !pathname.startsWith('/dashboard');
}
