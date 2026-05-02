import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

/**
 * End-to-end funnel for a single promotional popup offer code.
 *
 * Joins three independent signals into one rollup so operators can answer
 * "is the popup actually working?" with the same numbers across the editor
 * card and the org-wide marketing analytics page:
 *
 *   1. **Impressions** — `promo_offer_impressions` (popup rendered to a
 *      visitor; deduped per session at the DB level).
 *   2. **Responses** — `promo_offer_responses`:
 *        - `accepted`  → CTA clicked (the lever we're optimizing)
 *        - `declined`  → "No thanks" pressed
 *        - `soft`      → X-closed
 *   3. **Redemptions** — `promotion_redemptions` filtered to
 *      `surface = 'promotional_popup'` and matching `promo_code_used`.
 *
 * Materiality threshold (`MIN_IMPRESSIONS_FOR_RATES`) gates rate metrics
 * (CTR, redemption rate) until the sample is large enough to be
 * non-noisy — matches the visibility-contracts canon: silence is valid
 * output. Below threshold the card surfaces raw counts only.
 */

const POPUP_SURFACE = 'promotional_popup';
export const MIN_IMPRESSIONS_FOR_RATES = 100;

export interface PromotionalPopupTrendPoint {
  /** YYYY-MM-DD (UTC). */
  date: string;
  impressions: number;
  ctaClicks: number;
  dismissals: number;
  redemptions: number;
  revenue: number;
}

export interface PromotionalPopupFunnel {
  impressions: number;
  ctaClicks: number; // 'accepted' responses
  dismissals: number; // 'declined' + 'soft'
  redemptions: number;
  revenueAttributed: number;
  /** CTR = ctaClicks / impressions. `null` until materiality threshold met. */
  ctr: number | null;
  /** Redemption rate = redemptions / impressions. `null` until threshold met. */
  redemptionRate: number | null;
  /** Conversion of CTA → actual booking. `null` when ctaClicks === 0. */
  bookingRate: number | null;
  hasSufficientData: boolean;
  windowDays: number;
  firstImpressionAt: string | null;
  firstResponseAt: string | null;
  /** 14-day daily trend (oldest → newest). Always returned so tiles can
   *  render a sparkline fallback even when the area chart is empty. */
  trend: PromotionalPopupTrendPoint[];
}

const TREND_WINDOW_DAYS = 14;

function utcDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildTrendBuckets(
  impressionDates: string[],
  ctaDates: string[],
  dismissalDates: string[],
  redemptions: Array<{ date: string; revenue: number }>,
): PromotionalPopupTrendPoint[] {
  const buckets = new Map<string, PromotionalPopupTrendPoint>();
  const today = new Date();
  for (let i = TREND_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      impressions: 0,
      ctaClicks: 0,
      dismissals: 0,
      redemptions: 0,
      revenue: 0,
    });
  }
  for (const iso of impressionDates) {
    const b = buckets.get(utcDateKey(iso));
    if (b) b.impressions += 1;
  }
  for (const iso of ctaDates) {
    const b = buckets.get(utcDateKey(iso));
    if (b) b.ctaClicks += 1;
  }
  for (const iso of dismissalDates) {
    const b = buckets.get(utcDateKey(iso));
    if (b) b.dismissals += 1;
  }
  for (const r of redemptions) {
    const b = buckets.get(utcDateKey(r.date));
    if (b) {
      b.redemptions += 1;
      b.revenue += r.revenue;
    }
  }
  return Array.from(buckets.values());
}

interface UsePromotionalPopupFunnelArgs {
  offerCode: string | null | undefined;
  /** Defaults to 30 days. */
  windowDays?: number;
  explicitOrgId?: string;
  /** Optional rotation filter. When provided, restricts the funnel to the
   *  [startsAt, endsAt] window of a single scheduled rotation entry. The
   *  underlying `offerCode` stays the same — the wrapper's offer code is the
   *  attribution key (see `applyScheduledSnapshot`), so per-rotation slicing
   *  is purely a temporal narrowing. `windowDays` is ignored when this is set.
   */
  rotationWindow?: { id: string; startsAt: string; endsAt: string } | null;
  /** Optional A/B variant filter. When set, narrows impressions + responses
   *  to rows tagged with this `variant_key`. Redemptions are NOT filtered
   *  (variant attribution doesn't currently propagate through the booking →
   *  checkout flow), so the redemption count stays at the offer-code level.
   *  The card surfaces this asymmetry inline so operators don't misread it. */
  variantKey?: string | null;
}

