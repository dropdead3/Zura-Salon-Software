/**
 * Policy OS — Org profile hooks (Wave 28.3)
 *
 * Captures the business profile that drives smart recommendations
 * in the Policy Library. One row per organization.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { PolicyLibraryEntry } from './usePolicyData';

export interface PolicyOrgProfile {
  id: string;
  organization_id: string;
  business_type: string | null;
  primary_state: string | null;
  team_size_band: string | null;
  offers_extensions: boolean;
  offers_retail: boolean;
  offers_packages: boolean;
  offers_memberships: boolean;
  serves_minors: boolean;
  has_existing_handbook: boolean;
  has_existing_client_policies: boolean;
  roles_used: string[];
  service_categories: string[];
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PolicyOrgProfileInput = Omit<
  PolicyOrgProfile,
  'id' | 'organization_id' | 'created_at' | 'updated_at' | 'setup_completed_at'
> & { setup_completed_at?: string | null };

export function usePolicyOrgProfile() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['policy-org-profile', orgId],
    queryFn: async (): Promise<PolicyOrgProfile | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('policy_org_profile')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return (data as PolicyOrgProfile | null) ?? null;
    },
    enabled: !!orgId,
  });
}

export function useUpsertPolicyOrgProfile() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: PolicyOrgProfileInput) => {
      if (!orgId) throw new Error('No organization context');
      const payload = {
        ...input,
        organization_id: orgId,
        created_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('policy_org_profile')
        .upsert(payload, { onConflict: 'organization_id' })
        .select()
        .single();
      if (error) throw error;
      return data as PolicyOrgProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy-org-profile', orgId] });
      toast({ title: 'Profile saved', description: 'Recommendations updated.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not save profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAdoptPoliciesFromLibrary() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (libraryKeys: string[]) => {
      if (!orgId) throw new Error('No organization context');
      if (libraryKeys.length === 0) return [];
      const { data, error } = await supabase.rpc('adopt_policies_from_library', {
        p_organization_id: orgId,
        p_library_keys: libraryKeys,
      });
      if (error) throw error;
      return data as Array<{ policy_id: string; library_key: string; was_created: boolean }>;
    },
    onSuccess: (rows) => {
      qc.invalidateQueries({ queryKey: ['org-policies', orgId] });
      const created = rows.filter((r) => r.was_created).length;
      toast({
        title: created > 0 ? `Adopted ${created} ${created === 1 ? 'policy' : 'policies'}` : 'Already adopted',
        description: created > 0 ? 'They are ready to configure.' : 'These policies were already in your set.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not adopt policies',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Smart-recommend: filter library entries to those that apply to this org's profile.
 * - 'required' always recommended
 * - 'recommended' included when domain prerequisites match
 * - 'optional' excluded from recommendations (still browsable in the library)
 */
export function recommendedKeysForProfile(
  library: PolicyLibraryEntry[],
  profile: PolicyOrgProfile | null,
): string[] {
  if (!profile) {
    // Without a profile, recommend only required items
    return library.filter((l) => l.recommendation === 'required').map((l) => l.key);
  }
  return library
    .filter((l) => {
      if (l.requires_extensions && !profile.offers_extensions) return false;
      if (l.requires_retail && !profile.offers_retail) return false;
      if (l.requires_packages && !profile.offers_packages) return false;
      return l.recommendation === 'required' || l.recommendation === 'recommended';
    })
    .map((l) => l.key);
}
