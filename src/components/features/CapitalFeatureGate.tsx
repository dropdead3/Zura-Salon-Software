import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface CapitalFeatureGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Gates children behind the `capital_enabled` organization_feature_flag.
 * Used to protect Capital routes from direct URL access when the flag is off.
 */
export function CapitalFeatureGate({ children, fallback = null }: CapitalFeatureGateProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: isEnabled, isLoading } = useQuery({
    queryKey: ['capital-entitlement', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .select('is_enabled')
        .eq('organization_id', orgId!)
        .eq('flag_key', 'capital_enabled')
        .maybeSingle();
      if (error) throw error;
      return data?.is_enabled ?? false;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  if (isLoading) return null;
  return <>{isEnabled ? children : fallback}</>;
}
