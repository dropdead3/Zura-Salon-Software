/**
 * Stylist Privacy Contract — section allowlist enforcement.
 *
 * Per `mem://architecture/stylist-privacy-contract`, stylist-role dashboard
 * layouts may only render self-scoped sections. Org-wide financials, peer
 * rosters, governance surfaces, and manager KPIs are forbidden.
 *
 * This module is the runtime enforcement anchor #1 (section registry gate)
 * and the seed-time enforcement anchor #5 (template allowlist).
 */

/**
 * Sections that may render when the effective viewer is stylist-only
 * (no manager/admin/owner/bookkeeper roles).
 *
 * NOTE: keep this in sync with the contract memory. Adding a section here
 * is a privacy decision and must be deliberate.
 */
export const STYLIST_ALLOWED_SECTIONS = new Set<string>([
  'daily_briefing',      // role-aware: 'stylist' context only
  'todays_prep',          // their day, their clients
  'personal_goals',       // their own targets (Phase 3.2)
  'my_performance',       // own revenue/retail trajectory (Phase 3.2)
  'level_progress',       // their own level
  'client_engine',        // their own 75-day enrollment
  'push_list',            // their own retail push list
  'schedule_tasks',       // their own tasks
  'announcements',        // role-filtered by RLS
  'seo_my_tasks',         // their own SEO assignments
  'widgets',              // schedule/birthdays/changelog only — no peer perf
]);

/**
 * Sections that are explicitly forbidden when viewer is stylist-only.
 * Maintained for dev-time clarity and audit logging — runtime gate uses the
 * allowlist as the source of truth (deny by default).
 */
export const STYLIST_FORBIDDEN_SECTIONS = new Set<string>([
  'team_dashboards',      // owner governance
  'hub_quicklinks',       // operations hubs (manager+)
  'todays_queue',         // front-desk org queue
  'graduation_kpi',       // org-wide team progression
  'active_campaigns',     // org marketing
  'inventory_manager',    // location inventory governance
  'payroll_deadline',     // org payroll
  'payday_countdown',     // own paycheck OK in principle, but currently org-shaped — re-add if/when scoped
  'ai_insights',          // owner/manager intelligence
  'quick_stats',          // org-week-revenue leak — re-add as 'my_quick_stats' when self-scoped
]);

/**
 * Pinned analytics card IDs that are always forbidden in stylist scope —
 * even if an owner accidentally pins one into the stylist template.
 *
 * This is a defense-in-depth backstop; the section registry already drops
 * `pinned:*` entries when isLeadership is false, but enterprise overrides
 * of that gate must NOT bypass this set.
 */
export const STYLIST_FORBIDDEN_PINNED_CARDS = new Set<string>([
  'executive_summary',
  'sales_overview',
  'revenue_breakdown',
  'top_performers',
  'capacity_utilization',
  'commission_summary',
  'staff_commission_breakdown',
  'true_profit',
  'service_profitability',
  'locations_rollup',
  'operational_health',
  'stylist_workload',
]);

/**
 * Returns true when the section is renderable in stylist-only scope.
 * Logs suppressions to the visibility-contract bus in dev.
 */
export function isStylistAllowedSection(sectionId: string): boolean {
  const allowed = STYLIST_ALLOWED_SECTIONS.has(sectionId);
  if (!allowed && import.meta.env.DEV) {
    // Lightweight dev log; intentionally no production logging to honor
    // alert-fatigue doctrine. Reason follows kebab-case taxonomy.
    // eslint-disable-next-line no-console
    console.debug(
      `[visibility-contract] suppressed section="${sectionId}" reason="stylist-privacy-contract"`,
    );
  }
  return allowed;
}

/**
 * Helper for the layout renderer. Returns true if the effective viewer is
 * subject to the Stylist Privacy Contract (stylist-only, no elevated role).
 */
export function isStylistOnlyViewer(roles: string[]): boolean {
  const elevated = ['super_admin', 'admin', 'manager', 'bookkeeper', 'receptionist'];
  if (roles.some((r) => elevated.includes(r))) return false;
  // Must have at least one stylist-family role to qualify.
  return roles.some((r) =>
    ['stylist', 'stylist_assistant', 'assistant', 'booth_renter'].includes(r),
  );
}