export function usePromotionalPopupFunnel({
  offerCode,
  windowDays = 30,
  explicitOrgId,
  rotationWindow,
  variantKey,
}: UsePromotionalPopupFunnelArgs) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const code = (offerCode ?? '').trim();

  return useQuery<PromotionalPopupFunnel>({
    queryKey: [
      'promotional-popup-funnel',
      orgId,
      code,
      windowDays,
      rotationWindow?.id ?? null,
      rotationWindow?.startsAt ?? null,
      rotationWindow?.endsAt ?? null,
      variantKey ?? null,
    ],
    queryFn: async () => {
      const empty: PromotionalPopupFunnel = {
        impressions: 0,
        ctaClicks: 0,
        dismissals: 0,
        redemptions: 0,
        revenueAttributed: 0,
        ctr: null,
        redemptionRate: null,
        bookingRate: null,
        hasSufficientData: false,
        windowDays,
        firstImpressionAt: null,
        firstResponseAt: null,
        trend: buildTrendBuckets([], [], [], []),
      };
      if (!orgId) return empty;

      const windowStart = rotationWindow
        ? rotationWindow.startsAt
        : new Date(Date.now() - windowDays * 86_400_000).toISOString();
      const windowEnd = rotationWindow ? rotationWindow.endsAt : null;

      const [
        impressionsRes,
        responsesRes,
        redemptionsRes,
        firstImpressionRes,
        firstResponseRes,
      ] = await Promise.all([
        (() => {
          let q = supabase
            .from('promo_offer_impressions')
            .select('created_at')
            .eq('organization_id', orgId)
            .eq('offer_code', code)
            .eq('surface', POPUP_SURFACE)
            .gte('created_at', windowStart);
          if (windowEnd) q = q.lte('created_at', windowEnd);
          if (variantKey) q = q.eq('variant_key', variantKey);
          return q.limit(20_000);
        })(),
        (() => {
          let q = supabase
            .from('promo_offer_responses')
            .select('response, created_at')
            .eq('organization_id', orgId)
            .eq('offer_code', code)
            .eq('surface', POPUP_SURFACE)
            .gte('created_at', windowStart);
          if (windowEnd) q = q.lte('created_at', windowEnd);
          if (variantKey) q = q.eq('variant_key', variantKey);
          return q.limit(10_000);
        })(),
        (() => {
          let q = supabase
            .from('promotion_redemptions')
            .select('revenue_attributed, transaction_date')
            .eq('organization_id', orgId)
            .eq('promo_code_used', code)
            .eq('surface', POPUP_SURFACE)
            .gte('transaction_date', windowStart);
          if (windowEnd) q = q.lte('transaction_date', windowEnd);
          return q.limit(10_000);
        })(),
        // Earliest impression for THIS org/surface (any code) — establishes
        // when impression tracking actually started recording. Powers the
        // "Since {date}" footnote and detects the pre-tracking asymmetry.
        supabase
          .from('promo_offer_impressions')
          .select('created_at')
          .eq('organization_id', orgId)
          .eq('surface', POPUP_SURFACE)
          .order('created_at', { ascending: true })
          .limit(1),
        supabase
          .from('promo_offer_responses')
          .select('created_at')
          .eq('organization_id', orgId)
          .eq('offer_code', code)
          .eq('surface', POPUP_SURFACE)
          .order('created_at', { ascending: true })
          .limit(1),
      ]);

      const impressionRows = (impressionsRes.data ?? []) as Array<{ created_at: string }>;
      const impressions = impressionRows.length;
      const responses = (responsesRes.data ?? []) as Array<{
        response: string;
        created_at: string;
      }>;
      const ctaClicks = responses.filter((r) => r.response === 'accepted').length;
      const dismissals = responses.filter(
        (r) => r.response === 'declined' || r.response === 'soft',
      ).length;
      const redemptionRows = (redemptionsRes.data ?? []) as Array<{
        revenue_attributed: number | null;
        transaction_date: string;
      }>;
      const redemptions = redemptionRows.length;
      const revenueAttributed = redemptionRows.reduce(
        (sum, r) => sum + (Number(r.revenue_attributed) || 0),
        0,
      );

      const hasSufficientData = impressions >= MIN_IMPRESSIONS_FOR_RATES;
      const ctr = hasSufficientData ? ctaClicks / impressions : null;
      const redemptionRate = hasSufficientData ? redemptions / impressions : null;
      const bookingRate = ctaClicks > 0 ? redemptions / ctaClicks : null;

      const trend = buildTrendBuckets(
        impressionRows.map((r) => r.created_at),
        responses.filter((r) => r.response === 'accepted').map((r) => r.created_at),
        responses
          .filter((r) => r.response === 'declined' || r.response === 'soft')
          .map((r) => r.created_at),
        redemptionRows.map((r) => ({
          date: r.transaction_date,
          revenue: Number(r.revenue_attributed) || 0,
        })),
      );

      const firstImpressionAt =
        (firstImpressionRes.data?.[0] as { created_at: string } | undefined)
          ?.created_at ?? null;
      const firstResponseAt =
        (firstResponseRes.data?.[0] as { created_at: string } | undefined)
          ?.created_at ?? null;

      return {
        impressions,
        ctaClicks,
        dismissals,
        redemptions,
        revenueAttributed,
        ctr,
        redemptionRate,
        bookingRate,
        hasSufficientData,
        windowDays,
        firstImpressionAt,
        firstResponseAt,
        trend,
      };
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
