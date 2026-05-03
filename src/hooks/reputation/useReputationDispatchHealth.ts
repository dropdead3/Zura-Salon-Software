/**
 * useReputationDispatchHealth — Operational health for the Reputation
 * messaging engine. Reads review_request_dispatch_queue + sms_opt_outs
 * across all organizations (platform-staff RLS).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DispatchHealth {
  pendingCount: number;
  sentLast24h: number;
  skippedLast24h: number;
  failedLast24h: number;
  oldestPendingAgeMinutes: number | null;
  retryBuckets: { zero: number; one: number; two: number; threePlus: number };
  optOutsTotal: number;
  optOutsLast7d: number;
  topFailureReasons: { reason: string; count: number }[];
}

/** Bucket raw Twilio / SMTP errors into operator-meaningful reasons. */
function bucketFailureReason(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('opt') && s.includes('out')) return 'Opted out';
  if (s.includes('landline') || s.includes('not mobile') || s.includes('30006')) return 'Landline / not mobile';
  if (s.includes('blocked') || s.includes('30007') || s.includes('carrier')) return 'Carrier blocked';
  if (s.includes('invalid') || s.includes('21211') || s.includes('21614')) return 'Invalid number';
  if (s.includes('unreachable') || s.includes('30005')) return 'Unreachable handset';
  if (s.includes('quota') || s.includes('rate')) return 'Rate / quota limit';
  if (s.includes('email') || s.includes('bounce') || s.includes('smtp')) return 'Email bounce';
  return 'Other';
}

export function useReputationDispatchHealth() {
  return useQuery({
    queryKey: ['platform-reputation-dispatch-health'],
    staleTime: 30_000,
    queryFn: async (): Promise<DispatchHealth> => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: queue }, { data: optOuts }] = await Promise.all([
        supabase
          .from('review_request_dispatch_queue')
          .select('scheduled_for, sent_at, skipped_at, last_error, attempts, enqueued_at')
          .order('scheduled_for', { ascending: true })
          .limit(1000),
        supabase
          .from('sms_opt_outs')
          .select('opted_out_at')
          .limit(1000),
      ]);

      const rows = queue ?? [];
      let pendingCount = 0;
      let sentLast24h = 0;
      let skippedLast24h = 0;
      let failedLast24h = 0;
      let oldestPending: string | null = null;
      const buckets = { zero: 0, one: 0, two: 0, threePlus: 0 };

      for (const r of rows as any[]) {
        const isPending = !r.sent_at && !r.skipped_at;
        if (isPending) {
          pendingCount += 1;
          if (!oldestPending || r.scheduled_for < oldestPending) oldestPending = r.scheduled_for;
          const a = r.attempts ?? 0;
          if (a === 0) buckets.zero += 1;
          else if (a === 1) buckets.one += 1;
          else if (a === 2) buckets.two += 1;
          else buckets.threePlus += 1;
        }
        if (r.sent_at && r.sent_at >= since24h) sentLast24h += 1;
        if (r.skipped_at && r.skipped_at >= since24h) skippedLast24h += 1;
        if (r.last_error && r.enqueued_at >= since24h) failedLast24h += 1;
      }

      const oldestPendingAgeMinutes = oldestPending
        ? Math.max(0, Math.round((Date.now() - new Date(oldestPending).getTime()) / 60_000))
        : null;

      const optOutRows = (optOuts ?? []) as any[];
      const optOutsLast7d = optOutRows.filter((o) => o.opted_out_at >= since7d).length;

      return {
        pendingCount,
        sentLast24h,
        skippedLast24h,
        failedLast24h,
        oldestPendingAgeMinutes,
        retryBuckets: buckets,
        optOutsTotal: optOutRows.length,
        optOutsLast7d,
      };
    },
  });
}
