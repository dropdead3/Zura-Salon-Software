import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { CANONICAL_SURFACE_COOLDOWNS } from '@/config/capital-engine/capital-formulas-config';
import { type SurfaceArea } from '@/config/capital-engine/zura-capital-config';

export function useCapitalSurfaceState(surfaceArea?: SurfaceArea) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const query = useQuery({
    queryKey: ['capital-surface-state', orgId, surfaceArea],
    queryFn: async () => {
      let q = supabase
        .from('capital_surface_state')
        .select('*')
        .eq('organization_id', orgId!);

      if (surfaceArea) {
        q = q.eq('surface_area', surfaceArea);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  return query;
}

export function useDismissOpportunity() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: {
      opportunityId: string;
      surfaceArea: SurfaceArea;
      reason?: string;
    }) => {
      if (!orgId) throw new Error('No organization');

      const cooldownDays = SURFACE_COOLDOWN_DEFAULTS[input.surfaceArea] ?? 7;
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays);

      const { error } = await supabase
        .from('capital_surface_state')
        .upsert(
          {
            organization_id: orgId,
            funding_opportunity_id: input.opportunityId,
            surface_area: input.surfaceArea,
            dismissed_at: new Date().toISOString(),
            dismiss_reason: input.reason ?? null,
            cooldown_until: cooldownUntil.toISOString(),
          } as any,
          { onConflict: 'funding_opportunity_id,surface_area' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-surface-state', orgId] });
      queryClient.invalidateQueries({ queryKey: ['zura-capital-opportunities', orgId] });
    },
  });
}
