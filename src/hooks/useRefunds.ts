import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RefundRecord {
  id: string;
  organization_id: string;
  client_id: string | null;
  original_transaction_id: string;
  original_transaction_date: string;
  original_item_name: string | null;
  refund_amount: number;
  refund_type: 'original_payment' | 'salon_credit' | 'gift_card';
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  reason: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_by: string;
  created_at: string;
}

export function useRefundRecords(filters?: { status?: string; clientId?: string }) {
  return useQuery({
    queryKey: ['refund-records', filters],
    queryFn: async () => {
      let query = supabase
        .from('refund_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as RefundRecord[];
    },
  });
}

export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      clientId,
      transactionId,
      transactionDate,
      itemName,
      refundAmount,
      refundType,
      reason,
      notes,
      stripePaymentIntentId,
    }: {
      organizationId: string;
      clientId: string | null;
      transactionId: string;
      transactionDate: string;
      itemName: string;
      refundAmount: number;
      refundType: 'original_payment' | 'salon_credit' | 'gift_card';
      reason?: string;
      notes?: string;
      stripePaymentIntentId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create refund record
      const { data: refund, error: refundError } = await supabase
        .from('refund_records')
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          original_transaction_id: transactionId,
          original_transaction_date: transactionDate,
          original_item_name: itemName,
          refund_amount: refundAmount,
          refund_type: refundType,
          status: refundType === 'original_payment' ? 'pending' : 'completed',
          reason: reason || null,
          notes: notes || null,
          created_by: user.id,
          processed_by: refundType !== 'original_payment' ? user.id : null,
          processed_at: refundType !== 'original_payment' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // If original_payment refund AND we have a Stripe PI, issue the refund through Stripe
      if (refundType === 'original_payment' && stripePaymentIntentId) {
        const { data: stripeResult, error: stripeError } = await supabase.functions.invoke(
          'process-stripe-refund',
          {
            body: {
              payment_intent_id: stripePaymentIntentId,
              amount: Math.round(refundAmount * 100), // cents
              organization_id: organizationId,
              refund_record_id: refund.id,
              reason: 'requested_by_customer',
            },
          }
        );

        if (stripeError) {
          // Mark the refund record as failed but don't throw — the record exists for manual retry
          await supabase
            .from('refund_records')
            .update({ status: 'rejected', notes: `Stripe refund failed: ${stripeError.message}` })
            .eq('id', refund.id);
          throw new Error(`Stripe refund failed: ${stripeError.message}`);
        }

        if (stripeResult?.error) {
          await supabase
            .from('refund_records')
            .update({ status: 'rejected', notes: `Stripe refund failed: ${stripeResult.error}` })
            .eq('id', refund.id);
          throw new Error(`Stripe refund failed: ${stripeResult.error}`);
        }
      }

      // If refunding to credit or gift card, add to client balance
      if (clientId && (refundType === 'salon_credit' || refundType === 'gift_card')) {
        const { error: balanceError } = await supabase.rpc('add_to_client_balance', {
          p_organization_id: organizationId,
          p_client_id: clientId,
          p_amount: refundAmount,
          p_balance_type: refundType === 'salon_credit' ? 'salon_credit' : 'gift_card',
          p_transaction_type: refundType === 'salon_credit' ? 'refund_to_credit' : 'refund_to_giftcard',
          p_reference_transaction_id: transactionId,
          p_notes: `Refund for: ${itemName}`,
          p_issued_by: user.id,
        });

        if (balanceError) throw balanceError;
      }

      return refund;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['refund-records'] });
      queryClient.invalidateQueries({ queryKey: ['client-transactions', variables.clientId] });
      if (variables.clientId) {
        queryClient.invalidateQueries({ queryKey: ['client-balance', variables.clientId] });
        queryClient.invalidateQueries({ queryKey: ['client-balance-transactions', variables.clientId] });
      }
      
      const message = variables.refundType === 'original_payment'
        ? variables.stripePaymentIntentId
          ? 'Refund issued through Stripe'
          : 'Refund flagged for PhorestPay processing'
        : variables.refundType === 'salon_credit'
        ? 'Refund issued as salon credit'
        : 'Refund issued as gift card balance';
      
      toast.success('Refund processed', { description: message });
    },
    onError: (error) => {
      toast.error('Failed to process refund', {
        description: error.message,
      });
    },
  });
}

export function useUpdateRefundStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      refundId,
      status,
      notes,
    }: {
      refundId: string;
      status: 'approved' | 'completed' | 'rejected';
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('refund_records')
        .update({
          status,
          notes: notes || undefined,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', refundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refund-records'] });
      toast.success('Refund status updated');
    },
    onError: (error) => {
      toast.error('Failed to update refund status', {
        description: error.message,
      });
    },
  });
}
