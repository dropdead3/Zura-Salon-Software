import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationDomain {
  id: string;
  organization_id: string;
  domain: string;
  verification_token: string;
  status: 'pending' | 'verifying' | 'active' | 'failed' | 'removed';
  verified_at: string | null;
  ssl_provisioned_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrganizationDomain(orgId: string | undefined) {
  return useQuery({
    queryKey: ['organization-domain', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await (supabase as any)
        .from('organization_domains')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'removed')
        .maybeSingle();

      if (error) throw error;
      return data as unknown as OrganizationDomain | null;
    },
    enabled: !!orgId,
  });
}

export function useSaveDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, domain }: { organizationId: string; domain: string }) => {
      // Clean domain input
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '').toLowerCase().trim();

      const { data, error } = await (supabase as any)
        .from('organization_domains')
        .upsert(
          {
            organization_id: organizationId,
            domain: cleanDomain,
            status: 'pending',
            verified_at: null,
            ssl_provisioned_at: null,
          },
          { onConflict: 'organization_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OrganizationDomain;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain', variables.organizationId] });
    },
  });
}

export function useRemoveDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      const { error } = await (supabase as any)
        .from('organization_domains')
        .update({ status: 'removed' })
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain', variables.organizationId] });
    },
  });
}

export function useVerifyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      return data as { status: string; message: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain', variables.organizationId] });
    },
  });
}
