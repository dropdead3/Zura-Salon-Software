/**
 * Route boundary detection utilities.
 * Single source of truth for platform vs org dashboard route logic.
 *
 * URL hierarchy (post-restructure):
 *   /platform/*                    → Zura platform admin
 *   /org/:orgSlug/dashboard/*      → Organization dashboard
 *   /org/:orgSlug/*                → Public org pages
 *   /dashboard/*                   → Legacy (redirected)
 */

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

export type RouteZone = 'platform' | 'org-dashboard' | 'public';

// Regex: /org/<slug>/dashboard
const ORG_DASHBOARD_RE = /^\/org\/[^/]+\/dashboard(\/|$)/;
// Regex: /org/<slug> (but NOT /org/<slug>/dashboard)
const ORG_PUBLIC_RE = /^\/org\/[^/]+(\/|$)/;

/** Determine the route zone from a pathname string. */
export function getRouteZone(pathname: string): RouteZone {
  // New canonical paths
  if (pathname.startsWith('/platform')) return 'platform';
  if (ORG_DASHBOARD_RE.test(pathname)) return 'org-dashboard';

  // Legacy paths (still active during migration / redirects)
  if (pathname.startsWith('/dashboard/platform')) return 'platform';
  if (pathname.startsWith('/dashboard')) return 'org-dashboard';

  return 'public';
}

/** React hook returning the current route zone, reactive to navigation. */
export function useRouteZone(): RouteZone {
  const location = useLocation();
  return useMemo(() => getRouteZone(location.pathname), [location.pathname]);
}

/** Returns true when the path is an org-dashboard route (not platform). */
export function isOrgDashboardRoute(pathname: string): boolean {
  return getRouteZone(pathname) === 'org-dashboard';
}

/** Returns true when the path is a platform route. */
export function isPlatformRoute(pathname: string): boolean {
  return getRouteZone(pathname) === 'platform';
}

/** Returns true when the path is a public (non-dashboard) route. */
export function isPublicRoute(pathname: string): boolean {
  return getRouteZone(pathname) === 'public';
}
