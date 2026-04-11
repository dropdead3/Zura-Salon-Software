import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { CapitalEventType, SurfaceArea } from '@/config/capital-engine/zura-capital-config';

export function useLogCapitalEvent() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (input: {
      opportunityId?: string;
      projectId?: string;
      eventType: CapitalEventType;
      surfaceArea: SurfaceArea;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !orgId) return null;

      const { error } = await supabase
        .from('capital_event_log')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          opportunity_id: input.opportunityId ?? null,
          funding_opportunity_id: input.opportunityId ?? null,
          funding_project_id: input.projectId ?? null,
          event_type: input.eventType,
          surface_area: input.surfaceArea,
          metadata_json: input.metadata ?? null,
        } as any);
      if (error) throw error;
    },
  });
}
