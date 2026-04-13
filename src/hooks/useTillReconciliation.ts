import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripeReconciliation {
  total_payments: number;
  total_amount_cents: number;
  total_tips_cents: number;
  net_amount_cents: number;
}

interface Discrepancy {
  unmatched_stripe: Array<{
    id: string;
    amount: number;
    created: number;
    status: string;
    metadata: Record<string, string>;
  }>;
  orphaned_local: Array<{
    appointment_id: string;
    stripe_payment_intent_id: string;
    local_status: string;
  }>;
}

export interface ReconciliationResult {
  date: string;
  stripe: StripeReconciliation;
  local: { matched_count: number };
  discrepancies: Discrepancy;
  is_reconciled: boolean;
}

export function useTillReconciliation(organizationId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reconcile = useCallback(
    async (date: string) => {
      if (!organizationId) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('reconcile-till', {
          body: {
            action: 'reconcile_daily',
            organization_id: organizationId,
            date,
          },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setResult(data as ReconciliationResult);

        if (data.is_reconciled) {
          toast.success('Till reconciled', { description: 'All card payments match Stripe records.' });
        } else {
          const issues =
            (data.discrepancies.unmatched_stripe?.length || 0) +
            (data.discrepancies.orphaned_local?.length || 0);
          toast.warning(`${issues} discrepanc${issues === 1 ? 'y' : 'ies'} found`, {
            description: 'Review the reconciliation details.',
          });
        }
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        toast.error('Reconciliation failed', { description: msg });
      } finally {
        setIsLoading(false);
      }
    },
    [organizationId]
  );

  return { reconcile, result, isLoading, error };
}
