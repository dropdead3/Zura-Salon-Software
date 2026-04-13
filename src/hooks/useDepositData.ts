import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { toast } from 'sonner';

// ─── Client Cards on File ─────────────────────────────

export interface ClientCard {
  id: string;
  organization_id: string;
  client_id: string;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean;
  created_at: string;
}

export function useClientCardsOnFile(clientId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['client-cards', orgId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_cards_on_file')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('client_id', clientId!)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as ClientCard[];
    },
    enabled: !!orgId && !!clientId,
  });
}

export function useDeleteClientCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('client_cards_on_file')
        .delete()
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-cards'] });
      toast.success('Card removed');
    },
    onError: () => toast.error('Failed to remove card'),
  });
}

// ─── Cancellation Fee Policies ────────────────────────

export interface CancellationFeePolicy {
  id: string;
  organization_id: string;
  policy_type: string;
  fee_type: string;
  fee_amount: number;
  min_notice_hours: number | null;
  is_active: boolean;
  applies_to_new_clients_only: boolean;
  created_at: string;
  updated_at: string;
}

export function useCancellationFeePolicies() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['cancellation-fee-policies', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cancellation_fee_policies')
        .select('*')
        .eq('organization_id', orgId!)
        .order('min_notice_hours', { ascending: false });
      if (error) throw error;
      return data as CancellationFeePolicy[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertCancellationFeePolicy() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (policy: Partial<CancellationFeePolicy> & { policy_type: string }) => {
      const payload = { ...policy, organization_id: orgId! };
      if (policy.id) {
        const { error } = await supabase
          .from('cancellation_fee_policies')
          .update(payload)
          .eq('id', policy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cancellation_fee_policies')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellation-fee-policies'] });
      toast.success('Policy saved');
    },
    onError: () => toast.error('Failed to save policy'),
  });
}

export function useDeleteCancellationFeePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cancellation_fee_policies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellation-fee-policies'] });
      toast.success('Policy deleted');
    },
    onError: () => toast.error('Failed to delete policy'),
  });
}

// ─── Deposit Calculation Helper ───────────────────────

export function calculateDepositAmount(
  servicePrice: number | null,
  requiresDeposit: boolean,
  depositType: string,
  depositAmount: number | null,
  depositAmountFlat: number | null,
): number | null {
  if (!requiresDeposit || servicePrice == null || depositAmount == null) return null;

  if (depositType === 'flat') return depositAmount;
  if (depositType === 'full_prepay') return servicePrice;

  // Percentage
  const calculated = (servicePrice * depositAmount) / 100;
  // Apply minimum flat if configured
  if (depositAmountFlat != null && calculated < depositAmountFlat) {
    return depositAmountFlat;
  }
  return calculated;
}

// ─── Booking Policies (customer-facing text) ─────────

export interface BookingPolicies {
  deposit_policy_text: string;
  cancellation_policy_text: string;
}

const DEFAULT_BOOKING_POLICIES: BookingPolicies = {
  deposit_policy_text: '',
  cancellation_policy_text: '',
};

export function useBookingPolicies(explicitOrgId?: string) {
  return useSiteSettings<BookingPolicies>('booking_policies', explicitOrgId);
}

export function useUpdateBookingPolicies(explicitOrgId?: string) {
  return useUpdateSiteSetting<BookingPolicies>(explicitOrgId);
}

// ─── Charge Card on File (mutation) ───────────────────

export function useChargeCardOnFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      appointment_id: string;
      card_on_file_id?: string;
      client_id?: string;
      amount: number;
      description?: string;
      fee_type?: 'cancellation' | 'no_show' | 'manual';
    }) => {
      const { data, error } = await supabase.functions.invoke('charge-card-on-file', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-hub'] });
    },
  });
}
