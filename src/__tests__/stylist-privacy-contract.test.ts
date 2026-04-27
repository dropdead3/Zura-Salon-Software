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

  it('Phase 2 owner operator primitives are forbidden for stylists', () => {
    expect(STYLIST_FORBIDDEN_SECTIONS.has('today_at_glance')).toBe(true);
    expect(STYLIST_FORBIDDEN_SECTIONS.has('decisions_awaiting')).toBe(true);
    expect(STYLIST_FORBIDDEN_SECTIONS.has('team_pulse')).toBe(true);
    expect(STYLIST_FORBIDDEN_SECTIONS.has('upcoming_events')).toBe(true);
    expect(isStylistAllowedSection('decisions_awaiting')).toBe(false);
    expect(isStylistAllowedSection('today_at_glance')).toBe(false);
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

  describe('empty-goals coach nudge gate', () => {
    const NOW = new Date('2026-04-27T00:00:00Z').getTime();
    const eightDaysAgo = new Date(NOW - 8 * 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString();

    it('shows nudge when account is >7d old and no goals row exists', () => {
      expect(
        shouldShowStylistGoalsNudge({
          accountCreatedAt: eightDaysAgo,
          goals: null,
          now: NOW,
        }),
      ).toBe(true);
    });

    it('shows nudge when goals row exists but both targets are zero', () => {
      expect(
        shouldShowStylistGoalsNudge({
          accountCreatedAt: eightDaysAgo,
          goals: { weekly_target: 0, monthly_target: 0 },
          now: NOW,
        }),
      ).toBe(true);
    });

    it('suppresses nudge when account is <7d old (onboarding silence)', () => {
      expect(
        shouldShowStylistGoalsNudge({
          accountCreatedAt: threeDaysAgo,
          goals: null,
          now: NOW,
        }),
      ).toBe(false);
    });

    it('suppresses nudge when weekly target is set', () => {
      expect(
        shouldShowStylistGoalsNudge({
          accountCreatedAt: eightDaysAgo,
          goals: { weekly_target: 1500, monthly_target: 0 },
          now: NOW,
        }),
      ).toBe(false);
    });

    it('suppresses nudge when monthly target is set', () => {
      expect(
        shouldShowStylistGoalsNudge({
          accountCreatedAt: eightDaysAgo,
          goals: { weekly_target: 0, monthly_target: 6000 },
          now: NOW,
        }),
      ).toBe(false);
    });

    it('suppresses nudge when account-creation timestamp is missing', () => {
      expect(
        shouldShowStylistGoalsNudge({
          accountCreatedAt: null,
          goals: null,
          now: NOW,
        }),
      ).toBe(false);
    });

    it('threshold constant is exactly 7 days', () => {
      expect(STYLIST_GOALS_NUDGE_MIN_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
});
