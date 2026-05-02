import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface DispatchQueueRow {
  id: string;
  organization_id: string;
  appointment_id: string;
  rule_id: string | null;
  client_id: string | null;
  client_phone: string | null;
  client_email: string | null;
  channel: string;
  scheduled_for: string;
  sent_at: string | null;
  skipped_at: string | null;
  skipped_reason: string | null;
  attempts: number;
  last_error: string | null;
  enqueued_at: string;
  survey_response_id: string | null;
}

export type DispatchStatus = 'all' | 'sent' | 'pending' | 'skipped' | 'errored';

export function useDispatchQueue(status: DispatchStatus = 'all', skippedReason: string | null = null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['review-dispatch-queue', orgId, status, skippedReason],
    queryFn: async () => {
      let q = supabase
        .from('review_request_dispatch_queue' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('enqueued_at', { ascending: false })
        .limit(200);

      if (status === 'sent') q = q.not('sent_at', 'is', null);
      else if (status === 'skipped') q = q.not('skipped_at', 'is', null);
      else if (status === 'pending') q = q.is('sent_at', null).is('skipped_at', null);
      else if (status === 'errored') q = q.not('last_error', 'is', null).is('sent_at', null);

      if (skippedReason) q = q.eq('skipped_reason', skippedReason);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DispatchQueueRow[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
