import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CollectDepositParams {
  organizationId: string;
  appointmentId: string;
  amount: number; // cents
  readerId?: string;
  currency?: string;
  description?: string;
}

interface DepositResult {
  paymentIntentId: string;
  amount: number;
  status: string;
}

export function useTerminalDeposit() {
  const collectDeposit = useCallback(
    async (params: CollectDepositParams): Promise<DepositResult> => {
      const { data, error } = await supabase.functions.invoke('reconcile-till', {
        body: {
          action: 'collect_deposit',
          organization_id: params.organizationId,
          appointment_id: params.appointmentId,
          amount: params.amount,
          reader_id: params.readerId,
          currency: params.currency || 'usd',
          description: params.description,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Deposit hold placed', {
        description: `$${(params.amount / 100).toFixed(2)} held on card`,
      });

      return {
        paymentIntentId: data.payment_intent_id,
        amount: params.amount,
        status: data.status,
      };
    },
    []
  );

  const captureDeposit = useCallback(
    async (organizationId: string, paymentIntentId: string, captureAmount?: number) => {
      const { data, error } = await supabase.functions.invoke('reconcile-till', {
        body: {
          action: 'capture_deposit',
          organization_id: organizationId,
          payment_intent_id: paymentIntentId,
          capture_amount: captureAmount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Deposit captured');
      return data;
    },
    []
  );

  const cancelDeposit = useCallback(
    async (organizationId: string, paymentIntentId: string) => {
      const { data, error } = await supabase.functions.invoke('reconcile-till', {
        body: {
          action: 'cancel_deposit',
          organization_id: organizationId,
          payment_intent_id: paymentIntentId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Deposit released');
      return data;
    },
    []
  );

  return { collectDeposit, captureDeposit, cancelDeposit };
}
