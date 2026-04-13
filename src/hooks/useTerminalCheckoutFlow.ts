import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TerminalFlowState =
  | 'idle'
  | 'creating_intent'
  | 'displaying_cart'
  | 'awaiting_tap'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

const STATE_LABELS: Record<TerminalFlowState, string> = {
  idle: '',
  creating_intent: 'Creating payment…',
  displaying_cart: 'Sending to reader…',
  awaiting_tap: 'Waiting for tap or insert…',
  processing: 'Processing payment…',
  succeeded: 'Payment complete',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
};

interface LineItem {
  description: string;
  amount: number; // cents
  quantity?: number;
}

interface CheckoutParams {
  organizationId: string;
  readerId: string;
  amount: number; // cents (pre-tip checkout total)
  tipAmount?: number; // cents
  currency?: string;
  appointmentId?: string;
  lineItems: LineItem[];
  tax?: number; // cents
}

interface CheckoutResult {
  paymentIntentId: string;
  amount: number;
  status: string;
}

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 120000; // 2 minutes

export function useTerminalCheckoutFlow() {
  const [flowState, setFlowState] = useState<TerminalFlowState>('idle');
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const paymentIntentIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setFlowState('idle');
    setError(null);
    cancelledRef.current = false;
    paymentIntentIdRef.current = null;
  }, []);

  const invokeReaderAction = async (
    action: string,
    readerId: string,
    organizationId: string,
    extra: Record<string, unknown> = {}
  ) => {
    const { data, error } = await supabase.functions.invoke('terminal-reader-display', {
      body: { action, reader_id: readerId, organization_id: organizationId, ...extra },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // B4 fix: Verify PaymentIntent status directly after reader clears
  const verifyPaymentIntent = async (
    readerId: string,
    organizationId: string,
    paymentIntentId: string
  ): Promise<'succeeded' | 'failed'> => {
    const { data, error } = await supabase.functions.invoke('terminal-reader-display', {
      body: {
        action: 'check_payment_intent',
        reader_id: readerId,
        organization_id: organizationId,
        payment_intent_id: paymentIntentId,
      },
    });
    if (error) throw error;
    const piStatus = data?.payment_intent?.status;
    if (piStatus === 'succeeded') return 'succeeded';
    return 'failed';
  };

  const pollReaderStatus = async (
    readerId: string,
    organizationId: string
  ): Promise<'succeeded' | 'failed'> => {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT) {
      if (cancelledRef.current) throw new Error('cancelled');

      const { data, error } = await supabase.functions.invoke('terminal-reader-display', {
        body: {
          action: 'check_reader_status',
          reader_id: readerId,
          organization_id: organizationId,
        },
      });

      if (error) throw error;

      const reader = data?.reader;
      const actionStatus = reader?.action?.status;

      if (actionStatus === 'succeeded') return 'succeeded';
      if (actionStatus === 'failed') return 'failed';

      // B4 fix: If reader has no active action, verify PI status directly
      // instead of assuming success (reader clears action on both success AND failure)
      if (!reader?.action || reader?.action?.type === undefined) {
        if (paymentIntentIdRef.current) {
          return await verifyPaymentIntent(readerId, organizationId, paymentIntentIdRef.current);
        }
        return 'failed'; // No PI to verify — treat as failed
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
    throw new Error('Payment timed out — please check the reader');
  };

  const startCheckout = useCallback(
    async (params: CheckoutParams): Promise<CheckoutResult> => {
      const {
        organizationId,
        readerId,
        amount,
        tipAmount = 0,
        currency = 'usd',
        appointmentId,
        lineItems,
        tax = 0,
      } = params;

      cancelledRef.current = false;
      setError(null);

      try {
        // Step 1: Create PaymentIntent
        setFlowState('creating_intent');
        const { data: piData, error: piError } = await supabase.functions.invoke(
          'create-terminal-payment-intent',
          {
            body: {
              organization_id: organizationId,
              amount,
              tip_amount: tipAmount,
              currency,
              appointment_id: appointmentId,
              description: lineItems.map((li) => li.description).join(', '),
            },
          }
        );

        if (piError) throw piError;
        if (!piData?.payment_intent_id) throw new Error(piData?.error || 'Failed to create payment');

        const paymentIntentId = piData.payment_intent_id;
        paymentIntentIdRef.current = paymentIntentId;

        if (cancelledRef.current) throw new Error('cancelled');

        // Step 2: Push cart to reader display
        setFlowState('displaying_cart');
        await invokeReaderAction('set_reader_display', readerId, organizationId, {
          line_items: lineItems,
          tax,
          currency,
        });

        if (cancelledRef.current) throw new Error('cancelled');

        // Step 3: Process payment on reader
        setFlowState('awaiting_tap');
        await invokeReaderAction('process_payment', readerId, organizationId, {
          payment_intent_id: paymentIntentId,
        });

        // Step 4: Poll for completion
        setFlowState('processing');
        const result = await pollReaderStatus(readerId, organizationId);

        // Step 5: Clear display
        try {
          await invokeReaderAction('clear_reader_display', readerId, organizationId);
        } catch {
          // Non-critical
        }

        if (result === 'succeeded') {
          setFlowState('succeeded');
          return { paymentIntentId, amount: amount + tipAmount, status: 'succeeded' };
        } else {
          setFlowState('failed');
          throw new Error('Payment was declined');
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'cancelled') {
          setFlowState('cancelled');
          setError('Payment was cancelled');
        } else {
          setFlowState('failed');
          setError(msg);
          toast.error('Payment failed', { description: msg });
        }
        throw err;
      }
    },
    []
  );

  const cancelCheckout = useCallback(
    async (readerId: string, organizationId: string) => {
      cancelledRef.current = true;
      try {
        await invokeReaderAction('cancel_action', readerId, organizationId);
        await invokeReaderAction('clear_reader_display', readerId, organizationId);
      } catch {
        // Best-effort
      }
      setFlowState('cancelled');
      setError('Payment was cancelled');
    },
    []
  );

  return {
    flowState,
    stateLabel: STATE_LABELS[flowState],
    error,
    startCheckout,
    cancelCheckout,
    reset,
    paymentIntentId: paymentIntentIdRef.current,
  };
}
