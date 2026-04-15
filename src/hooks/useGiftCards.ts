import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GiftCard {
  id: string;
  organization_id: string;
  code: string;
  initial_amount: number;
  current_balance: number;
  assigned_client_id: string | null;
  purchaser_name: string | null;
  purchaser_email: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useGiftCards(organizationId?: string) {
  return useQuery({
    queryKey: ['gift-cards', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GiftCard[];
    },
    enabled: !!organizationId,
  });
}

export function useGiftCardByCode(code: string | null) {
  return useQuery({
    queryKey: ['gift-card-by-code', code],
    queryFn: async () => {
      if (!code) return null;

      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('code', code.toUpperCase().replace(/[^A-Z0-9]/g, ''))
        .maybeSingle();

      if (error) throw error;
      return data as unknown as GiftCard | null;
    },
    enabled: !!code && code.length >= 16,
  });
}

export function useCreateGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      amount,
      purchaserName,
      purchaserEmail,
      recipientName,
      recipientEmail,
      expiresAt,
      assignedClientId,
    }: {
      organizationId: string;
      amount: number;
      purchaserName?: string;
      purchaserEmail?: string;
      recipientName?: string;
      recipientEmail?: string;
      expiresAt?: string;
      assignedClientId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const code = generateGiftCardCode();

      const { data, error } = await supabase
        .from('gift_cards')
        .insert({
          organization_id: organizationId,
          code,
          initial_amount: amount,
          current_balance: amount,
          purchaser_name: purchaserName || null,
          purchaser_email: purchaserEmail || null,
          recipient_name: recipientName || null,
          recipient_email: recipientEmail || null,
          expires_at: expiresAt || null,
          assigned_client_id: assignedClientId || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as GiftCard;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards', variables.organizationId] });
      toast.success('Gift card created', {
        description: `Code: ${data.code}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to create gift card', {
        description: error.message,
      });
    },
  });
}

export function useRedeemGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      giftCardId,
      amount,
      clientId,
      organizationId,
    }: {
      giftCardId: string;
      amount: number;
      clientId: string;
      organizationId: string;
    }) => {
      // Get current gift card balance
      const { data: giftCard, error: fetchError } = await supabase
        .from('gift_cards')
        .select('current_balance')
        .eq('id', giftCardId)
        .single();

      if (fetchError) throw fetchError;
      if (Number(giftCard.current_balance) < amount) {
        throw new Error('Insufficient gift card balance');
      }

      // Update gift card balance
      const { error: updateError } = await supabase
        .from('gift_cards')
        .update({
          current_balance: Number(giftCard.current_balance) - amount,
          assigned_client_id: clientId,
        })
        .eq('id', giftCardId);

      if (updateError) throw updateError;

      // Add to client's gift card balance (for tracking)
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: balanceError } = await supabase.rpc('add_to_client_balance', {
        p_organization_id: organizationId,
        p_client_id: clientId,
        p_amount: amount,
        p_balance_type: 'gift_card',
        p_transaction_type: 'giftcard_redemption',
        p_reference_transaction_id: giftCardId,
        p_notes: 'Gift card redeemed',
        p_issued_by: user?.id || null,
      });

      if (balanceError) throw balanceError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['client-balance', variables.clientId] });
      toast.success('Gift card redeemed successfully');
    },
    onError: (error) => {
      toast.error('Failed to redeem gift card', {
        description: error.message,
      });
    },
  });
}

export function useDeactivateGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (giftCardId: string) => {
      const { error } = await supabase
        .from('gift_cards')
        .update({ is_active: false })
        .eq('id', giftCardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success('Gift card deactivated');
    },
    onError: (error) => {
      toast.error('Failed to deactivate gift card', {
        description: error.message,
      });
    },
  });
}

export function useUpdateGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ giftCardId, updates }: { giftCardId: string; updates: Partial<GiftCard> }) => {
      const { data, error } = await supabase
        .from('gift_cards')
        .update(updates)
        .eq('id', giftCardId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as GiftCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      toast.success('Gift card updated');
    },
    onError: (error) => {
      toast.error('Failed to update gift card', {
        description: error.message,
      });
    },
  });
}

export interface BalanceTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  notes: string | null;
  created_at: string;
}

export function useGiftCardTransactions(giftCardId: string | null) {
  return useQuery({
    queryKey: ['gift-card-transactions', giftCardId],
    queryFn: async () => {
      if (!giftCardId) return [];

      const { data, error } = await supabase
        .from('balance_transactions')
        .select('id, amount, transaction_type, notes, created_at')
        .eq('reference_transaction_id', giftCardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as BalanceTransaction[];
    },
    enabled: !!giftCardId,
  });
}
