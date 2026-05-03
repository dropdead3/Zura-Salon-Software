/**
 * useWebhookHealth — Stripe webhook reliability snapshot for the platform
 * console. Reads the last 200 events from `stripe_webhook_events` and rolls
 * them up into KPIs (last successful event, 24h failure rate) plus a
 * recent-events table.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WebhookEventRow {
  id: string;
  stripeEventId: string;
  eventType: string;
  status: 'received' | 'processed' | 'failed' | 'replayed' | 'ignored';
  livemode: boolean;
  organizationId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
  replayedAt: string | null;
  replayCount: number;
}

export interface WebhookHealth {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  total24h: number;
  failed24h: number;
  failureRate24h: number; // 0-1
  pendingCount: number;
  events: WebhookEventRow[];
}

export function useWebhookHealth() {
  return useQuery<WebhookHealth>({
    queryKey: ['platform-stripe-webhook-health'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_webhook_events' as any)
        .select(
          'id, stripe_event_id, event_type, status, livemode, organization_id, stripe_customer_id, stripe_subscription_id, error_message, received_at, processed_at, replayed_at, replay_count',
        )
        .order('received_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const events: WebhookEventRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        stripeEventId: r.stripe_event_id,
        eventType: r.event_type,
        status: r.status,
        livemode: r.livemode,
        organizationId: r.organization_id,
        stripeCustomerId: r.stripe_customer_id,
        stripeSubscriptionId: r.stripe_subscription_id,
        errorMessage: r.error_message,
        receivedAt: r.received_at,
        processedAt: r.processed_at,
        replayedAt: r.replayed_at,
        replayCount: r.replay_count ?? 0,
      }));

      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const last24h = events.filter((e) => new Date(e.receivedAt).getTime() > dayAgo);
      const failed24h = last24h.filter((e) => e.status === 'failed').length;
      const lastSuccessAt =
        events.find((e) => e.status === 'processed')?.processedAt ??
        events.find((e) => e.status === 'processed')?.receivedAt ??
        null;
      const lastFailureAt = events.find((e) => e.status === 'failed')?.receivedAt ?? null;
      const pendingCount = events.filter((e) => e.status === 'received').length;

      return {
        lastSuccessAt,
        lastFailureAt,
        total24h: last24h.length,
        failed24h,
        failureRate24h: last24h.length > 0 ? failed24h / last24h.length : 0,
        pendingCount,
        events,
      };
    },
  });
}
