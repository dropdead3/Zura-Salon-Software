import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HighRiskPayment {
  id: string;
  organization_id: string;
  stripe_charge_id: string;
  stripe_payment_intent_id: string | null;
  risk_score: number | null;
  risk_level: string | null;
  appointment_id: string | null;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useHighRiskPayments(orgId?: string) {
  return useQuery({
    queryKey: ['high-risk-payments', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_risk_scores')
        .select('*')
        .eq('organization_id', orgId!)
        .in('risk_level', ['elevated', 'highest'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as HighRiskPayment[];
    },
    enabled: !!orgId,
  });
}
