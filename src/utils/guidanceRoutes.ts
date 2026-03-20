/**
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
 * AI-generated guidance text sometimes produces incorrect dashboard routes.
 * This map corrects known mismatches to actual app routes.
 */
const ROUTE_CORRECTIONS: Record<string, string> = {
  dashPath('/admin/leaderboard'): dashPath('/leaderboard'),
  dashPath('/admin/stats'): dashPath('/stats'),
  dashPath('/admin/training'): dashPath('/training'),
  dashPath('/admin/schedule'): dashPath('/schedule'),
  dashPath('/admin/team-chat'): dashPath('/team-chat'),
  dashPath('/admin/profile'): dashPath('/profile'),
  dashPath('/admin/my-pay'): dashPath('/my-pay'),
  dashPath('/admin/ring-the-bell'): dashPath('/ring-the-bell'),
  dashPath('/admin/program'): dashPath('/program'),
  dashPath('/admin/onboarding'): dashPath('/onboarding'),
  dashPath('/admin/directory'): dashPath('/directory'),
  dashPath('/admin/clients'): dashPath('/clients'),
  dashPath('/admin/shift-swaps'): dashPath('/shift-swaps'),
  dashPath('/admin/rewards'): dashPath('/rewards'),
  dashPath('/admin/help'): dashPath('/help'),
  dashPath('/admin/assistant-schedule'): dashPath('/assistant-schedule'),
  dashPath('/admin/schedule-meeting'): dashPath('/schedule-meeting'),
  dashPath('/settings'): dashPath('/admin/settings'),
  dashPath('/integrations'): dashPath('/admin/settings'),
  dashPath('/admin/settings/phorest'): dashPath('/admin/phorest'),
  dashPath('/admin/settings/integrations'): dashPath('/admin/settings'),
  dashPath('/admin/settings/day-rates'): dashPath('/admin/day-rate-settings'),
};

/**
 * Set of all known valid route prefixes. Used to reject AI-hallucinated routes.
 */
export const VALID_ROUTE_PREFIXES: ReadonlySet<string> = new Set([
  dashPath('/'),
  dashPath('/admin/analytics'),
  dashPath('/admin/kpi-builder'),
  
  dashPath('/admin/decision-history'),
  dashPath('/admin/payroll'),
  dashPath('/admin/team'),
  dashPath('/admin/management'),
  dashPath('/admin/settings'),
  dashPath('/admin/booth-renters'),
  dashPath('/admin/phorest'),
  dashPath('/admin/day-rate-settings'),
  dashPath('/admin/team-hub'),
  dashPath('/admin/client-hub'),
  dashPath('/admin/growth-hub'),
  dashPath('/admin/access-hub'),
  dashPath('/admin/feedback'),
  dashPath('/admin/client-health'),
  dashPath('/admin/reengagement'),
  dashPath('/admin/seo-workshop'),
  dashPath('/today-prep'),
  dashPath('/waitlist'),
  dashPath('/appointments-hub'),
  dashPath('/campaigns'),
  dashPath('/leaderboard'),
  dashPath('/clients'),
  dashPath('/schedule'),
  dashPath('/inventory'),
  dashPath('/stats'),
  dashPath('/my-pay'),
  dashPath('/team-chat'),
  dashPath('/training'),
  dashPath('/help'),
  dashPath('/profile'),
  dashPath('/ring-the-bell'),
  dashPath('/program'),
  dashPath('/onboarding'),
  dashPath('/directory'),
  dashPath('/shift-swaps'),
  dashPath('/rewards'),
  dashPath('/assistant-schedule'),
  dashPath('/schedule-meeting'),
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
