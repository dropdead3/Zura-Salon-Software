/**
 * Reads the current org's Reputation subscription state + the count of curated
 * (auto-publishable) website testimonials that would be hidden if the
 * subscription lapses. Used to power "Manage subscription" + the cancellation
 * SEO warning surface.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReputationEntitlement } from './useReputationEntitlement';

export interface ReputationSubscriptionState {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  current_period_end: string | null;
  grace_until: string | null;
  canceled_at: string | null;
  curated_testimonial_count: number;
}

export function useReputationSubscription() {
  const { orgId } = useReputationEntitlement();

  return useQuery<ReputationSubscriptionState>({
    queryKey: ['reputation-subscription', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const [subRes, countRes] = await Promise.all([
        supabase
          .from('reputation_subscriptions' as any)
          .select('status, current_period_end, grace_until, canceled_at')
          .eq('organization_id', orgId!)
          .maybeSingle(),
        supabase
          .from('website_testimonials' as any)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!)
          .eq('enabled', true)
          .not('source_response_id', 'is', null),
      ]);

      const sub = (subRes.data ?? null) as {
        status: ReputationSubscriptionState['status'];
        current_period_end: string | null;
        grace_until: string | null;
        canceled_at: string | null;
      } | null;

      return {
        status: sub?.status ?? null,
        current_period_end: sub?.current_period_end ?? null,
        grace_until: sub?.grace_until ?? null,
        canceled_at: sub?.canceled_at ?? null,
        curated_testimonial_count: countRes.count ?? 0,
      };
    },
  });
}
