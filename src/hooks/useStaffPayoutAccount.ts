import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface StaffPayoutAccount {
  id: string;
  organization_id: string;
  user_id: string;
  stripe_account_id: string;
  stripe_status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  bank_last4: string | null;
  bank_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyPayoutAccount() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['my-payout-account', orgId],
    queryFn: async (): Promise<StaffPayoutAccount | null> => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('staff_payout_accounts')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as StaffPayoutAccount | null;
    },
    enabled: !!orgId,
  });
}

export function useStaffPayoutAccounts() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['staff-payout-accounts', orgId],
    queryFn: async (): Promise<StaffPayoutAccount[]> => {
      const { data, error } = await supabase
        .from('staff_payout_accounts')
        .select('*')
        .eq('organization_id', orgId!);

      if (error) throw error;
      return (data || []) as StaffPayoutAccount[];
    },
    enabled: !!orgId,
  });
}

export function useStartPayoutOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke('staff-payout-onboarding', {
        body: { action: 'create_account', ...params },
      });
      if (error) throw error;
      return data as { onboarding_url: string; account_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payout-account'] });
    },
    onError: (error) => {
      toast.error('Failed to start onboarding: ' + error.message);
    },
  });
}

export function useCreatePayoutLoginLink() {
  return useMutation({
    mutationFn: async (params: { organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke('staff-payout-onboarding', {
        body: { action: 'create_login_link', ...params },
      });
      if (error) throw error;
      return data as { login_url: string };
    },
    onError: (error) => {
      toast.error('Failed to create login link: ' + error.message);
    },
  });
}

export function useRefreshPayoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { organization_id: string }) => {
      const { data, error } = await supabase.functions.invoke('staff-payout-onboarding', {
        body: { action: 'verify_status', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payout-account'] });
      toast.success('Account status refreshed');
    },
    onError: (error) => {
      toast.error('Failed to refresh status: ' + error.message);
    },
  });
}
