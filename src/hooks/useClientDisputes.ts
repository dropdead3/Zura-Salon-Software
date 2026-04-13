import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientDispute {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  created_at: string;
  evidence_due_by: string | null;
  stripe_dispute_id: string;
}

export interface ClientDisputeSummary {
  disputes: ClientDispute[];
  totalCount: number;
  openCount: number;
  totalAmount: number;
}

export function useClientDisputes(clientId: string | null | undefined, clientEmail?: string | null) {
  return useQuery({
    queryKey: ['client-disputes', clientId, clientEmail],
    queryFn: async (): Promise<ClientDisputeSummary> => {
      let disputes: ClientDispute[] = [];

      // Primary: query by client_id
      if (clientId) {
        const { data, error } = await supabase
          .from('payment_disputes')
          .select('id, amount, currency, reason, status, created_at, evidence_due_by, stripe_dispute_id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        if (!error && data?.length) {
          disputes = data;
        }
      }

      // Fallback: query by client_email if no results from client_id
      if (disputes.length === 0 && clientEmail) {
        const { data, error } = await supabase
          .from('payment_disputes')
          .select('id, amount, currency, reason, status, created_at, evidence_due_by, stripe_dispute_id')
          .ilike('client_email', clientEmail)
          .order('created_at', { ascending: false });
        if (!error && data) {
          disputes = data;
        }
      }

      const openStatuses = ['needs_response', 'under_review', 'warning_needs_response'];
      return {
        disputes,
        totalCount: disputes.length,
        openCount: disputes.filter(d => openStatuses.includes(d.status)).length,
        totalAmount: disputes.reduce((sum, d) => sum + (d.amount || 0), 0),
      };
    },
    enabled: !!(clientId || clientEmail),
    staleTime: 1000 * 60 * 2,
  });
}
