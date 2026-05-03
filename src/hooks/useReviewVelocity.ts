import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ReviewVelocityStats {
  /** Public review click-throughs in the current window (proxy for new reviews). */
  current: number;
  /** Click-throughs in the prior window of equal length. */
  prior: number;
  /** Per-week rate (current). */
  perWeek: number;
  /** Trend delta vs. prior window: -1..+inf. null when prior=0. */
  delta: number | null;
  /** Per-platform breakdown of current window. */
  byPlatform: Array<{ platform: string; count: number }>;
  /** Whether we have enough signal to publish a number (≥3 in current window). */
  hasSignal: boolean;
}

const MIN_FOR_SIGNAL = 3;

/**
 * Review velocity — public review click-throughs over time, with prior-period
 * comparison and per-platform breakdown. Click-throughs are the closest
 * deterministic proxy for "new public reviews" we can measure server-side
 * (the actual review post happens on Google/Apple/Yelp/Facebook).
 *
 * Visibility-contract: returns hasSignal=false when below MIN_FOR_SIGNAL so
 * the UI can render a "need N more clicks to compute" empty state instead of
 * a misleading 0% trend.
 */
export function useReviewVelocity(daysBack = 30) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['review-velocity', orgId, daysBack],
    queryFn: async (): Promise<ReviewVelocityStats> => {
      const now = Date.now();
      const ms = daysBack * 24 * 60 * 60 * 1000;
      const currentSince = new Date(now - ms).toISOString();
      const priorSince = new Date(now - 2 * ms).toISOString();

      // Wave 5: switched from the legacy `external_review_clicked` boolean
      // proxy on client_feedback_responses to the dedicated event log so we
      // count every click (not just last-write-wins) and can attribute by
      // platform deterministically.
      const { data, error } = await supabase
        .from('review_click_events' as any)
        .select('platform, clicked_at')
        .eq('organization_id', orgId!)
        .gte('clicked_at', priorSince)
        .limit(5000);
      if (error) throw error;

      const rows = ((data ?? []) as unknown) as Array<{
        platform: string | null;
        clicked_at: string | null;
      }>;

      const currentRows = rows.filter(
        (r) => r.clicked_at && r.clicked_at >= currentSince,
      );
      const priorRows = rows.filter(
        (r) =>
          r.clicked_at &&
          r.clicked_at < currentSince &&
          r.clicked_at >= priorSince,
      );

      const current = currentRows.length;
      const prior = priorRows.length;
      const perWeek = current / (daysBack / 7);

      const platformCounts: Record<string, number> = {};
      for (const r of currentRows) {
        const p = (r.platform ?? 'unknown').toLowerCase();
        platformCounts[p] = (platformCounts[p] ?? 0) + 1;
      }
      const byPlatform = Object.entries(platformCounts)
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count);

      return {
        current,
        prior,
        perWeek,
        delta: prior > 0 ? (current - prior) / prior : null,
        byPlatform,
        hasSignal: current >= MIN_FOR_SIGNAL,
      };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
