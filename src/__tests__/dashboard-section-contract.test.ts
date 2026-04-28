/**
 * Dashboard Section Contract — author-time invariant.
 *
 * Doctrine: every toggle in the Customize menu must have a render branch in
 * `DashboardHome.sectionComponents`, and every render key must be reachable
 * from a toggle. Drift here means a user enables a section and nothing
 * appears (the exact bug that motivated this test for Drop Dead Salons /
 * `payroll_deadline`).
 *
 * Five-part canon pattern (mem://architecture/canon-pattern):
 *   1. invariant — this file
 *   2. Vitest enforcement — this file
 *   3. (no Stylelint — not a styling concern)
 *   4. CI — runs in `lovable-exec test` / vitest CI job
 *   5. override — none; violations must be fixed at source
 */

import { describe, expect, it } from 'vitest';
import { SECTION_COMPONENT_IDS } from '@/pages/dashboard/DashboardHome';
import { ANALYTICS_SECTION_ID, RETIRED_SECTION_IDS } from '@/hooks/useDashboardLayout';

// Mirror of toggle IDs in `getSections()` (DashboardCustomizeMenu.tsx).
// Kept in sync manually — when you add/remove a toggle, update this list.
// The contract is enforced both directions below.
const CUSTOMIZE_MENU_SECTION_IDS = [
  'daily_briefing',
  'quick_actions',
  'todays_queue',
  'quick_stats',
  'todays_prep',
  'level_progress',
  'graduation_kpi',
  ANALYTICS_SECTION_ID,
  'active_campaigns',
  'payroll_deadline',
  'payday_countdown',
  'schedule_tasks',
  'client_engine',
  'widgets',
] as const;

describe('Dashboard section toggle ↔ render contract', () => {
  it('every customize-menu toggle has a render branch (or is the analytics virtual marker)', () => {
    const renderable = new Set<string>(SECTION_COMPONENT_IDS);
    const missing = CUSTOMIZE_MENU_SECTION_IDS.filter((id) => {
      if (id === ANALYTICS_SECTION_ID) return false; // special-cased in DashboardHome
      return !renderable.has(id);
    });
    expect(
      missing,
      `Toggles without a render branch in DashboardHome.sectionComponents: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('no toggle ID is in the retired registry (would be auto-stripped from layouts)', () => {
    const retired = CUSTOMIZE_MENU_SECTION_IDS.filter((id) => RETIRED_SECTION_IDS.has(id));
    expect(
      retired,
      `Toggles whose IDs are also in RETIRED_SECTION_IDS — they will be stripped from saved layouts and never persist: ${retired.join(', ')}`,
    ).toEqual([]);
  });

  it('every render branch has a toggle (no orphan render keys)', () => {
    // Sub-sections rendered inside other sections (not user-toggleable).
    // These intentionally have no Customize menu entry.
    const INTERNALLY_RENDERED = new Set<string>([
      'ai_insights',          // moved to header drawer
      'hub_quicklinks',       // retired (kept as null no-op for legacy layouts)
      'decisions_awaiting',   // owner primitive — auto-suppressed when empty
      'team_pulse',           // owner primitive — auto-suppressed
      'upcoming_events',      // owner primitive — auto-suppressed
      'my_quick_stats',       // stylist privacy contract — template-only
      'personal_goals',       // stylist privacy contract — template-only
      'my_performance',       // stylist privacy contract — template-only
      'push_list',            // stylist privacy contract — template-only
      'inventory_manager',    // role-template-driven
      'seo_my_tasks',         // role-template-driven
    ]);

    const togglable = new Set<string>(CUSTOMIZE_MENU_SECTION_IDS);
    const orphans = SECTION_COMPONENT_IDS.filter(
      (id) => !togglable.has(id) && !INTERNALLY_RENDERED.has(id),
    );
    expect(
      orphans,
      `Render branches with no Customize toggle and not in the internally-rendered allowlist: ${orphans.join(', ')}`,
    ).toEqual([]);
  });
});
