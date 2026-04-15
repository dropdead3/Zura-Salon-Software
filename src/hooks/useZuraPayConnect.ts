import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectResult {
  onboarding_url: string;
  account_id: string;
  status: string;
  location_id?: string;
}

interface VerifyResult {
  status: string;
  charges_enabled: boolean;
  details_submitted: boolean;
  payouts_enabled: boolean;
  account_id?: string;
  auto_connected_location_id?: string | null;
  bank_last4?: string | null;
}

export function useOrgConnectStatus(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-connect-status', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('stripe_connect_account_id, stripe_connect_status')
        .eq('id', orgId!)
        .single();
      if (error) throw error;
      return data as {
        stripe_connect_account_id: string | null;
        stripe_connect_status: string;
      };
    },
    enabled: !!orgId,
    staleTime: 30000,
  });
}

/**
 * Fetches the last 4 digits of the org's bank account.
 * Uses the verify endpoint in read-only mode (action: 'get_bank_last4').
 * The verify function is idempotent — safe for repeated calls.
 */
export function useOrgBankLast4(orgId: string | undefined, stripeAccountId: string | null | undefined) {
  return useQuery({
    queryKey: ['org-bank-last4', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('verify-zura-pay-connection', {
        body: { organization_id: orgId, action: 'get_bank_last4' },
      });
      if (error) throw error;
      return (data?.bank_last4 as string | null) ?? null;
    },
    enabled: !!orgId && !!stripeAccountId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectZuraPay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      returnUrl,
      refreshUrl,
    }: {
      organizationId: string;
      returnUrl?: string;
      refreshUrl?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('connect-zura-pay', {
        body: {
          action: 'create_account_and_link',
          organization_id: organizationId,
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as unknown as ConnectResult;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else {
        toast.info('Your account is already set up. Check the connection status.');
      }
    },
    onError: (error) => {
      toast.error('Failed to start Point Of Sale setup', {
        description: (error as Error).message,
      });
    },
  });
}

export function useCreateLocationAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      locationId,
      returnUrl,
      refreshUrl,
    }: {
      organizationId: string;
      locationId: string;
      returnUrl?: string;
      refreshUrl?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('connect-zura-pay', {
        body: {
          action: 'create_location_account',
          organization_id: organizationId,
          location_id: locationId,
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as unknown as ConnectResult;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org-bank-last4', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['zura-pay-locations'] });
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else {
        toast.info('Location account is already set up.');
      }
    },
    onError: (error) => {
      toast.error('Failed to start location account setup', {
        description: (error as Error).message,
      });
    },
  });
}

export function useVerifyZuraPayConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-zura-pay-connection', {
        body: { organization_id: organizationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as unknown as VerifyResult;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['zura-pay-locations'] });
      queryClient.invalidateQueries({ queryKey: ['org-bank-last4', vars.organizationId] });
      if (data.auto_connected_location_id) {
        toast.success('Point Of Sale is active and your location has been automatically connected!');
      } else if (data.status === 'active') {
        toast.success('Point Of Sale is active! You can now enable locations.');
      } else if (data.status === 'pending') {
        toast.info('Verification is still in progress. Additional information may be required to complete verification.');
      }
    },
    onError: (error) => {
      toast.error('Failed to verify connection', {
        description: (error as Error).message,
      });
    },
  });
}

export function useResetZuraPayAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      const { data, error } = await supabase.functions.invoke('connect-zura-pay', {
        body: {
          action: 'reset_account',
          organization_id: organizationId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['zura-pay-locations'] });
      toast.success('Point Of Sale account has been reset. You can start fresh.');
    },
    onError: (error) => {
      toast.error('Failed to reset account', {
        description: (error as Error).message,
      });
    },
  });
}

export function useConnectLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      locationId,
    }: {
      organizationId: string;
      locationId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('connect-zura-pay', {
        body: {
          action: 'connect_location',
          organization_id: organizationId,
          location_id: locationId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['zura-pay-locations'] });
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      toast.success('Location connected to Point Of Sale');
    },
    onError: (error) => {
      toast.error('Failed to connect location', {
        description: (error as Error).message,
      });
    },
  });
}

export function useDisconnectLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      locationId,
    }: {
      organizationId: string;
      locationId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('connect-zura-pay', {
        body: {
          action: 'disconnect_location',
          organization_id: organizationId,
          location_id: locationId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['zura-pay-locations'] });
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['terminal-locations'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-readers'] });
      toast.success('Location disconnected from Point Of Sale');
    },
    onError: (error) => {
      toast.error('Failed to disconnect location', {
        description: (error as Error).message,
      });
    },
  });
}