/**
 * useParkedDispatchRows — Surfaces dispatcher rows that exhausted 5 retries
 * and were auto-parked. Operators triage from the Feedback Hub.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface ParkedDispatchRow {
  id: string;
  appointment_id: string;
  client_phone: string | null;
  client_email: string | null;
  channel: string;
  attempts: number;
  last_error: string | null;
  parked_at: string;
  enqueued_at: string;
}

export function useParkedDispatchRows() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['parked-dispatch-rows', orgId],
    queryFn: async (): Promise<ParkedDispatchRow[]> => {
      const { data, error } = await supabase
        .from('review_request_dispatch_queue' as never)
        .select('id, appointment_id, client_phone, client_email, channel, attempts, last_error, parked_at, enqueued_at')
        .eq('organization_id', orgId!)
        .not('parked_at', 'is', null)
        .order('parked_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ParkedDispatchRow[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
