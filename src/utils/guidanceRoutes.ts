/**
 * AI-generated guidance text sometimes produces incorrect dashboard routes.
 * This map corrects known mismatches to actual app routes.
 */
const ROUTE_CORRECTIONS: Record<string, string> = {
  '/dashboard/admin/leaderboard': '/dashboard/leaderboard',
  '/dashboard/admin/stats': '/dashboard/stats',
  '/dashboard/admin/training': '/dashboard/training',
  '/dashboard/admin/schedule': '/dashboard/schedule',
  '/dashboard/admin/team-chat': '/dashboard/team-chat',
  '/dashboard/admin/profile': '/dashboard/profile',
  '/dashboard/admin/my-pay': '/dashboard/my-pay',
  '/dashboard/admin/ring-the-bell': '/dashboard/ring-the-bell',
  '/dashboard/admin/program': '/dashboard/program',
  '/dashboard/admin/onboarding': '/dashboard/onboarding',
  '/dashboard/admin/directory': '/dashboard/directory',
  '/dashboard/admin/clients': '/dashboard/clients',
  '/dashboard/admin/shift-swaps': '/dashboard/shift-swaps',
  '/dashboard/admin/rewards': '/dashboard/rewards',
  '/dashboard/admin/help': '/dashboard/help',
  '/dashboard/admin/assistant-schedule': '/dashboard/assistant-schedule',
  '/dashboard/admin/schedule-meeting': '/dashboard/schedule-meeting',
  '/dashboard/settings': '/dashboard/admin/settings',
  '/dashboard/integrations': '/dashboard/admin/settings',
  '/dashboard/admin/settings/phorest': '/dashboard/admin/phorest',
  '/dashboard/admin/settings/integrations': '/dashboard/admin/settings',
  '/dashboard/admin/settings/day-rates': '/dashboard/admin/day-rate-settings',
};

/**
 * Set of all known valid route prefixes. Used to reject AI-hallucinated routes.
 */
export const VALID_ROUTE_PREFIXES: ReadonlySet<string> = new Set([
  '/dashboard',
  '/dashboard/admin/analytics',
  '/dashboard/admin/kpi-builder',
  
  '/dashboard/admin/decision-history',
  '/dashboard/admin/payroll',
  '/dashboard/admin/team',
  '/dashboard/admin/management',
  '/dashboard/admin/settings',
  '/dashboard/admin/booth-renters',
  '/dashboard/admin/phorest',
  '/dashboard/admin/day-rate-settings',
  '/dashboard/admin/team-hub',
  '/dashboard/admin/client-hub',
  
  '/dashboard/admin/access-hub',
  '/dashboard/admin/feedback',
  '/dashboard/admin/client-health',
  '/dashboard/admin/reengagement',
  '/dashboard/admin/seo-workshop',
  '/dashboard/today-prep',
  '/dashboard/waitlist',
  '/dashboard/appointments-hub',
  '/dashboard/campaigns',
  '/dashboard/leaderboard',
  '/dashboard/clients',
  '/dashboard/schedule',
  '/dashboard/inventory',
  '/dashboard/stats',
  '/dashboard/my-pay',
  '/dashboard/team-chat',
  '/dashboard/training',
  '/dashboard/help',
  '/dashboard/profile',
  '/dashboard/ring-the-bell',
  '/dashboard/program',
  '/dashboard/onboarding',
  '/dashboard/directory',
  '/dashboard/shift-swaps',
  '/dashboard/rewards',
  '/dashboard/assistant-schedule',
  '/dashboard/schedule-meeting',
]);

/**
 * Normalize a route from AI-generated guidance to an actual app route.
 */
export function normalizeGuidanceRoute(href: string): string {
  // Exact match
  if (ROUTE_CORRECTIONS[href]) {
    return ROUTE_CORRECTIONS[href];
  }
  
  // Check if any correction key is a prefix match (for routes with query params/hash)
  for (const [wrong, correct] of Object.entries(ROUTE_CORRECTIONS)) {
    if (href.startsWith(wrong + '?') || href.startsWith(wrong + '#')) {
      return correct + href.slice(wrong.length);
    }
  }
  
  return href;
}

/**
 * Check whether a normalized route matches any known valid route prefix.
 */
export function isValidGuidanceRoute(href: string): boolean {
  const pathOnly = href.split('?')[0].split('#')[0];
  return Array.from(VALID_ROUTE_PREFIXES).some(prefix => pathOnly === prefix || pathOnly.startsWith(prefix + '/'));
}
