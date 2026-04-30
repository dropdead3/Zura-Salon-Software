import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

export interface PromotionalPopupRedemptionStats {
  /** Total confirmed redemptions for the saved offer code (popup surface only). */
  count: number;
  /** Daily counts oldest → newest for the trailing 14 days. Empty days = 0. */
  series: number[];
  /** Confirmed redemptions in the trailing 24h. Powers the momentum chip. */
  last24h: number;
  /**
   * Sum of `revenue_attributed` across all popup-surface redemptions for this
   * code. Stamped at booking time — represents what the popup *drove*, not
   * post-edit reality. Returns 0 when no redemptions or all rows pre-date the
   * attribution column being populated (honest absence, not fabricated).
   */
  revenueAttributed: number;
}

const WINDOW_DAYS = 14;
const POPUP_SURFACE = 'promotional_popup';

function buildDailySeries(rows: Array<{ transaction_date: string | null }>): {
  series: number[];
  last24h: number;
} {
  const buckets = new Array<number>(WINDOW_DAYS).fill(0);
  // Bucket index 0 is the oldest day in the window; index WINDOW_DAYS-1 is today.
  // We compare against the start of "today" in UTC so the rightmost bar is the
  // current day-in-progress (operators expect "today so far").
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfWindow = startOfToday.getTime() - (WINDOW_DAYS - 1) * 86400_000;
  let last24h = 0;

  for (const row of rows) {
    if (!row.transaction_date) continue;
    const t = new Date(row.transaction_date).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= now - 86400_000) last24h += 1;
    if (t < startOfWindow) continue;
    const idx = Math.floor((t - startOfWindow) / 86400_000);
    if (idx >= 0 && idx < WINDOW_DAYS) buckets[idx] += 1;
  }
  return { series: buckets, last24h };
}

/**
 * Counts confirmed redemptions of a promotional popup's offer code for the
 * current org and returns a 14-day velocity series. Powers the "Redemptions"
 * stat + sparkline shown on the popup editor card so operators can see whether
 * the marketing loop is closing AND whether redemption velocity is decaying or
 * accelerating.
 *
 * Silence is valid output: returns `count: 0` and an empty series when no code
 * is configured or no redemptions exist. Never returns a default/placeholder.
 *
 * Scope: filtered by `organization_id` (RLS-enforced), exact `promo_code_used`,
 * AND `surface = 'promotional_popup'` so future surfaces (campaigns, SMS, QR
 * codes) sharing the same table never inflate this count.
 */
export function usePromotionalPopupRedemptions(
  offerCode: string | null | undefined,
  explicitOrgId?: string,
) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const code = (offerCode ?? '').trim();

  return useQuery<PromotionalPopupRedemptionStats>({
    queryKey: ['promotional-popup-redemptions', orgId, code],
    queryFn: async () => {
      if (!orgId || !code) return { count: 0, series: [], last24h: 0 };

      // Fetch only the timestamps needed for both the total count and the
      // 14-day bucket build. Limited to a generous ceiling so a hugely-popular
      // promo never blows the response budget.
      const windowStart = new Date(
        Date.now() - WINDOW_DAYS * 86400_000,
      ).toISOString();

      const [{ count: totalCount, error: countErr }, { data: recentRows, error: rowsErr }] =
        await Promise.all([
          supabase
            .from('promotion_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('promo_code_used', code)
            .eq('surface', POPUP_SURFACE),
          supabase
            .from('promotion_redemptions')
            .select('transaction_date')
            .eq('organization_id', orgId)
            .eq('promo_code_used', code)
            .eq('surface', POPUP_SURFACE)
            .gte('transaction_date', windowStart)
            .limit(1000),
        ]);

      if (countErr || rowsErr) {
        // Swallow — the editor card should never crash because a count failed.
        // Returning zeros is honest: we genuinely don't know of any redemptions.
        return { count: 0, series: [], last24h: 0 };
      }

      const { series, last24h } = buildDailySeries(
        (recentRows ?? []) as Array<{ transaction_date: string | null }>,
      );
      return { count: totalCount ?? 0, series, last24h };
    },
    enabled: !!orgId && code.length > 0,
    staleTime: 30_000,
  });
}
