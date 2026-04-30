import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

/**
 * Counts confirmed redemptions of a promotional popup's offer code for the
 * current org. Powers the "Redemptions" stat shown on the popup editor card so
 * operators can see the marketing loop close (popup click → booking confirmed
 * with code → row in `promotion_redemptions`).
 *
 * Silence is valid output: returns `count: 0` when no code is configured or no
 * redemptions exist. Never returns a default/placeholder figure.
 *
 * Scope: filtered by `organization_id` (RLS-enforced) and exact `promo_code_used`.
 * The popup surface tag (`'promotional_popup'`) is stamped on the redemption row
 * by the edge function so future surfaces (campaigns, SMS, QR codes) can share
 * the same table without polluting this count.
 */
export function usePromotionalPopupRedemptions(
  offerCode: string | null | undefined,
  explicitOrgId?: string,
) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const code = (offerCode ?? '').trim();

  return useQuery({
    queryKey: ['promotional-popup-redemptions', orgId, code],
    queryFn: async () => {
      if (!orgId || !code) return { count: 0 };
      const { count, error } = await supabase
        .from('promotion_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('promo_code_used', code);
      if (error) {
        // Swallow — the editor card should never crash because a count failed.
        // Returning 0 is honest: we genuinely don't know of any redemptions.
        return { count: 0 };
      }
      return { count: count ?? 0 };
    },
    enabled: !!orgId && code.length > 0,
    staleTime: 30_000,
  });
}
