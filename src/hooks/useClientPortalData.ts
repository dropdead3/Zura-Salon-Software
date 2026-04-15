import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientPortalToken {
  id: string;
  organization_id: string;
  client_id: string;
  token: string;
  expires_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}

export interface ClientPortalData {
  client: {
    id: string;
    name: string;
    email: string | null;
    visit_count: number;
    last_visit: string | null;
  };
  loyalty: {
    current_points: number;
    lifetime_points: number;
    tier: string;
  } | null;
  tiers: Array<{
    tier_name: string;
    tier_key: string;
    minimum_lifetime_points: number;
    points_multiplier: number;
    perks: string[];
    color: string;
  }>;
  pointsHistory: Array<{
    id: string;
    points: number;
    transaction_type: string;
    description: string | null;
    created_at: string;
  }>;
}

export function useClientPortalByToken(token?: string) {
  return useQuery({
    queryKey: ['client-portal-token', token],
    queryFn: async () => {
      // Validate the token via secure RPC (no direct table access needed)
      const { data: tokenRows, error: tokenError } = await (supabase
        .rpc as any)('lookup_portal_token', { p_token: token });

      if (tokenError) throw tokenError;
      if (!tokenRows || tokenRows.length === 0) throw new Error('Invalid or expired token');

      const portalToken = tokenRows[0] as { id: string; client_id: string; organization_id: string; expires_at: string | null; last_accessed_at: string | null };

      // Check expiration
      if (portalToken.expires_at && new Date(portalToken.expires_at) < new Date()) {
        throw new Error('Token has expired');
      }

      // Update last accessed via secure RPC
      await (supabase.rpc as any)('touch_portal_token', { p_token_id: portalToken.id });

      // Get client data
      const { data: clientData, error: clientError } = await supabase
        .from('v_all_clients' as any)
        .select('id, name, email, visit_count, last_visit')
        .eq('id', portalToken.client_id)
        .single();

      if (clientError) throw clientError;

      // Get loyalty points
      const { data: loyaltyData } = await supabase
        .from('client_loyalty_points' as any)
        .select('current_points, lifetime_points, tier')
        .eq('client_id', portalToken.client_id)
        .maybeSingle();

      // Get loyalty tiers for the organization
      const { data: tiersData } = await supabase
        .from('loyalty_tiers' as any)
        .select('tier_name, tier_key, minimum_lifetime_points, points_multiplier, perks, color')
        .eq('organization_id', portalToken.organization_id)
        .order('sort_order', { ascending: true });

      // Get points history
      const { data: historyData } = await supabase
        .from('points_transactions' as any)
        .select('id, points, transaction_type, description, created_at')
        .eq('client_id', portalToken.client_id)
        .order('created_at', { ascending: false })
        .limit(20);

      return {
        client: clientData as unknown as ClientPortalData['client'],
        loyalty: loyaltyData as unknown as ClientPortalData['loyalty'],
        tiers: (tiersData || []) as unknown as ClientPortalData['tiers'],
        pointsHistory: (historyData || []) as unknown as ClientPortalData['pointsHistory'],
      } as ClientPortalData;
    },
    enabled: !!token,
  });
}

export function useCreatePortalToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      clientId,
      expiresInDays = 30,
    }: {
      organizationId: string;
      clientId: string;
      expiresInDays?: number;
    }) => {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('client_portal_tokens' as any)
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          token,
          expires_at: expiresAt.toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ClientPortalToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal-tokens'] });
      toast.success('Portal link created');
    },
    onError: (error) => {
      toast.error('Failed to create portal link: ' + error.message);
    },
  });
}

export function useClientPortalTokens(clientId?: string) {
  return useQuery({
    queryKey: ['client-portal-tokens', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_tokens' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ClientPortalToken[];
    },
    enabled: !!clientId,
  });
}
