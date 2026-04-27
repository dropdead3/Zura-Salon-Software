import { describe, it, expect } from 'vitest';
import {
  STYLIST_ALLOWED_SECTIONS,
  STYLIST_FORBIDDEN_SECTIONS,
  STYLIST_FORBIDDEN_PINNED_CARDS,
  isStylistAllowedSection,
  isStylistOnlyViewer,
} from '@/lib/dashboard/stylistPrivacy';
import {
  shouldShowStylistGoalsNudge,
  STYLIST_GOALS_NUDGE_MIN_AGE_MS,
} from '@/hooks/useStylistGoalsNudge';

describe('Stylist Privacy Contract', () => {
  it('allowlist and forbidden list must not overlap', () => {
    const overlap = [...STYLIST_ALLOWED_SECTIONS].filter((s) =>
      STYLIST_FORBIDDEN_SECTIONS.has(s),
    );
    expect(overlap).toEqual([]);
  });

  it('forbidden financial pinned cards include all known revenue surfaces', () => {
    // Sanity guard — if we add a new revenue card, it must be added here too.
    const mustBeForbidden = [
      'sales_overview',
      'revenue_breakdown',
      'commission_summary',
      'true_profit',
      'service_profitability',
    ];
    for (const id of mustBeForbidden) {
      expect(STYLIST_FORBIDDEN_PINNED_CARDS.has(id)).toBe(true);
    }
  });

  it('isStylistAllowedSection silently drops forbidden sections', () => {
    expect(isStylistAllowedSection('todays_prep')).toBe(true);
    expect(isStylistAllowedSection('team_dashboards')).toBe(false);
    expect(isStylistAllowedSection('quick_stats')).toBe(false);
    expect(isStylistAllowedSection('hub_quicklinks')).toBe(false);
  });

  it('Phase 3.2 self-scoped sections are allowed', () => {
    expect(isStylistAllowedSection('my_quick_stats')).toBe(true);
    expect(isStylistAllowedSection('personal_goals')).toBe(true);
    expect(isStylistAllowedSection('my_performance')).toBe(true);
  });

  describe('isStylistOnlyViewer', () => {
    it('treats pure stylist as stylist-only', () => {
      expect(isStylistOnlyViewer(['stylist'])).toBe(true);
      expect(isStylistOnlyViewer(['stylist_assistant'])).toBe(true);
      expect(isStylistOnlyViewer(['booth_renter'])).toBe(true);
    });

    it('elevated roles bypass the contract (they see their own layouts)', () => {
      expect(isStylistOnlyViewer(['stylist', 'manager'])).toBe(false);
      expect(isStylistOnlyViewer(['admin'])).toBe(false);
      expect(isStylistOnlyViewer(['super_admin'])).toBe(false);
      expect(isStylistOnlyViewer(['bookkeeper'])).toBe(false);
      expect(isStylistOnlyViewer(['receptionist'])).toBe(false);
    });

    it('non-stylist non-elevated viewers are not subject to the contract', () => {
      // E.g. a future role with no stylist family — contract doesn't apply.
      expect(isStylistOnlyViewer([])).toBe(false);
      expect(isStylistOnlyViewer(['unknown_role'])).toBe(false);
    });
  });
});
