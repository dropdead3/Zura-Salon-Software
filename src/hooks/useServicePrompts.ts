import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServicePromptRow {
  id: string;
  name: string;
  creation_prompt: string | null;
  checkin_prompt: string | null;
  patch_test_required: boolean;
  patch_test_validity_days: number;
}

/**
 * Fetches operational prompts (creation_prompt, checkin_prompt) and
 * patch-test guardrails for one or more services by id.
 */
export function useServicePrompts(serviceIds: string[] | undefined) {
  const ids = (serviceIds ?? []).filter(Boolean);
  return useQuery({
    queryKey: ['service-prompts', 'by-id', ids.sort().join(',')],
    queryFn: async (): Promise<ServicePromptRow[]> => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('services')
        .select('id, name, creation_prompt, checkin_prompt, patch_test_required, patch_test_validity_days')
        .in('id', ids);
      if (error) throw error;
      return (data ?? []) as ServicePromptRow[];
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fallback lookup by service name within an organization. Used by the kiosk
 * (where appointment views expose service_name but not service_id). Returns
 * the first matching active service.
 */
export function useServicePromptByName(
  serviceName: string | null | undefined,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['service-prompts', 'by-name', organizationId, serviceName],
    queryFn: async (): Promise<ServicePromptRow | null> => {
      if (!serviceName || !organizationId) return null;
      const { data, error } = await supabase
        .from('services')
        .select('id, name, creation_prompt, checkin_prompt, patch_test_required, patch_test_validity_days')
        .eq('organization_id', organizationId)
        .ilike('name', serviceName)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ServicePromptRow | null;
    },
    enabled: !!serviceName && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
