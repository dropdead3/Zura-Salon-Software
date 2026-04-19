import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Wave 4: Returns a map of `service_id -> required-form count` for the
 * current organization's services. Used by ServicesSettingsContent to render
 * a small "forms attached" indicator on each service row.
 *
 * Only counts is_required=true rows so the indicator only flags genuine gates,
 * not optional/recommended attachments.
 */
export function useServiceFormCounts(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['service-form-counts', organizationId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!organizationId) return {};
      // Fetch all required form requirements joined to services in this org.
      // We filter via the FK so cross-org leakage is blocked at the DB layer.
      const { data, error } = await supabase
        .from('service_form_requirements')
        .select('service_id, services!inner(organization_id)')
        .eq('is_required', true)
        .eq('services.organization_id', organizationId);

      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ service_id: string }>) {
        counts[row.service_id] = (counts[row.service_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
}
