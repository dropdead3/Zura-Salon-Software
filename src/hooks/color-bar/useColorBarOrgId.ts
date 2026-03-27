/**
 * useBackroomOrgId — Resolves the organization ID for backroom queries.
 * 
 * Falls back to the user's employee_profile.organization_id when
 * effectiveOrganization is null (common for platform users who also own an org).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export function useBackroomOrgId(): string | undefined {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();

  // Fallback: fetch org from employee profile when context has no effective org
  const { data: fallbackOrgId } = useQuery({
    queryKey: ['backroom-org-fallback', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.organization_id ?? null;
    },
    enabled: !!user?.id && !effectiveOrganization?.id,
    staleTime: 1000 * 60 * 10,
  });

  return effectiveOrganization?.id ?? fallbackOrgId ?? undefined;
}
