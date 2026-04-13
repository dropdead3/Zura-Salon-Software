import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectResult {
  onboarding_url: string;
  account_id: string;
  status: string;
}

interface VerifyResult {
  status: string;
  charges_enabled: boolean;
  details_submitted: boolean;
  payouts_enabled: boolean;
  account_id?: string;
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
      return data as ConnectResult;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      // Redirect to Stripe onboarding
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      }
    },
    onError: (error) => {
      toast.error('Failed to start Zura Pay setup', {
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
      return data as VerifyResult;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-connect-status', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['zura-pay-locations'] });
      if (data.status === 'active') {
        toast.success('Zura Pay is active! You can now enable locations.');
      } else if (data.status === 'pending') {
        toast.info('Verification is still in progress. Stripe may need additional information.');
      }
    },
    onError: (error) => {
      toast.error('Failed to verify connection', {
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
      toast.success('Location connected to Zura Pay');
    },
    onError: (error) => {
      toast.error('Failed to connect location', {
        description: (error as Error).message,
      });
    },
  });
}
