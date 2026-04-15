import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientBalance {
  id: string;
  organization_id: string;
  client_id: string;
  salon_credit_balance: number;
  gift_card_balance: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  organization_id: string;
  client_id: string;
  transaction_type: string;
  amount: number;
  balance_type: 'salon_credit' | 'gift_card';
  reference_transaction_id: string | null;
  notes: string | null;
  issued_by: string | null;
  created_at: string;
}

export function useClientBalance(clientId: string | null) {
  return useQuery({
    queryKey: ['client-balance', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('client_balances')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      
      return data ? {
        ...data,
        salon_credit_balance: Number(data.salon_credit_balance) || 0,
        gift_card_balance: Number(data.gift_card_balance) || 0,
      } as ClientBalance : null;
    },
    enabled: !!clientId,
  });
}

export function useClientBalanceTransactions(clientId: string | null) {
  return useQuery({
    queryKey: ['client-balance-transactions', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as unknown as BalanceTransaction[];
    },
    enabled: !!clientId,
  });
}

export function useIssueCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      clientId,
      amount,
      balanceType,
      notes,
    }: {
      organizationId: string;
      clientId: string;
      amount: number;
      balanceType: 'salon_credit' | 'gift_card';
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use the database function to add to balance
      const { data, error } = await supabase.rpc('add_to_client_balance', {
        p_organization_id: organizationId,
        p_client_id: clientId,
        p_amount: amount,
        p_balance_type: balanceType,
        p_transaction_type: balanceType === 'salon_credit' ? 'credit_issue' : 'giftcard_issue',
        p_reference_transaction_id: null,
        p_notes: notes || null,
        p_issued_by: user?.id || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-balance', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-balance-transactions', variables.clientId] });
      toast.success(
        variables.balanceType === 'salon_credit' 
          ? 'Salon credit issued successfully' 
          : 'Gift card balance added'
      );
    },
    onError: (error) => {
      toast.error('Failed to issue credit', {
        description: error.message,
      });
    },
  });
}

export function useAdjustBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      clientId,
      amount,
      balanceType,
      notes,
    }: {
      organizationId: string;
      clientId: string;
      amount: number; // Can be negative for deductions
      balanceType: 'salon_credit' | 'gift_card';
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('add_to_client_balance', {
        p_organization_id: organizationId,
        p_client_id: clientId,
        p_amount: amount,
        p_balance_type: balanceType,
        p_transaction_type: 'adjustment',
        p_reference_transaction_id: null,
        p_notes: notes,
        p_issued_by: user?.id || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-balance', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-balance-transactions', variables.clientId] });
      toast.success('Balance adjusted successfully');
    },
    onError: (error) => {
      toast.error('Failed to adjust balance', {
        description: error.message,
      });
    },
  });
}
