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
  tipAmount?: number; // cents — used only when tipMode === 'app'
  currency?: string;
  appointmentId?: string;
  lineItems: LineItem[];
  tax?: number; // cents
  /**
   * 'app'    — operator selects tip in the sheet (current default behavior).
   * 'reader' — S710 prompts the client for a tip on-device. Final tip is
   *            returned in the result via `tipAmount` after capture.
   */
  tipMode?: 'app' | 'reader';
}

interface CheckoutResult {
  paymentIntentId: string;
  amount: number; // total captured cents (subtotal + final tip)
  status: string;
  /** Final tip in cents — equals `tipAmount` for 'app' mode, or whatever
   *  the client selected on the reader for 'reader' mode. */
  tipAmount: number;
  tipMode: 'app' | 'reader';
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
  ): Promise<{
    status: 'succeeded' | 'failed';
    amount: number;
    tipAmount: number;
  }> => {
    const { data, error } = await supabase.functions.invoke('terminal-reader-display', {
      body: {
        action: 'check_payment_intent',
        reader_id: readerId,
        organization_id: organizationId,
        payment_intent_id: paymentIntentId,
      },
    });
    if (error) throw error;
    const pi = data?.payment_intent;
    const piStatus = pi?.status;
    return {
      status: piStatus === 'succeeded' ? 'succeeded' : 'failed',
      amount: typeof pi?.amount === 'number' ? pi.amount : 0,
      tipAmount: typeof pi?.tip_amount === 'number' ? pi.tip_amount : 0,
    };
  };

  const pollReaderStatus = async (
    readerId: string,
    organizationId: string
  ): Promise<{ status: 'succeeded' | 'failed'; amount: number; tipAmount: number }> => {
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

      // For both terminal states we still verify the PI directly so we get
      // the final captured amount + tip (especially for tip-on-reader).
      if (actionStatus === 'succeeded' || actionStatus === 'failed') {
        if (paymentIntentIdRef.current) {
          return await verifyPaymentIntent(readerId, organizationId, paymentIntentIdRef.current);
        }
        return { status: actionStatus, amount: 0, tipAmount: 0 };
      }

      // B4 fix: If reader has no active action, verify PI status directly
      // instead of assuming success (reader clears action on both success AND failure)
      if (!reader?.action || reader?.action?.type === undefined) {
        if (paymentIntentIdRef.current) {
          return await verifyPaymentIntent(readerId, organizationId, paymentIntentIdRef.current);
        }
        return { status: 'failed', amount: 0, tipAmount: 0 };
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
        tipMode = 'app',
      } = params;

      cancelledRef.current = false;
      setError(null);

      const collectTipOnReader = tipMode === 'reader';

      try {
        // Step 1: Create PaymentIntent
        setFlowState('creating_intent');
        const { data: piData, error: piError } = await supabase.functions.invoke(
          'create-terminal-payment-intent',
          {
            body: {
              organization_id: organizationId,
              amount,
              tip_amount: collectTipOnReader ? 0 : tipAmount,
              currency,
              appointment_id: appointmentId,
              description: lineItems.map((li) => li.description).join(', '),
              collect_tip_on_reader: collectTipOnReader,
            },
          }
        );

        if (piError) throw piError;
        if (!piData?.payment_intent_id) throw new Error(piData?.error || 'Failed to create payment');

        const paymentIntentId = piData.payment_intent_id;
        paymentIntentIdRef.current = paymentIntentId;
        const tipEligibleAmount: number =
          typeof piData.tip_eligible_amount === 'number' ? piData.tip_eligible_amount : 0;

        if (cancelledRef.current) throw new Error('cancelled');

        // Step 2: Push cart to reader display
        setFlowState('displaying_cart');
        await invokeReaderAction('set_reader_display', readerId, organizationId, {
          line_items: lineItems,
          tax,
          currency,
        });

        if (cancelledRef.current) throw new Error('cancelled');

        // Step 3: Process payment on reader (with tipping config when on-reader mode)
        setFlowState('awaiting_tap');
        await invokeReaderAction('process_payment', readerId, organizationId, {
          payment_intent_id: paymentIntentId,
          ...(collectTipOnReader && tipEligibleAmount > 0
            ? { tip_eligible_amount: tipEligibleAmount }
            : {}),
        });

        // Step 4: Poll for completion (returns final tip + captured amount)
        setFlowState('processing');
        const result = await pollReaderStatus(readerId, organizationId);

        // Step 5: Clear display
        try {
          await invokeReaderAction('clear_reader_display', readerId, organizationId);
        } catch {
          // Non-critical
        }

        if (result.status === 'succeeded') {
          setFlowState('succeeded');
          // Prefer the on-reader tip when in 'reader' mode; fall back to
          // the operator-entered tip otherwise.
          const finalTip = collectTipOnReader ? result.tipAmount : tipAmount;
          return {
            paymentIntentId,
            amount: result.amount || amount + finalTip,
            status: 'succeeded',
            tipAmount: finalTip,
            tipMode,
          };
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
