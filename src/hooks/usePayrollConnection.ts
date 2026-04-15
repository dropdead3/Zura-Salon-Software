import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type PayrollProvider = 
  | 'gusto' 
  | 'quickbooks' 
  | 'adp' 
  | 'paychex' 
  | 'square' 
  | 'onpay' 
  | 'homebase' 
  | 'rippling' 
  | 'wave';
  
export type ConnectionStatus = 'pending' | 'connected' | 'disconnected' | 'error';

export interface PayrollConnection {
  id: string;
  organization_id: string;
  provider: PayrollProvider;
  external_company_id: string | null;
  connection_status: ConnectionStatus;
  connected_at: string | null;
  last_synced_at: string | null;
  metadata: Record<string, any> | null;
}

export interface ProviderConfig {
  configured: boolean;
  connection: PayrollConnection | null;
}

export function usePayrollConnection() {
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const queryClient = useQueryClient();

  // Fetch current connection status
  const { data: connection, isLoading, error } = useQuery({
    queryKey: ['payroll-connection', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('payroll_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as PayrollConnection | null;
    },
    enabled: !!organizationId,
  });

  // Check if providers are configured (have API keys)
  const { data: providerStatus } = useQuery({
    queryKey: ['payroll-providers-status', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { 
          gusto: false, 
          quickbooks: false,
          adp: false,
          paychex: false,
          square: false,
          onpay: false,
          homebase: false,
          rippling: false,
          wave: false,
        };
      }
      
      // Check available providers (currently only gusto and quickbooks have integrations)
      const [gustoResult, qbResult] = await Promise.all([
        supabase.functions.invoke('gusto-oauth', {
          body: { action: 'status' },
          method: 'GET',
        }).catch(() => ({ data: { configured: false } })),
        supabase.functions.invoke('quickbooks-oauth', {
          body: { action: 'status' },
          method: 'GET',
        }).catch(() => ({ data: { configured: false } })),
      ]);
      
      return {
        gusto: gustoResult.data?.configured || false,
        quickbooks: qbResult.data?.configured || false,
        // Coming soon providers - not yet configured
        adp: false,
        paychex: false,
        square: false,
        onpay: false,
        homebase: false,
        rippling: false,
        wave: false,
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Initiate OAuth connection
  const initiateConnection = useMutation({
    mutationFn: async (provider: PayrollProvider) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const redirectUri = `${window.location.origin}/dashboard/admin/payroll/callback`;
      const functionName = provider === 'gusto' ? 'gusto-oauth' : 'quickbooks-oauth';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'start',
          organizationId,
          redirectUri,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);
      
      return data as { authorizationUrl: string; state: string };
    },
    onSuccess: (data) => {
      // Redirect to provider's OAuth page
      window.location.href = data.authorizationUrl;
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect: ${error.message}`);
    },
  });

  // Handle OAuth callback
  const handleCallback = useMutation({
    mutationFn: async ({ 
      provider, 
      code, 
      state, 
      realmId 
    }: { 
      provider: PayrollProvider; 
      code: string; 
      state: string;
      realmId?: string;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const redirectUri = `${window.location.origin}/dashboard/admin/payroll/callback`;
      const functionName = provider === 'gusto' ? 'gusto-oauth' : 'quickbooks-oauth';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'callback',
          organizationId,
          code,
          state,
          realmId,
          redirectUri,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-connection'] });
      toast.success('Payroll provider connected successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Connection failed: ${error.message}`);
    },
  });

  // Disconnect provider
  const disconnect = useMutation({
    mutationFn: async () => {
      if (!organizationId || !connection) throw new Error('No connection to disconnect');
      
      const functionName = connection.provider === 'gusto' ? 'gusto-oauth' : 'quickbooks-oauth';
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'disconnect',
          organizationId,
        },
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-connection'] });
      toast.success('Payroll provider disconnected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  return {
    connection,
    isLoading,
    error,
    isConnected: connection?.connection_status === 'connected',
    provider: connection?.provider || null,
    providerStatus: providerStatus || { 
      gusto: false, 
      quickbooks: false,
      adp: false,
      paychex: false,
      square: false,
      onpay: false,
      homebase: false,
      rippling: false,
      wave: false,
    },
    initiateConnection: initiateConnection.mutate,
    isConnecting: initiateConnection.isPending,
    handleCallback: handleCallback.mutate,
    isHandlingCallback: handleCallback.isPending,
    disconnect: disconnect.mutate,
    isDisconnecting: disconnect.isPending,
  };
}
