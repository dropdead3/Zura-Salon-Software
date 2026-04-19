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
 * patch-test guardrails for one or more services. Used by:
 *  - NewBookingSheet (creation_prompt at booking time)
 *  - KioskSuccessScreen (checkin_prompt on client check-in)
 *  - AppointmentDetailSheet (both, for staff prep)
 */
export function useServicePrompts(serviceIds: string[] | undefined) {
  const ids = (serviceIds ?? []).filter(Boolean);
  return useQuery({
    queryKey: ['service-prompts', ids.sort().join(',')],
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
 * Convenience: fetch prompts for a single service id.
 */
export function useServicePrompt(serviceId: string | null | undefined) {
  const { data, ...rest } = useServicePrompts(serviceId ? [serviceId] : []);
  return { data: data?.[0] ?? null, ...rest };
}
