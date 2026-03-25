import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

/**
 * Fetches activated apps for the current organization.
 * Returns the list of app keys and a helper to check for a specific app.
 */
export function useOrganizationApps() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['organization-apps', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_apps')
        .select('app_key')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data.map((row) => row.app_key);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });

  const hasApp = (key: string) => apps.includes(key);

  return { apps, hasApp, isLoading };
}
